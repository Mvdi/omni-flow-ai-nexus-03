import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 STARTING MANUAL EMAIL SYNC');

    // Hent Office 365 credentials
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError || !secrets || secrets.length === 0) {
      throw new Error("Office 365 credentials not configured");
    }

    const credentialsMap = secrets.reduce((acc, secret) => {
      acc[secret.key_name] = secret.key_value;
      return acc;
    }, {} as Record<string, string>);

    const { client_id, client_secret, tenant_id } = credentialsMap;

    if (!client_id || !client_secret || !tenant_id) {
      throw new Error("Incomplete Office 365 credentials");
    }

    // Hent access token
    const tokenUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id,
      client_secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    console.log('🔑 Fetching access token...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      throw new Error(`Failed to authenticate: ${tokenError}`);
    }

    const tokenData: GraphTokenResponse = await tokenResponse.json();
    console.log('✅ Access token obtained');

    // Hent aktive mailboxes
    const { data: mailboxes } = await supabase
      .from('monitored_mailboxes')
      .select('*')
      .eq('is_active', true);

    if (!mailboxes || mailboxes.length === 0) {
      throw new Error("No active mailboxes found");
    }

    let totalEmailsProcessed = 0;
    let totalTicketsCreated = 0;

    // Sync hver mailbox
    for (const mailbox of mailboxes) {
      console.log(`📧 Syncing mailbox: ${mailbox.email_address}`);
      
      try {
        // Hent emails fra sidste 7 dage
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const sinceISO = since.toISOString();

        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages?$filter=receivedDateTime ge ${sinceISO}&$top=50&$orderby=receivedDateTime desc`;
        
        console.log(`🔍 Fetching emails since ${sinceISO}`);
        
        const messagesResponse = await fetch(messagesUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!messagesResponse.ok) {
          console.error(`Failed to fetch emails for ${mailbox.email_address}: ${messagesResponse.status}`);
          continue;
        }

        const messagesData = await messagesResponse.json();
        const emails = messagesData.value || [];

        console.log(`📨 Found ${emails.length} emails for ${mailbox.email_address}`);

        for (const email of emails) {
          totalEmailsProcessed++;

          // Tjek om ticket allerede eksisterer (baseret på email ID)
          const { data: existingTicket } = await supabase
            .from('support_tickets')
            .select('id')
            .eq('email_message_id', email.id)
            .single();

          if (existingTicket) {
            console.log(`⏭️ Ticket already exists for email ${email.id}`);
            continue;
          }

          // KRITISK DUPLIKAT-TJEK: Tjek om samme email allerede eksisterer baseret på indhold
          const emailReceivedTime = new Date(email.receivedDateTime);
          const timeWindowStart = new Date(emailReceivedTime.getTime() - 10 * 60 * 1000); // 10 minutter før
          const timeWindowEnd = new Date(emailReceivedTime.getTime() + 10 * 60 * 1000); // 10 minutter efter
          
          const senderEmail = email.from?.emailAddress?.address || 'unknown@example.com';
          const emailSubject = email.subject || 'Ingen emne';
          const emailContent = (email.body?.content || '').substring(0, 200); // Første 200 tegn
          
          const { data: duplicateTicket } = await supabase
            .from('support_tickets')
            .select('id, ticket_number')
            .eq('customer_email', senderEmail)
            .eq('subject', emailSubject)
            .gte('email_received_at', timeWindowStart.toISOString())
            .lte('email_received_at', timeWindowEnd.toISOString())
            .single();

          if (duplicateTicket) {
            console.log(`🚫 DUPLIKAT FORHINDRET: Email fra ${senderEmail} med emne "${emailSubject}" eksisterer allerede som ${duplicateTicket.ticket_number}`);
            continue;
          }

          // Tjek om dette er et svar til eksisterende ticket (baseret på thread ID)
          const { data: existingThreadTicket } = await supabase
            .from('support_tickets')
            .select('id, ticket_number, customer_email')
            .eq('email_thread_id', email.conversationId)
            .single();

          if (existingThreadTicket) {
            console.log(`📧 New reply to existing ticket ${existingThreadTicket.ticket_number}`);
            
            const senderEmail = email.from?.emailAddress?.address || 'unknown@example.com';
            const senderName = email.from?.emailAddress?.name || senderEmail;
            
            // Skip emails from our own domain
            if (senderEmail.includes('@mmmultipartner.dk')) {
              continue;
            }

            // Tilføj besked til ticket
            await supabase
              .from('ticket_messages')
              .insert({
                ticket_id: existingThreadTicket.id,
                sender_email: senderEmail,
                sender_name: senderName,
                message_content: email.body?.content || '',
                message_type: 'inbound_email',
                is_internal: false,
                email_message_id: email.id
              });

            // Opdater ticket status til "Nyt svar" og last_response_at
            await supabase
              .from('support_tickets')
              .update({
                status: 'Nyt svar',
                last_response_at: email.receivedDateTime,
                updated_at: new Date().toISOString(),
                email_message_id: email.id // Opdater til nyeste email ID
              })
              .eq('id', existingThreadTicket.id);

            console.log(`✅ Added reply to ticket ${existingThreadTicket.ticket_number} - status set to "Nyt svar"`);
            totalEmailsProcessed++;
            continue;
          }

          // Opret ny ticket
          const senderEmail = email.from?.emailAddress?.address || 'unknown@example.com';
          const senderName = email.from?.emailAddress?.name || senderEmail;
          
          // Skip emails from our own domain
          if (senderEmail.includes('@mmmultipartner.dk')) {
            continue;
          }

          const { data: newTicket, error: ticketError } = await supabase
            .from('support_tickets')
            .insert({
              ticket_number: '', // Will be auto-generated
              subject: email.subject || 'Ingen emne',
              content: email.body?.content || '',
              customer_email: senderEmail,
              customer_name: senderName,
              status: 'Åben',
              priority: null,
              source: 'office365',
              email_message_id: email.id,
              email_thread_id: email.conversationId,
              email_received_at: email.receivedDateTime,
              mailbox_address: mailbox.email_address,
              category: 'Generel'
            })
            .select()
            .single();

          if (ticketError) {
            console.error(`Failed to create ticket for email ${email.id}:`, ticketError);
            continue;
          }

          totalTicketsCreated++;
          console.log(`✅ Created ticket ${newTicket.ticket_number} for ${senderEmail}`);

          // Upsert customer
          await supabase
            .from('customers')
            .upsert({
              email: senderEmail,
              navn: senderName
            }, { onConflict: 'email', ignoreDuplicates: true });
        }

        // Opdater last_sync_at for mailbox
        await supabase
          .from('monitored_mailboxes')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', mailbox.id);

      } catch (error) {
        console.error(`Error syncing mailbox ${mailbox.email_address}:`, error);
      }
    }

    // Log sync result
    await supabase
      .from('email_sync_log')
      .insert({
        mailbox_address: 'MANUAL_SYNC',
        status: 'completed',
        emails_processed: totalEmailsProcessed,
        sync_started_at: new Date().toISOString(),
        sync_completed_at: new Date().toISOString(),
        errors_count: 0,
        facebook_leads_created: 0
      });

    console.log(`🎉 MANUAL SYNC COMPLETED: ${totalEmailsProcessed} emails processed, ${totalTicketsCreated} tickets created`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Manual email sync completed',
      emailsProcessed: totalEmailsProcessed,
      ticketsCreated: totalTicketsCreated
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ MANUAL SYNC ERROR:', error.message);
    
    return new Response(JSON.stringify({ 
      error: 'Manual sync failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});