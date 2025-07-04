import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  ticket_id: string;
  message_content: string;
  sender_name: string;
  cc_emails?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('Office365 send email function called');

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    return new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const requestBody = await req.json();
    console.log('Request received:', requestBody);
    
    const { ticket_id, message_content, sender_name, cc_emails }: SendEmailRequest = requestBody;

    if (!ticket_id || !message_content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing email send request for ticket:', ticket_id);

    // Hent ticket information
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      console.error('Failed to fetch ticket:', ticketError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Found ticket:', ticket.ticket_number);

    // Hent Office 365 credentials
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError || !secrets || secrets.length === 0) {
      console.error('Missing Office 365 credentials:', secretsError);
      return new Response(JSON.stringify({ error: "Office 365 credentials not configured" }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Hent access token
    const tokenUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id,
      client_secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    console.log('Fetching access token for email sending...');
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully obtained access token');

    // Hent bruger signatur som HTML
    const authHeader = req.headers.get("authorization");
    let signatureHtml = '';
    
    if (authHeader) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        const { data: userSignature } = await supabase
          .from('user_signatures')
          .select('html')
          .eq('user_id', user.id)
          .single();
        if (userSignature?.html) {
          signatureHtml = userSignature.html;
          console.log('Loaded user signature for email');
        }
      }
    }

    // Byg email content med HTML formatering
    let emailHtmlContent = message_content.replace(/\n/g, '<br>');
    
    // Tilføj signatur
    if (signatureHtml) {
      emailHtmlContent += '<br><br>' + signatureHtml;
    }

    // Email setup
    const fromAddress = ticket.mailbox_address || 'info@mmmultipartner.dk';
    const subject = ticket.subject.startsWith('Re:') ? ticket.subject : `Re: ${ticket.subject}`;
    
    // Forbered email
    const emailMessage = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: emailHtmlContent
        },
        toRecipients: [
          {
            emailAddress: {
              address: ticket.customer_email,
              name: ticket.customer_name || ticket.customer_email
            }
          }
        ],
        ...(cc_emails && cc_emails.length > 0 ? {
          ccRecipients: cc_emails.map((email: string) => ({
            emailAddress: {
              address: email.trim(),
              name: email.trim()
            }
          }))
        } : {})
      },
      saveToSentItems: true
    };

    // Send email via Microsoft Graph
    const sendUrl = `https://graph.microsoft.com/v1.0/users/${fromAddress}/sendMail`;

    console.log(`Sending email from ${fromAddress} to ${ticket.customer_email}`);
    
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailMessage),
    });

    if (!sendResponse.ok) {
      const sendError = await sendResponse.text();
      console.error('Failed to send email:', sendError);
      return new Response(JSON.stringify({ error: "Failed to send email", details: sendError }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Email sent successfully via Microsoft Graph');

    // Gem beskeden i databasen
    const messageContentWithSignature = signatureHtml ? 
      `${message_content}\n\n---SIGNATUR---\n${signatureHtml}` : 
      message_content;

    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket_id,
        sender_email: fromAddress,
        sender_name: sender_name || 'Support Agent',
        message_content: messageContentWithSignature,
        message_type: 'outbound_email',
        is_internal: false
      });

    if (messageError) {
      console.error('Failed to save outgoing message:', messageError);
    } else {
      console.log('Saved outgoing message to database');
    }

    // Opdater ticket status
    const { error: ticketUpdateError } = await supabase
      .from('support_tickets')
      .update({
        status: 'I gang',
        last_response_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', ticket_id);

    if (ticketUpdateError) {
      console.error('Failed to update ticket:', ticketUpdateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      from: fromAddress,
      to: ticket.customer_email,
      subject: subject
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Send email error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});