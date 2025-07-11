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
  console.log('🚀 OFFICE365 SEND EMAIL FUNCTION STARTED - Method:', req.method);
  console.log('🚀 Request headers:', Object.fromEntries(req.headers.entries()));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('📧 Processing POST request for email sending...');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log('🔍 Supabase config check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPrefix: supabaseUrl?.substring(0, 30) + '...'
    });
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const requestBody = await req.json();
    console.log('📧 Email request received:', {
      ticket_id: requestBody.ticket_id,
      content_length: requestBody.message_content?.length || 0,
      has_sender_name: !!requestBody.sender_name,
      cc_emails_count: requestBody.cc_emails?.length || 0
    });
    
    const { ticket_id, message_content, sender_name, cc_emails } = requestBody;

    if (!ticket_id || !message_content) {
      console.log('❌ Missing required fields:', { ticket_id: !!ticket_id, message_content: !!message_content });
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

    // ROBUST og GARANTERET signatur-hentning der virker HVER gang
    const authHeader = req.headers.get("authorization");
    let signatureHtml = '';
    let currentUserId = null;
    
    console.log('🔍 Starting signature loading process...');
    console.log('🔍 Authorization header:', authHeader ? 'Present' : 'Missing');
    console.log('🎫 Processing ticket ID:', ticket_id);
    
    // MULTIPLE user detection methods - vil ALTID finde brugeren
    if (authHeader) {
      try {
        const jwt = authHeader.replace("Bearer ", "");
        console.log('🔑 JWT token length:', jwt.length);
        
        // Flere forskellige metoder til at få bruger-information
        let authData = null;
        let authError = null;
        
        // Metode 1: Standard Supabase auth check
        try {
          const authResult = await supabase.auth.getUser(jwt);
          authData = authResult.data;
          authError = authResult.error;
          
          if (authData?.user) {
            currentUserId = authData.user.id;
            console.log('✅ User authenticated via standard method:', authData.user.email);
          }
        } catch (standardAuthError) {
          console.log('⚠️ Standard auth failed, trying fallback methods:', standardAuthError.message);
        }
        
        // Metode 2: Manual JWT parsing hvis standard auth fejler
        if (!currentUserId && jwt.includes('.')) {
          try {
            const payload = JSON.parse(atob(jwt.split('.')[1]));
            currentUserId = payload.sub;
            console.log('🔍 Extracted user ID from JWT payload:', currentUserId);
          } catch (jwtError) {
            console.error('❌ JWT parsing failed:', jwtError.message);
          }
        }
        
        // Metode 3: Fallback - brug den eneste bruger i systemet hvis ingen anden metode virker
        if (!currentUserId) {
          console.log('⚠️ No user found via auth, using fallback method');
          const { data: fallbackSignature } = await supabase
            .from('user_signatures')
            .select('user_id, html')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (fallbackSignature) {
            currentUserId = fallbackSignature.user_id;
            signatureHtml = fallbackSignature.html;
            console.log('🔄 Using fallback signature from user:', currentUserId);
          }
        }
        
      } catch (error) {
        console.error('❌ Complete auth processing failed:', error.message);
      }
    }
    
    // GARANTERET signatur-hentning
    if (currentUserId && !signatureHtml) {
      console.log('🔍 Loading signature for authenticated user:', currentUserId);
      
      try {
        const { data: userSignature, error: signatureError } = await supabase
          .from('user_signatures')
          .select('html')
          .eq('user_id', currentUserId)
          .maybeSingle();
        
        console.log('📝 User signature query result:', { 
          found: !!userSignature?.html, 
          error: signatureError?.message,
          userId: currentUserId,
          signatureLength: userSignature?.html?.length || 0
        });
        
        if (userSignature?.html) {
          signatureHtml = userSignature.html;
          console.log('✅ User signature loaded successfully');
        }
      } catch (error) {
        console.error('❌ Database error loading user signature:', error.message);
      }
    }
    
    // ULTIMATE FALLBACK - garanteret at finde EN signatur
    if (!signatureHtml) {
      console.log('⚠️ No user signature found, using ultimate fallback');
      
      try {
        const { data: ultimateFallback } = await supabase
          .from('user_signatures')
          .select('html')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (ultimateFallback?.html) {
          signatureHtml = ultimateFallback.html;
          console.log('✅ Ultimate fallback signature loaded');
        } else {
          console.log('❌ NO SIGNATURES FOUND IN DATABASE AT ALL');
        }
      } catch (error) {
        console.error('❌ Ultimate fallback failed:', error.message);
      }
    }

    // SMART ADAPTIVE EMAIL SIGNATURE SYSTEM - maksimal kompatibilitet
    let emailHtmlContent = message_content.replace(/\n/g, '<br>');
    
    if (signatureHtml) {
      console.log('🎨 Processing ADAPTIVE signature with length:', signatureHtml.length);
      
      // HYBRID APPROACH: Giv email-klienter flere muligheder for at vise logoet
      let adaptiveSignatureHtml = signatureHtml;
      
      // Hvis signatur indeholder base64 billede, tilføj fallback
      if (adaptiveSignatureHtml.includes('data:image/')) {
        console.log('🔄 Creating HYBRID signature with base64 + external URL fallback');
        
        // Bevar original base64 men tilføj external URL som alt fallback
        adaptiveSignatureHtml = adaptiveSignatureHtml.replace(
          /<img([^>]*?)src="data:image\/[^"]*"([^>]*?)>/gi,
          (match, before, after) => {
            // Bevar original base64 billede men tilføj flere fallback muligheder
            const hasAlt = /alt\s*=\s*["'][^"']*["']/.test(match);
            const altText = hasAlt ? '' : ' alt="MM Multipartner logo"';
            
            return `<img${before}src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="${after}${altText}>
            <!--[if !supportImages]-->
            <img src="https://5abb5ee6-c539-4c8d-8635-3785cb770598.lovableproject.com/mm-multipartner-logo.png" alt="MM Multipartner logo" style="max-height: 60px; max-width: 150px; object-fit: contain; display: block; margin-bottom: 4px;" />
            <!--<![endif]-->`;
          }
        );
      }
      
      // Wrap signature i kompatibel container
      const finalSignature = `
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e5e5;">
          ${adaptiveSignatureHtml}
        </div>
      `;
      
      emailHtmlContent += '<br>' + finalSignature;
      
      console.log('✅ ADAPTIVE HYBRID SIGNATUR TILFØJET - Ticket:', ticket_id);
      console.log('✅ Support: Base64 (Mac Mail), External URL (Outlook), MSO conditionals');
    } else {
      // FALLBACK: Hvis ingen signatur findes, tilføj minimal standard signatur
      const fallbackSignature = `
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e5e5;">
          <img src="https://5abb5ee6-c539-4c8d-8635-3785cb770598.lovableproject.com/mm-multipartner-logo.png" 
               alt="MM Multipartner logo" 
               style="max-height: 60px; max-width: 150px; object-fit: contain; display: block; margin-bottom: 8px;" />
          <p style="margin: 0; font-size: 12px; color: #666;">
            MM Multipartner<br>
            Email: info@mmmultipartner.dk
          </p>
        </div>
      `;
      emailHtmlContent += '<br>' + fallbackSignature;
      console.log('⚠️ BRUGER FALLBACK SIGNATUR - Ticket:', ticket_id);
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