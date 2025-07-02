import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderToString } from "https://esm.sh/react-dom@18.2.0/server";
import React from "https://esm.sh/react@18.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratePDFRequest {
  quoteId: string;
  customerName: string;
  quoteNumber: string;
  quoteTitle: string;
  totalAmount: number;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  templateData?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      quoteId,
      customerName, 
      quoteNumber, 
      quoteTitle,
      totalAmount,
      items,
      templateData
    }: GeneratePDFRequest = await req.json();

    console.log(`Generating PDF for quote ${quoteNumber}`);

    // Calculate subtotal and VAT
    const subtotal = Math.round(totalAmount / 1.25);
    const vat = totalAmount - subtotal;

    // Generate HTML content for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${templateData?.documentTitle || 'Tilbud'} ${quoteNumber}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                line-height: 1.4; 
                color: #000000; 
                background-color: #ffffff; 
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
            .customer-email {
                color: #2563eb;
                text-decoration: underline;
            }
            .quote-info {
                margin-bottom: 30px;
                font-weight: 600;
            }
            .items-table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 30px 0;
                font-size: 14px;
            }
            .items-table th { 
                padding: 8px; 
                text-align: left; 
                font-weight: 600; 
                color: #000000; 
                border-bottom: 2px solid #000000;
            }
            .items-table th.center { text-align: center; }
            .items-table th.right { text-align: right; }
            .items-table td { 
                padding: 8px; 
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
            .confirmation-button {
                text-align: center;
                margin: 30px 0;
            }
            .button {
                background: #4CAF50;
                color: white;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 14px;
                display: inline-block;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="title">${templateData?.documentTitle || 'Tilbud'}</div>
            </div>
            ${templateData?.logoUrl ? 
              `<img src="${templateData.logoUrl}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain;" />` : 
              '<div class="logo-placeholder">LOGO</div>'
            }
        </div>
        
        <div class="company-section">
            <div>
                ${templateData?.companyName ? `<div class="company-name">${templateData.companyName}</div>` : ''}
                ${templateData?.companyAddress ? `<div>${templateData.companyAddress}</div>` : ''}
                ${templateData?.companyCity ? `<div>${templateData.companyCity}</div>` : ''}
                ${templateData?.companyCvr ? `<div>${templateData.companyCvr}</div>` : ''}
            </div>
            <div>
                ${new Date().toLocaleDateString('da-DK')}
            </div>
        </div>
        
        <div class="customer-section">
            <div class="customer-name">${customerName}</div>
        </div>
        
        <div class="quote-info">
            ${quoteTitle}
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>${templateData?.itemColumnHeader || 'Vare'}</th>
                    <th>${templateData?.descriptionColumnHeader || 'Beskrivelse'}</th>
                    <th class="center">${templateData?.quantityColumnHeader || 'Antal'}</th>
                    <th class="center">${templateData?.unitColumnHeader || 'Enhed'}</th>
                    <th class="right">${templateData?.priceColumnHeader || 'Stk. pris'}</th>
                    <th class="right">${templateData?.totalColumnHeader || 'Pris'}</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.description?.split(' ')[0] || item.description || 'Ydelse'}</td>
                        <td>${item.description}</td>
                        <td class="center">${item.quantity}</td>
                        <td class="center">Timer</td>
                        <td class="right">Kr. ${item.unit_price?.toLocaleString('da-DK') || 0}</td>
                        <td class="right bold">Kr. ${item.total_price?.toLocaleString('da-DK') || 0}</td>
                    </tr>
                `).join('')}
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
        
        <div class="confirmation-button">
            <div class="button">
                ${templateData?.ctaButtonText || '✅ BEKRÆFT TILBUD NU'}
            </div>
        </div>
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