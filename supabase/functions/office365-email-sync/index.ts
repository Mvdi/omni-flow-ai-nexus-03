
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
    console.log('Starting Office 365 email sync - EXTENDED DEBUG MODE...');
    
    // Extended logging for debugging
    const debugInfo = {
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentTime: new Date(),
    };
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

    // Check if pg_cron and pg_net extensions are enabled
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .in('extname', ['pg_cron', 'pg_net']);

    if (extError) {
      console.log('Could not check extensions (this is normal):', extError.message);
    } else {
      console.log('Available extensions:', extensions);
    }

    // Hent Office 365 credentials fra databasen
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError || !secrets || secrets.length === 0) {
      console.error('Missing Office 365 credentials:', secretsError);
      return new Response(JSON.stringify({ 
        error: "Office 365 credentials not configured",
        details: "Please configure Office 365 integration in settings"
      }), { 
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
      console.error('Incomplete Office 365 credentials. Required: client_id, client_secret, tenant_id');
      return new Response(JSON.stringify({ 
        error: "Incomplete Office 365 credentials",
        missing: [
          !client_id && 'client_id',
          !client_secret && 'client_secret', 
          !tenant_id && 'tenant_id'
        ].filter(Boolean)
      }), { 
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

    console.log('Fetching access token from Microsoft Graph...');
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
      return new Response(JSON.stringify({ 
        error: "Failed to authenticate with Microsoft Graph",
        details: tokenError
      }), { 
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
    let debugResults: any[] = [];

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
        // EXTENDED SYNC WINDOW: Check for emails from last 24 hours instead of 15 minutes
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        console.log(`Time windows for ${mailbox.email_address}:`, {
          twentyFourHoursAgo,
          fourHoursAgo,
          oneHourAgo,
          fifteenMinutesAgo
        });

        // Try different time windows to debug
        const timeWindows = [
          { name: '15 minutes', time: fifteenMinutesAgo },
          { name: '1 hour', time: oneHourAgo },
          { name: '4 hours', time: fourHoursAgo },
          { name: '24 hours', time: twentyFourHoursAgo }
        ];

        let messagesFound = false;
        let selectedTimeWindow = twentyFourHoursAgo; // Default to 24 hours
        
        for (const window of timeWindows) {
          const testUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages`;
          const testFilter = `?$filter=receivedDateTime gt ${window.time}&$top=5&$orderby=receivedDateTime desc`;
          
          console.log(`Testing ${window.name} window for ${mailbox.email_address}: ${testUrl}${testFilter}`);
          
          const testResponse = await fetch(`${testUrl}${testFilter}`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (testResponse.ok) {
            const testData = await testResponse.json();
            const testMessages: GraphMessage[] = testData.value || [];
            console.log(`${window.name} window found ${testMessages.length} messages`);
            
            if (testMessages.length > 0) {
              messagesFound = true;
              selectedTimeWindow = window.time;
              console.log(`Using ${window.name} window for processing`);
              break;
            }
          } else {
            console.error(`Failed to test ${window.name} window:`, await testResponse.text());
          }
        }

        // Hent emails fra mailbox med selected time window
        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages`;
        const filter = `?$filter=receivedDateTime gt ${selectedTimeWindow}&$top=50&$orderby=receivedDateTime desc`;

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
          
          // Update sync log with error
          if (syncLog) {
            await supabase
              .from('email_sync_log')
              .update({
                sync_completed_at: new Date().toISOString(),
                errors_count: 1,
                error_details: `Graph API error: ${errorText}`,
                status: 'failed'
              })
              .eq('id', syncLog.id);
          }
          
          totalErrors++;
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages: GraphMessage[] = messagesData.value || [];
        
        console.log(`Found ${messages.length} messages for ${mailbox.email_address} in selected time window`);

        // Debug: Log first few message details
        if (messages.length > 0) {
          console.log('Sample messages found:', messages.slice(0, 3).map(m => ({
            id: m.id,
            subject: m.subject,
            from: m.from?.emailAddress?.address,
            receivedDateTime: m.receivedDateTime
          })));
        }

        // Test database functions
        console.log('Testing generate_ticket_number function...');
        const { data: testTicketNumber, error: ticketNumberError } = await supabase.rpc('generate_ticket_number');
        if (ticketNumberError) {
          console.error('Error testing generate_ticket_number:', ticketNumberError);
        } else {
          console.log('Generated test ticket number:', testTicketNumber);
        }

        // Process hver email
        for (const message of messages) {
          try {
            console.log(`Processing message ${message.id} with subject: "${message.subject}"`);
            
            // Check hvis ticket allerede eksisterer
            const { data: existingTicket } = await supabase
              .from('support_tickets')
              .select('id, ticket_number, source')
              .eq('email_message_id', message.id)
              .single();

            if (existingTicket) {
              console.log(`Ticket already exists for message ${message.id}: ${existingTicket.ticket_number} (source: ${existingTicket.source})`);
              continue;
            }

            console.log('Creating new customer record...');
            // Ensure customer exists in customers table
            const { data: customerResult, error: customerError } = await supabase
              .from('customers')
              .upsert({
                email: message.from.emailAddress.address,
                navn: message.from.emailAddress.name || message.from.emailAddress.address
              }, { 
                onConflict: 'email',
                ignoreDuplicates: false 
              })
              .select();

            if (customerError) {
              console.error('Failed to upsert customer:', customerError);
            } else {
              console.log('Customer upserted successfully:', customerResult);
            }

            // Generate ticket number using database function
            const { data: ticketNumber, error: ticketNumError } = await supabase.rpc('generate_ticket_number');
            
            if (ticketNumError) {
              console.error('Failed to generate ticket number:', ticketNumError);
              totalErrors++;
              continue;
            }

            console.log(`Generated ticket number: ${ticketNumber}`);

            // Opret nyt support ticket
            const ticketData = {
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
            };

            console.log('Creating ticket with data:', JSON.stringify(ticketData, null, 2));

            const { data: newTicket, error: ticketError } = await supabase
              .from('support_tickets')
              .insert(ticketData)
              .select()
              .single();

            if (ticketError) {
              console.error('Failed to create ticket:', ticketError);
              console.error('Ticket data that failed:', JSON.stringify(ticketData, null, 2));
              totalErrors++;
              continue;
            }

            console.log(`Created new ticket ${newTicket.ticket_number} from email ${message.id}`);

            // Opret ticket message
            const messageData = {
              ticket_id: newTicket.id,
              sender_email: message.from.emailAddress.address,
              sender_name: message.from.emailAddress.name,
              message_content: message.body?.content || message.bodyPreview || '',
              message_type: 'incoming',
              email_message_id: message.id,
              is_internal: false
            };

            console.log('Creating ticket message with data:', JSON.stringify(messageData, null, 2));

            const { error: messageError } = await supabase
              .from('ticket_messages')
              .insert(messageData);

            if (messageError) {
              console.error('Failed to create ticket message:', messageError);
              console.error('Message data that failed:', JSON.stringify(messageData, null, 2));
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

        // Store debug results
        debugResults.push({
          mailbox: mailbox.email_address,
          messagesFound: messages.length,
          timeWindowUsed: selectedTimeWindow,
          processed: totalProcessed
        });

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
    console.log('Debug results per mailbox:', JSON.stringify(debugResults, null, 2));

    return new Response(JSON.stringify({ 
      success: true, 
      processed: totalProcessed,
      errors: totalErrors,
      mailboxes: mailboxes.length,
      timestamp: new Date().toISOString(),
      details: `Extended debug mode - checked up to 24 hours back`,
      debugResults: debugResults,
      diagnostics: {
        timeChecked: debugInfo,
        mailboxResults: debugResults
      }
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Email sync error:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
