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
  // New custom fields
  customEmailData?: any;
  logoUrl?: string;
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
      items,
      customEmailData,
      logoUrl
    }: SendQuoteRequest = await req.json();

    console.log(`Sending PROFESSIONAL quote ${quoteNumber} to ${to} - USING CUSTOM TEMPLATE`);

    // Get user's custom template if available
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let templateData = null;
    let templateHtml = null;

    // If custom email data is provided, use it
    if (customEmailData) {
      templateData = customEmailData;
      console.log('Using provided custom email data');
    } else {
      // Try to load user's saved template
      try {
        const { data: userTemplate } = await supabaseClient
          .from('quote_email_templates')
          .select('template_data, html_template')
          .eq('is_default', true)
          .single();
          
        if (userTemplate) {
          templateData = userTemplate.template_data;
          templateHtml = userTemplate.html_template;
          console.log('Using saved user template');
        }
      } catch (error) {
        console.log('No custom template found, using defaults');
      }
    }

    // Calculate subtotal and VAT
    const subtotal = Math.round(totalAmount / 1.25);
    const vat = totalAmount - subtotal;

    // Check if any items have discount to determine if we show discount column
    const hasDiscount = items.some(item => (item as any).discount_percent > 0);

    // Generate clean professional table rows
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${item.description.split(' ')[0] || 'Ydelse'}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${item.description}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px;">${item.quantity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 14px;">Timer</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px;">Kr. ${item.unit_price?.toLocaleString('da-DK') || 0}</td>
        ${hasDiscount ? `<td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px;">${(item as any).discount_percent || 0}%</td>` : ''}
        <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 14px; font-weight: 600;">Kr. ${item.total_price?.toLocaleString('da-DK') || 0}</td>
      </tr>
    `).join('');

    const confirmUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/confirm-quote?quote=${quoteNumber}&email=${encodeURIComponent(to)}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${templateData?.documentTitle || 'Tilbud'} ${quoteNumber} - ${templateData?.companyName || 'MM Multipartner'}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                line-height: 1.4; 
                color: #000000; 
                background-color: #ffffff; 
                font-size: 14px;
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: #ffffff; 
                padding: 40px;
            }
            .header { 
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
            }
            .left-header {
                flex: 1;
            }
            .quote-title {
                font-size: 36px;
                font-weight: 700;
                color: #000000;
                margin-bottom: 5px;
                line-height: 1.1;
            }
            .quote-subtitle {
                font-size: 18px;
                color: #000000;
                font-weight: 400;
            }
            .logo-placeholder {
                width: 80px;
                height: 80px;
                background: #E3F2FD;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #1976D2;
                font-weight: 600;
                font-size: 14px;
            }
            .company-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
            }
            .company-info {
                flex: 1;
            }
            .company-name {
                font-size: 16px;
                font-weight: 600;
                color: #000000;
                margin-bottom: 8px;
            }
            .company-details {
                font-size: 13px;
                color: #000000;
                line-height: 1.4;
            }
            .date-info {
                text-align: right;
                font-size: 13px;
                color: #000000;
            }
            .customer-section {
                margin-bottom: 30px;
            }
            .customer-name {
                font-size: 16px;
                font-weight: 600;
                color: #000000;
                margin-bottom: 20px;
            }
            .project-info {
                font-size: 13px;
                color: #000000;
                line-height: 1.5;
                margin-bottom: 30px;
            }
            .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 30px 0;
                font-size: 14px;
            }
            .items-table th { 
                background: #ffffff; 
                padding: 12px 8px; 
                text-align: left; 
                font-weight: 600; 
                color: #000000; 
                font-size: 14px; 
                border-bottom: 2px solid #000000;
            }
            .items-table th:nth-child(3),
            .items-table th:nth-child(4),
            .items-table th:nth-child(5),
            .items-table th:nth-child(6),
            .items-table th:nth-child(7) { 
                text-align: right; 
            }
            .items-table td { 
                padding: 12px 8px; 
                border-bottom: 1px solid #e5e7eb; 
                color: #000000; 
            }
            .totals-section { 
                margin-top: 40px;
                text-align: right;
            }
            .total-row {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 8px;
                font-size: 14px;
            }
            .total-label {
                min-width: 120px;
                text-align: right;
                margin-right: 40px;
                color: #000000;
            }
            .total-value {
                min-width: 80px;
                text-align: right;
                color: #000000;
            }
            .total-row.final {
                font-weight: 700;
                font-size: 16px;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 2px solid #000000;
            }
            .signature-section {
                margin-top: 50px;
                font-size: 14px;
                color: #000000;
            }
            .footer { 
                margin-top: 60px;
                text-align: center; 
                font-size: 12px;
                color: #666666;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
            @media (max-width: 600px) {
                .container { padding: 20px; }
                .header { flex-direction: column; gap: 20px; }
                .company-section { flex-direction: column; gap: 20px; }
                .date-info { text-align: left; }
                .quote-title { font-size: 28px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="left-header">
                    <div class="quote-title">${templateData?.documentTitle || 'Tilbud'}</div>
                     ${templateData?.documentSubtitle ? `<div class="quote-subtitle">${templateData.documentSubtitle}</div>` : ''}
                </div>
                ${logoUrl ? 
                  `<img src="${logoUrl}" alt="Logo" style="width: 128px; height: 128px; object-fit: contain;" />` : 
                  (templateData?.logoUrl ? `<img src="${templateData.logoUrl}" alt="Logo" style="width: 128px; height: 128px; object-fit: contain;" />` : '<div class="logo-placeholder">LOGO</div>')
                }
            </div>
            
            <div class="company-section">
                <div class="company-info">
                    <div class="company-name">${templateData?.companyName || customEmailData?.companyName || 'Virksomhed'}</div>
                    <div class="company-details">
                        ${templateData?.companyAddress || customEmailData?.companyAddress || ''}<br>
                        ${templateData?.companyCity || customEmailData?.companyCity || ''}<br>
                        ${templateData?.companyCvr || customEmailData?.companyCvr || ''}
                    </div>
                    </div>
                </div>
                <div class="date-info">
                    ${new Date().toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
            </div>
            
            <div class="customer-section">
                <div class="customer-name">${customerName}</div>
                <div class="customer-details">
                    ${to}<br>
                    ${customEmailData?.customer_phone || ''}<br>
                    ${customEmailData?.customer_address || ''}<br>
                    ${customEmailData?.customer_company || ''}
                </div>
            </div>
            
            <div class="project-info">
                <strong>${quoteTitle}</strong>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>${templateData?.itemColumnHeader || 'Vare'}</th>
                        <th>${templateData?.descriptionColumnHeader || 'Beskrivelse'}</th>
                        <th style="text-align: right;">${templateData?.quantityColumnHeader || 'Antal'}</th>
                        <th style="text-align: right;">${templateData?.unitColumnHeader || 'Enhed'}</th>
                        <th style="text-align: right;">${templateData?.priceColumnHeader || 'Stk. pris'}</th>
                        ${hasDiscount ? `<th style="text-align: right;">${templateData?.discountColumnHeader || 'Rabat'}</th>` : ''}
                        <th style="text-align: right;">${templateData?.totalColumnHeader || 'Pris'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div class="totals-section">
                <div class="total-row">
                    <div class="total-label">${templateData?.subtotalLabel || 'Subtotal'}</div>
                    <div class="total-value">Kr. ${subtotal.toLocaleString('da-DK')}</div>
                </div>
                <div class="total-row">
                    <div class="total-label">${templateData?.vatLabel || 'Moms (25%)'}</div>
                    <div class="total-value">Kr. ${vat.toLocaleString('da-DK')}</div>
                </div>
                <div class="total-row final">
                    <div class="total-label">${templateData?.totalLabel || 'Total DKK'}</div>
                    <div class="total-value">Kr. ${totalAmount.toLocaleString('da-DK')}</div>
                </div>
            </div>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${confirmUrl}" style="display: inline-block; background: #4CAF50; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                    ${templateData?.ctaButtonText || '✅ BEKRÆFT TILBUD NU'}
                </a>
            </div>
            
            <div class="signature-section">
                ${templateData?.signatureText || 'Vi ser frem til et godt samarbejde.'}<br><br>
                Med venlig hilsen<br>
                ${templateData?.signatureName || 'Mathias Nielsen'}
            </div>
            
            <div class="footer">
                ${templateData?.footerText || customEmailData?.footerText || ''}
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

    console.log('Sending CLEAN PROFESSIONAL email via Microsoft Graph...');
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

    console.log('PROFESSIONAL quote email sent successfully via Office365');

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: 'sent',
      design: 'professional_clean_v3'
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