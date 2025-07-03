import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendQuoteEmailRequest {
  quote_id: string;
  customer_email: string;
  customer_name: string;
  quote_content: string;
  sender_name?: string;
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
    const { quote_id, customer_email, customer_name, quote_content, sender_name }: SendQuoteEmailRequest = await req.json();

    if (!quote_id || !customer_email || !quote_content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Processing quote email send request for quote:', quote_id);

    // Hent quote information
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      console.error('Failed to fetch quote:', quoteError);
      return new Response(JSON.stringify({ error: "Quote not found" }), { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    console.log('Found quote:', quote.quote_number);

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

    console.log('Fetching access token for quote email sending...');
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

    // Hent bruger signatur som HTML
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
          signatureHtml = userSignature.html;
          console.log('Loaded user signature for quote email');
        }
      }
    }

    // Byg email content med ren HTML formatering
    let emailHtmlContent = quote_content.replace(/\n/g, '<br>');
    
    // Tilføj signatur som flydende HTML
    if (signatureHtml) {
      emailHtmlContent += '<br><br>' + signatureHtml;
    }

    // Email adresse og emne
    const fromAddress = 'salg@mmmultipartner.dk';
    const subject = `Tilbud ${quote.quote_number} - ${quote.title}`;

    // Forbered email med Microsoft Graph
    const emailMessage: any = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: emailHtmlContent
        },
        toRecipients: [
          {
            emailAddress: {
              address: customer_email,
              name: customer_name || customer_email
            }
          }
        ],
        internetMessageHeaders: [
          {
            name: 'X-Quote-Number',
            value: quote.quote_number
          },
          {
            name: 'X-Quote-ID',
            value: quote_id
          }
        ]
      },
      saveToSentItems: true
    };

    // Send email via Microsoft Graph
    const sendUrl = `https://graph.microsoft.com/v1.0/users/${fromAddress}/sendMail`;

    console.log(`Sending QUOTE email from ${fromAddress} to ${customer_email}`);
    
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
      console.error('Failed to send quote email:', sendError);
      return new Response(JSON.stringify({ error: "Failed to send quote email", details: sendError }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Quote email sent successfully via Microsoft Graph');

    // Opdater quote status til 'sent'
    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', quote_id);

    if (quoteUpdateError) {
      console.error('Failed to update quote status:', quoteUpdateError);
    } else {
      console.log('Updated quote status to sent');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Quote email sent successfully',
      from: fromAddress,
      to: customer_email,
      subject: subject,
      quote_number: quote.quote_number
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Send quote email error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});