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
  console.log('🚀 OFFICE365 SEND EMAIL FUNCTION STARTED');
  
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
    
    const requestBody = await req.json();
    console.log('📧 Email request received:', {
      ticket_id: requestBody.ticket_id,
      content_length: requestBody.message_content?.length || 0
    });
    
    const { ticket_id, message_content, sender_name, cc_emails } = requestBody;

    if (!ticket_id || !message_content) {
      throw new Error("Missing required fields: ticket_id or message_content");
    }

    // Hent ticket information
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket_id)
      .single();

    if (ticketError || !ticket) {
      throw new Error(`Ticket not found: ${ticketError?.message}`);
    }

    console.log('🎫 Found ticket:', ticket.ticket_number);

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

    // Hent bruger signatur
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
          console.log('📝 User signature loaded');
        }
      }
    }

    // Byg email content med signatur
    let emailHtmlContent = message_content.replace(/\n/g, '<br>');
    
    if (signatureHtml) {
      // Erstat base64 billeder med simpel text-baseret logo da externe URLs kan være upålidelige
      let cleanSignatureHtml = signatureHtml.replace(
        /<img[^>]*src="data:image\/[^;]+;base64,[^"]*"[^>]*>/gi,
        '<div style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px; margin-bottom: 8px;">MM | Multipartner</div>'
      );
      
      // Hvis signaturen er tom efter billede-fjernelse, tilføj basic firma info
      if (cleanSignatureHtml.trim().length < 10) {
        cleanSignatureHtml = `
          <div style="font-family: Arial, sans-serif; color: #333; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
            <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px; margin-bottom: 12px;">MM | Multipartner</div><br>
            📧 info@mmmultipartner.dk<br>
            🌐 www.mmmultipartner.dk
          </div>
        `;
      }
      
      emailHtmlContent += '<br><br>' + cleanSignatureHtml;
    }

    const fromAddress = ticket.mailbox_address || 'info@mmmultipartner.dk';
    const subject = ticket.subject.startsWith('Re:') ? ticket.subject : `Re: ${ticket.subject}`;
    
    // Forbered email besked
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

    console.log(`📤 Sending email from ${fromAddress} to ${ticket.customer_email}`);
    
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
      throw new Error(`Failed to send email: ${sendError}`);
    }

    console.log('✅ Email sent successfully via Microsoft Graph');

    // Gem beskeden i databasen MED signatur
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
      console.error('Failed to save message:', messageError);
    } else {
      console.log('✅ Message saved to database WITH signature');
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
      message: 'Email sent successfully via Office 365',
      from: fromAddress,
      to: ticket.customer_email,
      subject: subject,
      signatureIncluded: !!signatureHtml
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    
    return new Response(JSON.stringify({ 
      error: 'Email send failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});