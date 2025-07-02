import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratePDFRequest {
  quoteId: string;
  customerName: string;
  customerEmail: string;
  quoteNumber: string;
  quoteTitle: string;
  quoteDescription?: string;
  totalAmount: number;
  currency?: string;
  validUntil?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    unit?: string;
  }>;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      quoteId,
      customerName,
      customerEmail,
      quoteNumber, 
      quoteTitle,
      quoteDescription,
      totalAmount,
      currency = 'DKK',
      validUntil,
      items,
      userId
    }: GeneratePDFRequest = await req.json();

    console.log(`Generating PDF for quote ${quoteNumber}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user's quote template
    let templateData: any = {
      documentTitle: 'Tilbud',
      documentSubtitle: '',
      companyName: 'MM Multipartner',
      companyAddress: 'Penselvej 8',
      companyCity: '1234 Spandevis',
      companyCvr: 'CVR: 12345678',
      itemColumnHeader: 'Vare',
      descriptionColumnHeader: 'Beskrivelse',
      quantityColumnHeader: 'Antal',
      unitColumnHeader: 'Enhed',
      priceColumnHeader: 'Stk. pris',
      totalColumnHeader: 'Pris',
      subtotalLabel: 'Subtotal',
      vatLabel: 'Moms (25%)',
      totalLabel: 'Total DKK',
      ctaButtonText: '✅ BEKRÆFT TILBUD NU',
      signatureText: 'Vi ser frem til et godt samarbejde.',
      signatureName: 'MM Multipartner',
      signatureTitle: 'Din partner',
      footerText: 'MM Multipartner – Penselvej 8 – 1234 Spandevis',
      logoUrl: '',
      fontFamily: 'Arial',
      primaryColor: '#4CAF50',
      backgroundColor: '#ffffff'
    };

    try {
      const { data: template, error } = await supabase
        .from('quote_email_templates')
        .select('template_data, html_template')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();
        
      if (template && template.template_data) {
        templateData = { ...templateData, ...template.template_data };
        console.log('Using user template data');
      }
    } catch (error) {
      console.log('No custom template found, using defaults');
    }

    // Calculate subtotal and VAT
    const subtotal = Math.round(totalAmount / 1.25);
    const vat = totalAmount - subtotal;

    // Format validity date
    const formattedValidUntil = validUntil ? new Date(validUntil).toLocaleDateString('da-DK') : 'Se beskrivelse';
    
    // Generate HTML content for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${templateData.documentTitle} ${quoteNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: ${templateData.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                line-height: 1.4; 
                color: #000000; 
                background-color: ${templateData.backgroundColor}; 
                font-size: 14px;
                padding: 40px;
            }
            .header { 
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
            }
            .title {
                font-size: 32px;
                font-weight: 700;
                color: #000000;
                margin-bottom: 20px;
            }
            .subtitle {
                font-size: 18px;
                color: #666666;
                margin-bottom: 20px;
            }
            .logo-section {
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
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
                margin-bottom: 30px;
            }
            .company-name {
                font-weight: 600;
                margin-bottom: 5px;
            }
            .customer-section {
                margin-bottom: 30px;
            }
            .customer-name {
                font-weight: 600;
                margin-bottom: 10px;
            }
            .quote-info {
                margin-bottom: 30px;
                font-weight: 600;
            }
            .project-description {
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-left: 4px solid ${templateData.primaryColor};
            }
            .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 30px 0;
                font-size: 14px;
            }
            .items-table th { 
                padding: 12px 8px; 
                text-align: left; 
                font-weight: 600; 
                color: #000000; 
                border-bottom: 2px solid #000000;
                background: #f8f9fa;
            }
            .items-table th.center { text-align: center; }
            .items-table th.right { text-align: right; }
            .items-table td { 
                padding: 12px 8px; 
                border-bottom: 1px solid #cccccc; 
                color: #000000; 
            }
            .items-table td.center { text-align: center; }
            .items-table td.right { text-align: right; }
            .items-table td.bold { font-weight: 600; }
            .totals-section { 
                margin-top: 30px;
                text-align: right;
            }
            .total-row {
                display: flex;
                justify-content: flex-end;
                margin-bottom: 5px;
            }
            .total-label {
                min-width: 120px;
                text-align: right;
                margin-right: 40px;
            }
            .total-value {
                min-width: 80px;
                text-align: right;
            }
            .total-row.final {
                font-weight: 700;
                font-size: 16px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 2px solid #000000;
            }
            .validity-section {
                margin: 30px 0;
                padding: 15px;
                background: #fff3cd;
                border: 1px solid #ffecb5;
                border-radius: 6px;
            }
            .signature-section {
                margin-top: 40px;
                font-size: 14px;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #666666;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="title">${templateData.documentTitle}</div>
                ${templateData.documentSubtitle ? `<div class="subtitle">${templateData.documentSubtitle}</div>` : ''}
            </div>
            <div class="logo-section">
                ${templateData.logoUrl ? 
                  `<img src="${templateData.logoUrl}" alt="Logo" style="max-width: 80px; max-height: 80px; object-fit: contain;" />` : 
                  '<div class="logo-placeholder">LOGO</div>'
                }
            </div>
        </div>
        
        <div class="company-section">
            <div>
                <div class="company-name">${templateData.companyName}</div>
                ${templateData.companyAddress ? `<div>${templateData.companyAddress}</div>` : ''}
                ${templateData.companyCity ? `<div>${templateData.companyCity}</div>` : ''}
                ${templateData.companyCvr ? `<div>${templateData.companyCvr}</div>` : ''}
            </div>
            <div>
                <strong>Dato:</strong> ${new Date().toLocaleDateString('da-DK')}<br>
                <strong>Tilbud nr.:</strong> ${quoteNumber}
            </div>
        </div>
        
        <div class="customer-section">
            <div class="customer-name">Til: ${customerName}</div>
            <div>${customerEmail}</div>
        </div>
        
        <div class="quote-info">
            <strong>Vedrørende:</strong> ${quoteTitle}
        </div>
        
        ${quoteDescription ? `
        <div class="project-description">
            <strong>Projektbeskrivelse:</strong><br>
            ${quoteDescription}
        </div>
        ` : ''}
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>${templateData.itemColumnHeader}</th>
                    <th>${templateData.descriptionColumnHeader}</th>
                    <th class="center">${templateData.quantityColumnHeader}</th>
                    <th class="center">${templateData.unitColumnHeader}</th>
                    <th class="right">${templateData.priceColumnHeader}</th>
                    <th class="right">${templateData.totalColumnHeader}</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.description?.split(' ')[0] || 'Ydelse'}</td>
                        <td>${item.description}</td>
                        <td class="center">${item.quantity}</td>
                        <td class="center">${item.unit || 'stk'}</td>
                        <td class="right">${item.unit_price?.toLocaleString('da-DK')} kr.</td>
                        <td class="right bold">${item.total_price?.toLocaleString('da-DK')} kr.</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals-section">
            <div class="total-row">
                <div class="total-label">${templateData.subtotalLabel}</div>
                <div class="total-value">${subtotal.toLocaleString('da-DK')} kr.</div>
            </div>
            <div class="total-row">
                <div class="total-label">${templateData.vatLabel}</div>
                <div class="total-value">${vat.toLocaleString('da-DK')} kr.</div>
            </div>
            <div class="total-row final">
                <div class="total-label">${templateData.totalLabel}</div>
                <div class="total-value">${totalAmount.toLocaleString('da-DK')} kr.</div>
            </div>
        </div>
        
        <div class="validity-section">
            <strong>${templateData.validityText || 'Tilbuddet gælder til'}:</strong> ${formattedValidUntil}
        </div>
        
        <div class="signature-section">
            ${templateData.signatureText}<br><br>
            Med venlig hilsen<br>
            <strong>${templateData.signatureName}</strong><br>
            ${templateData.signatureTitle || ''}
        </div>
        
        ${templateData.footerText ? `
        <div class="footer">
            ${templateData.footerText}
        </div>
        ` : ''}
    </body>
    </html>
    `;

    // Convert HTML to PDF using Puppeteer
    const puppeteerUrl = "https://puppeteer-pdf-api.deno.dev/pdf";
    
    const pdfResponse = await fetch(puppeteerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          }
        }
      })
    });

    if (!pdfResponse.ok) {
      throw new Error(`PDF generation failed: ${pdfResponse.statusText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    
    console.log('PDF generated successfully');

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tilbud-${quoteNumber}.pdf"`,
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
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