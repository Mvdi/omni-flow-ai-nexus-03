import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  ticket_id: string;
  message_content: string;
  sender_name: string;
}

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
      headers: corsHeaders 
    });
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
    const { ticket_id, message_content, sender_name }: SendEmailRequest = await req.json();

    if (!ticket_id || !message_content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, 
        headers: corsHeaders 
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
        headers: corsHeaders 
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
        headers: corsHeaders 
      });
    }

    const tokenData: GraphTokenResponse = await tokenResponse.json();
    console.log('Successfully obtained access token');

    // Hent bruger signatur som HTML (uden base64 konvertering)
    const authHeader = req.headers.get("authorization");
    let signatureHtml = '';
    let currentUser = null;
    
    if (authHeader) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        currentUser = user;
        const { data: userSignature } = await supabase
          .from('user_signatures')
          .select('html')
          .eq('user_id', user.id)
          .single();
        if (userSignature?.html) {
          // Konverter base64 billeder til ren HTML tekst for bedre kompatibilitet
          signatureHtml = userSignature.html
            .replace(/data:image\/[^;]+;base64,[^"]+/g, '') // Fjern base64 billeder
            .replace(/<img[^>]*>/g, '') // Fjern img tags
            + `
            <div style="margin-top: 12px;">
              <strong style="color: #2563eb;">MM Multipartner</strong>
            </div>`;
          console.log('Using clean HTML signature without base64 images');
        }
      }
    }

    // Byg email med ren HTML formatering
    let emailContent = message_content.replace(/\n/g, '<br>');
    
    // Tilføj signatur som ren HTML
    if (signatureHtml) {
      emailContent += '<br><br>' + signatureHtml;
    }

    // Forbered email med HTML formatering
    const emailMessage = {
      message: {
        subject: ticket.subject.startsWith('Re:') ? ticket.subject : `Re: ${ticket.subject}`,
        body: {
          contentType: 'HTML',
          content: emailContent
        },
        toRecipients: [
          {
            emailAddress: {
              address: ticket.customer_email,
              name: ticket.customer_name || ticket.customer_email
            }
          }
        ],
        internetMessageHeaders: [
          ...(ticket.email_message_id ? [{
            name: 'X-In-Reply-To',
            value: ticket.email_message_id
          }] : []),
          ...(ticket.email_thread_id ? [{
            name: 'X-References',
            value: ticket.email_thread_id
          }] : [])
        ]
      },
      saveToSentItems: true
    };

    // Send email via Microsoft Graph
    const fromAddress = ticket.mailbox_address || 'info@mmmultipartner.dk';
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
        headers: corsHeaders 
      });
    }

    console.log('Email sent successfully via Microsoft Graph');

    // Gem den komplette besked (med signatur) i databasen så den vises i samtalen
    const completeMessageForDisplay = signatureHtml ? 
      `${message_content}\n\n---\n\nVi vaskes!\n\nMathias Nielsen\nServiceteknikker\nMM Multipartner\n\n✉ info@mmmultipartner.dk\n📞 39393038\n🌐 www.mmmultipartner.dk` : 
      message_content;

    const { error: messageError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket_id,
        sender_email: fromAddress,
        sender_name: sender_name || 'Support Agent',
        message_content: completeMessageForDisplay,
        message_type: 'internal',
        is_internal: false
      });

    if (messageError) {
      console.error('Failed to save outgoing message:', messageError);
    } else {
      console.log('Saved complete outgoing message with signature to database');
    }

    // Opdater ticket status og response time
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
    } else {
      console.log('Updated ticket status');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      from: fromAddress,
      to: ticket.customer_email
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
