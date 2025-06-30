import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    content: string;
    contentType: string;
  };
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  receivedDateTime: string;
  internetMessageId: string;
  conversationId: string;
  parentFolderId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    return new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Starting Office 365 email sync...');
    
    // Hent Office 365 credentials fra databasen
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError || !secrets || secrets.length === 0) {
      console.error('Missing Office 365 credentials:', secretsError);
      return new Response(JSON.stringify({ error: "Office 365 credentials not configured" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const credentialsMap = secrets.reduce((acc, secret) => {
      acc[secret.key_name] = secret.key_value;
      return acc;
    }, {} as Record<string, string>);

    const { client_id, client_secret, tenant_id } = credentialsMap;

    if (!client_id || !client_secret || !tenant_id) {
      console.error('Incomplete Office 365 credentials');
      return new Response(JSON.stringify({ error: "Incomplete Office 365 credentials" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Hent access token fra Microsoft Graph
    const tokenUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id,
      client_secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    console.log('Fetching access token...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token request failed:', tokenError);
      return new Response(JSON.stringify({ error: "Failed to authenticate with Microsoft Graph" }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const tokenData: GraphTokenResponse = await tokenResponse.json();
    console.log('Access token obtained successfully');

    // Hent monitored mailboxes
    const { data: mailboxes, error: mailboxError } = await supabase
      .from('monitored_mailboxes')
      .select('*')
      .eq('is_active', true);

    if (mailboxError || !mailboxes) {
      console.error('Failed to fetch monitored mailboxes:', mailboxError);
      return new Response(JSON.stringify({ error: "Failed to fetch monitored mailboxes" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Processing ${mailboxes.length} monitored mailboxes`);
    let totalProcessed = 0;
    let totalErrors = 0;

    // Process hver mailbox
    for (const mailbox of mailboxes) {
      console.log(`Processing mailbox: ${mailbox.email_address}`);
      
      // Log sync start
      const { data: syncLog } = await supabase
        .from('email_sync_log')
        .insert({
          mailbox_address: mailbox.email_address,
          status: 'running'
        })
        .select()
        .single();

      try {
        // Hent emails fra mailbox - check for emails from last 5 minutes instead of last sync
        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages`;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const filter = `?$filter=receivedDateTime gt ${fiveMinutesAgo}&$top=50&$orderby=receivedDateTime desc`;

        console.log(`Fetching messages from: ${messagesUrl}${filter}`);
        
        const messagesResponse = await fetch(`${messagesUrl}${filter}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!messagesResponse.ok) {
          const errorText = await messagesResponse.text();
          console.error(`Failed to fetch messages for ${mailbox.email_address}:`, errorText);
          totalErrors++;
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages: GraphMessage[] = messagesData.value || [];
        
        console.log(`Found ${messages.length} recent messages for ${mailbox.email_address}`);

        // Process hver email
        for (const message of messages) {
          try {
            // Check hvis ticket allerede eksisterer
            const { data: existingTicket } = await supabase
              .from('support_tickets')
              .select('id')
              .eq('email_message_id', message.id)
              .single();

            if (existingTicket) {
              console.log(`Ticket already exists for message ${message.id}`);
              continue;
            }

            // Ensure customer exists in customers table
            const { error: customerError } = await supabase
              .from('customers')
              .upsert({
                email: message.from.emailAddress.address,
                navn: message.from.emailAddress.name || message.from.emailAddress.address
              }, { 
                onConflict: 'email',
                ignoreDuplicates: false 
              });

            if (customerError) {
              console.error('Failed to upsert customer:', customerError);
            }

            // Generate ticket number using database function
            const { data: ticketNumber } = await supabase.rpc('generate_ticket_number');

            // Opret nyt support ticket
            const { data: newTicket, error: ticketError } = await supabase
              .from('support_tickets')
              .insert({
                ticket_number: ticketNumber,
                subject: message.subject || 'Ingen emne',
                content: message.body?.content || message.bodyPreview || '',
                customer_email: message.from.emailAddress.address,
                customer_name: message.from.emailAddress.name,
                email_message_id: message.id,
                email_thread_id: message.conversationId,
                email_received_at: message.receivedDateTime,
                mailbox_address: mailbox.email_address,
                source: 'office365',
                status: 'Åben',
                priority: 'Medium'
              })
              .select()
              .single();

            if (ticketError) {
              console.error('Failed to create ticket:', ticketError);
              totalErrors++;
              continue;
            }

            console.log(`Created new ticket ${newTicket.ticket_number} from email ${message.id}`);

            // Opret ticket message
            const { error: messageError } = await supabase
              .from('ticket_messages')
              .insert({
                ticket_id: newTicket.id,
                sender_email: message.from.emailAddress.address,
                sender_name: message.from.emailAddress.name,
                message_content: message.body?.content || message.bodyPreview || '',
                message_type: 'incoming',
                email_message_id: message.id,
                is_internal: false
              });

            if (messageError) {
              console.error('Failed to create ticket message:', messageError);
              totalErrors++;
            } else {
              totalProcessed++;
              console.log(`Successfully processed message ${message.id} into ticket ${newTicket.ticket_number}`);
            }

          } catch (messageError) {
            console.error(`Error processing message ${message.id}:`, messageError);
            totalErrors++;
          }
        }

        // Opdater last_sync_at for mailbox
        await supabase
          .from('monitored_mailboxes')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', mailbox.id);

        // Opdater sync log
        if (syncLog) {
          await supabase
            .from('email_sync_log')
            .update({
              sync_completed_at: new Date().toISOString(),
              emails_processed: messages.length,
              errors_count: 0,
              status: 'completed'
            })
            .eq('id', syncLog.id);
        }

      } catch (mailboxError) {
        console.error(`Error processing mailbox ${mailbox.email_address}:`, mailboxError);
        totalErrors++;
        
        // Opdater sync log med fejl
        if (syncLog) {
          await supabase
            .from('email_sync_log')
            .update({
              sync_completed_at: new Date().toISOString(),
              errors_count: 1,
              error_details: String(mailboxError),
              status: 'failed'
            })
            .eq('id', syncLog.id);
        }
      }
    }

    console.log(`Email sync completed. Processed: ${totalProcessed}, Errors: ${totalErrors}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: totalProcessed,
      errors: totalErrors,
      mailboxes: mailboxes.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Email sync error:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      timestamp: new Date().toISOString()
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
