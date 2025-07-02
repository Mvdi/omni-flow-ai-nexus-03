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
        <td>${item.description}</td>
        <td>${item.description}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: center;">Liter</td>
        <td style="text-align: right;">Kr. ${item.unit_price?.toLocaleString('da-DK') || 0}</td>
        <td style="text-align: right;">0%</td>
        <td style="text-align: right;">Kr. ${item.total_price?.toLocaleString('da-DK') || 0}</td>
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
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                line-height: 1.5; 
                color: #1a1a1a; 
                background-color: #ffffff; 
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: #ffffff; 
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header { 
                background: #ffffff; 
                padding: 40px 40px 20px 40px; 
                border-bottom: 1px solid #e5e7eb;
            }
            .company-info {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
            }
            .company-logo {
                font-size: 24px;
                font-weight: 700;
                color: #1a1a1a;
            }
            .company-details {
                text-align: right;
                font-size: 12px;
                color: #6b7280;
                line-height: 1.4;
            }
            .quote-title {
                font-size: 32px;
                font-weight: 700;
                color: #1a1a1a;
                margin-bottom: 5px;
            }
            .quote-subtitle {
                font-size: 14px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .content { 
                padding: 40px; 
            }
            .customer-info {
                margin-bottom: 30px;
            }
            .customer-name {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 5px;
            }
            .quote-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                font-size: 12px;
                color: #6b7280;
            }
            .quote-number {
                font-weight: 600;
                color: #1a1a1a;
            }
            .description-section {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #3b82f6;
            }
            .description-title {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 8px;
            }
            .description-text {
                color: #6b7280;
                font-size: 14px;
            }
            .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 30px 0;
                font-size: 14px;
            }
            .items-table th { 
                background: #f8fafc; 
                padding: 12px 16px; 
                text-align: left; 
                font-weight: 600; 
                color: #374151; 
                font-size: 12px; 
                text-transform: uppercase; 
                letter-spacing: 0.5px;
                border-bottom: 1px solid #e5e7eb;
            }
            .items-table th:last-child,
            .items-table td:last-child { 
                text-align: right; 
            }
            .items-table th:nth-child(3),
            .items-table td:nth-child(3) { 
                text-align: center; 
            }
            .items-table td { 
                padding: 16px; 
                border-bottom: 1px solid #f3f4f6; 
                color: #374151; 
            }
            .items-table tr:last-child td {
                border-bottom: 1px solid #e5e7eb;
            }
            .total-section { 
                background: #f8fafc; 
                padding: 20px; 
                border-radius: 8px; 
                margin: 30px 0;
                border: 1px solid #e5e7eb;
            }
            .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }
            .total-row.subtotal {
                color: #6b7280;
            }
            .total-row.vat {
                color: #6b7280;
                padding-bottom: 8px;
                border-bottom: 1px solid #e5e7eb;
            }
            .total-row.final {
                font-size: 18px;
                font-weight: 700;
                color: #1a1a1a;
                margin-top: 12px;
                margin-bottom: 0;
            }
            .validity-section {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                color: #92400e;
                padding: 16px;
                border-radius: 8px;
                margin: 30px 0;
                text-align: center;
                font-weight: 500;
                font-size: 14px;
            }
            .cta-section { 
                background: #10b981; 
                padding: 30px; 
                border-radius: 8px; 
                text-align: center; 
                margin: 30px 0;
            }
            .cta-title { 
                color: white; 
                font-size: 20px; 
                font-weight: 600; 
                margin-bottom: 12px; 
            }
            .cta-subtitle { 
                color: rgba(255,255,255,0.9); 
                font-size: 14px; 
                margin-bottom: 20px; 
            }
            .cta-button { 
                display: inline-block; 
                background: #ffffff; 
                color: #10b981; 
                padding: 14px 28px; 
                border-radius: 6px; 
                text-decoration: none; 
                font-weight: 600; 
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .footer { 
                background: #f8fafc; 
                padding: 30px 40px; 
                text-align: center; 
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #6b7280;
            }
            .footer-company {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 8px;
            }
            .footer-tagline {
                font-style: italic;
                margin-top: 12px;
                color: #9ca3af;
            }
            @media (max-width: 600px) {
                .container { margin: 0; }
                .header, .content, .footer { padding: 20px; }
                .company-info { flex-direction: column; }
                .company-details { text-align: left; margin-top: 20px; }
                .quote-info { flex-direction: column; gap: 10px; }
                .cta-section { padding: 20px; }
                .quote-title { font-size: 24px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="company-info">
                    <div>
                        <div class="company-logo">MM Multipartner</div>
                    </div>
                    <div class="company-details">
                        Penselvej 8<br>
                        1234 Spandevis<br>
                        AB: Casper Hvid<br>
                        CVR: 12345678
                    </div>
                </div>
                
                <div class="quote-title">Tilbud</div>
                <div class="quote-subtitle">(EKSEMPEL)</div>
            </div>
            
            <div class="content">
                <div class="customer-info">
                    <div class="customer-name">${customerName}</div>
                </div>
                
                <div class="quote-info">
                    <div>
                        <strong>Tilbuddet gælder t.o.m.:</strong> ${validUntil ? new Date(validUntil).toLocaleDateString('da-DK') : 'den 20/12-2024'}<br>
                        <strong>Virksomhedsnavnet jobbeyder omfatter opgaven:</strong> den 01/01-2025
                    </div>
                    <div style="text-align: right;">
                        <strong>${new Date().toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                    </div>
                </div>
                
                <div class="description-section">
                    <div class="description-title">${quoteTitle}</div>
                    ${quoteDescription ? `<div class="description-text">${quoteDescription}</div>` : ''}
                </div>
                
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Vare</th>
                            <th>Beskrivelse</th>
                            <th>Antal</th>
                            <th>Enhed</th>
                            <th>Stk. pris</th>
                            <th>Rabat</th>
                            <th>Pris</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div class="total-row subtotal">
                        <span>Subtotal</span>
                        <span>${Math.round(totalAmount / 1.25).toLocaleString('da-DK')} ${currency}</span>
                    </div>
                    <div class="total-row vat">
                        <span>Moms (25%)</span>
                        <span>${Math.round(totalAmount - (totalAmount / 1.25)).toLocaleString('da-DK')} ${currency}</span>
                    </div>
                    <div class="total-row final">
                        <span>Total ${currency}</span>
                        <span>${totalAmount.toLocaleString('da-DK')} ${currency}</span>
                    </div>
                </div>
                
                ${validUntil ? `
                <div class="validity-section">
                    ⏰ <strong>Begrænset tilbud:</strong> Dette tilbud udløber ${new Date(validUntil).toLocaleDateString('da-DK')}
                </div>
                ` : ''}
                
                <div class="cta-section">
                    <div class="cta-title">Klar til at komme i gang?</div>
                    <div class="cta-subtitle">Bekræft dit tilbud nu og få professionel service af højeste kvalitet!</div>
                    <a href="${confirmUrl}" class="cta-button" style="color: #10b981;">
                        BEKRÆFT TILBUD NU
                    </a>
                </div>
                
                <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                    Vi ser frem til et godt samarbejde.<br><br>
                    Med venlig hilsen<br>
                    Torben Schwartz<br>
                    Din malermester
                </p>
            </div>
            
            <div class="footer">
                <div class="footer-company">MM Multipartner</div>
                <div>
                    <strong>Email:</strong> salg@mmmultipartner.dk<br>
                    <strong>Hjemmeside:</strong> www.mmmultipartner.dk
                </div>
                <div class="footer-tagline">
                    "Din pålidelige partner inden for professionel rengøring"
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