import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendQuoteRequest {
  to: string;
  customerName: string;
  quoteNumber: string;
  quoteTitle: string;
  quoteDescription?: string;
  totalAmount: number;
  currency: string;
  validUntil?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      customerName, 
      quoteNumber, 
      quoteTitle,
      quoteDescription,
      totalAmount,
      currency,
      validUntil,
      items 
    }: SendQuoteRequest = await req.json();

    console.log(`Sending quote ${quoteNumber} to ${to} via Office365 directly`);

    // Generate professional HTML content based on design guide
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${item.description}</td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280; font-size: 14px;">${item.unit_price.toLocaleString('da-DK')} ${currency}</td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 600; font-size: 14px;">${item.total_price.toLocaleString('da-DK')} ${currency}</td>
      </tr>
    `).join('');

    const confirmUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/confirm-quote?quote=${quoteNumber}&email=${encodeURIComponent(to)}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tilbud ${quoteNumber} - MM Multipartner</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
            .header .subtitle { font-size: 16px; opacity: 0.9; font-weight: 500; }
            .quote-number { background: rgba(255,255,255,0.15); padding: 12px 24px; border-radius: 20px; display: inline-block; margin-top: 16px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .greeting { font-size: 18px; color: #111827; margin-bottom: 24px; font-weight: 500; }
            .quote-title { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 24px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #4f46e5; }
            .quote-title h3 { color: #4f46e5; font-size: 20px; font-weight: 600; margin-bottom: 8px; }
            .quote-title p { color: #6b7280; font-size: 14px; }
            .items-section { margin: 32px 0; }
            .items-section h3 { color: #111827; font-size: 18px; font-weight: 600; margin-bottom: 16px; }
            .items-table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .items-table th { background: #f8fafc; padding: 16px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
            .items-table th:last-child { text-align: right; }
            .total-section { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; margin: 24px 0; padding: 24px; border-radius: 12px; text-align: center; }
            .total-amount { font-size: 32px; font-weight: 700; margin-bottom: 4px; }
            .total-label { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
            .validity { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center; font-weight: 500; }
            .cta-section { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; border-radius: 16px; text-align: center; margin: 32px 0; }
            .cta-section h3 { color: white; font-size: 24px; font-weight: 700; margin-bottom: 12px; }
            .cta-section p { color: rgba(255,255,255,0.9); font-size: 16px; margin-bottom: 24px; }
            .cta-button { display: inline-block; background: #ffffff; color: #059669; padding: 16px 32px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease; }
            .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
            .benefits { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 24px; border-radius: 12px; margin: 24px 0; }
            .benefits h4 { color: #166534; font-size: 16px; font-weight: 600; margin-bottom: 12px; }
            .benefits ul { list-style: none; }
            .benefits li { color: #15803d; font-size: 14px; margin-bottom: 8px; padding-left: 20px; position: relative; }
            .benefits li:before { content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }
            .urgency { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center; font-weight: 500; }
            .footer { background: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #e5e7eb; }
            .company-logo { font-size: 24px; font-weight: 700; color: #4f46e5; margin-bottom: 16px; }
            .contact-info { color: #6b7280; font-size: 14px; line-height: 1.8; }
            .contact-info strong { color: #374151; }
            @media (max-width: 600px) {
                .container { margin: 0; }
                .header, .content, .footer { padding: 20px; }
                .total-amount { font-size: 24px; }
                .cta-section { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>PROFESSIONELT TILBUD</h1>
                <p class="subtitle">Specialiseret rengøring af højeste kvalitet</p>
                <div class="quote-number">Tilbud Nr. ${quoteNumber}</div>
            </div>
            
            <div class="content">
                <div class="greeting">Kære ${customerName},</div>
                
                <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
                    Tak for din henvendelse! Vi har udarbejdet et skræddersyet tilbud baseret på dine specifikke behov.
                </p>
                
                <div class="quote-title">
                    <h3>${quoteTitle}</h3>
                    ${quoteDescription ? `<p>${quoteDescription}</p>` : ''}
                </div>
                
                <div class="benefits">
                    <h4>🏆 Hvad du får med MM Multipartner:</h4>
                    <ul>
                        <li>Professionelt udstyr og miljøvenlige produkter</li>
                        <li>Erfarne og forsikrede medarbejdere</li>
                        <li>Kvalitetsgaranti på alt vores arbejde</li>
                        <li>Fleksible tider der passer dig</li>
                        <li>Ingen skjulte omkostninger</li>
                    </ul>
                </div>
                
                <div class="items-section">
                    <h3>📋 Tilbudsdetaljer:</h3>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Ydelse</th>
                                <th style="text-align: center;">Antal</th>
                                <th style="text-align: right;">Pris pr. stk.</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>
                
                <div class="total-section">
                    <div class="total-label">Samlet investering</div>
                    <div class="total-amount">${totalAmount.toLocaleString('da-DK')} ${currency}</div>
                    <p style="font-size: 14px; opacity: 0.9; margin-top: 8px;">Inkl. moms • Ingen overraskelser</p>
                </div>
                
                ${validUntil ? `
                <div class="urgency">
                    ⏰ <strong>Begrænset tilbud:</strong> Dette tilbud udløber ${new Date(validUntil).toLocaleDateString('da-DK')}
                </div>
                ` : ''}
                
                <div class="cta-section">
                    <h3>🚀 Klar til at komme i gang?</h3>
                    <p>Bekræft dit tilbud nu og få professionel rengøring af højeste kvalitet!</p>
                    <a href="${confirmUrl}" class="cta-button" style="color: #059669;">
                        ✅ BEKRÆFT TILBUD NU
                    </a>
                </div>
                
                <div style="background: #fffbeb; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h4 style="color: #92400e; margin-bottom: 12px;">💬 Har du spørgsmål?</h4>
                    <p style="color: #92400e; font-size: 14px;">
                        Ring til os på <strong>+45 XX XX XX XX</strong> eller svar på denne email. 
                        Vi er klar til at hjælpe dig!
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <div class="company-logo">MM Multipartner</div>
                <div class="contact-info">
                    <strong>Email:</strong> salg@mmmultipartner.dk<br>
                    <strong>Hjemmeside:</strong> www.mmmultipartner.dk<br><br>
                    <em>"Din pålidelige partner inden for professionel rengøring"</em>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Get Office 365 credentials directly
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('Fetching Office 365 credentials...');
    
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError) {
      console.error('Error fetching Office 365 credentials:', secretsError);
      throw new Error(`Database error: ${secretsError.message}`);
    }

    if (!secrets || secrets.length === 0) {
      console.error('No Office 365 credentials found in database');
      throw new Error("Office 365 credentials not configured");
    }

    console.log(`Found ${secrets.length} Office 365 credentials`);

    const credentialsMap = secrets.reduce((acc, secret) => {
      acc[secret.key_name] = secret.key_value;
      return acc;
    }, {} as Record<string, string>);

    const { client_id, client_secret, tenant_id } = credentialsMap;

    if (!client_id || !client_secret || !tenant_id) {
      console.error('Incomplete Office 365 credentials. Missing:', {
        client_id: !!client_id,
        client_secret: !!client_secret, 
        tenant_id: !!tenant_id
      });
      throw new Error("Incomplete Office 365 credentials");
    }

    // Get access token
    const tokenUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id: client_id,
      client_secret: client_secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    console.log('Getting Office 365 access token...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token request failed:', tokenError);
      throw new Error(`Failed to get Office 365 token: ${tokenError}`);
    }

    const tokenData: GraphTokenResponse = await tokenResponse.json();
    console.log('Successfully obtained Office 365 token');

    // Send email via Microsoft Graph
    const emailMessage = {
      message: {
        subject: `Tilbud ${quoteNumber} fra MM Multipartner`,
        body: {
          contentType: 'HTML',
          content: htmlContent
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
              name: customerName
            }
          }
        ]
      }
    };

    console.log('Sending email via Microsoft Graph...');
    const sendUrl = `https://graph.microsoft.com/v1.0/users/salg@mmmultipartner.dk/sendMail`;
    
    const emailResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailMessage),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error('Email send failed:', emailError);
      throw new Error(`Failed to send email: ${emailError}`);
    }

    console.log('Quote email sent successfully via Office365');

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: 'sent'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending quote email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);