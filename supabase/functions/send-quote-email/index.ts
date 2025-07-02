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

    console.log(`Sending quote ${quoteNumber} to ${to} via Office365`);

    // Generate HTML content for the email
    const itemsHtml = items.map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; text-align: left;">${item.description}</td>
        <td style="padding: 12px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; text-align: right;">${item.unit_price.toLocaleString('da-DK')} ${currency}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold;">${item.total_price.toLocaleString('da-DK')} ${currency}</td>
      </tr>
    `).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Tilbud ${quoteNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .quote-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th { background: #f1f5f9; padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
            .total-row { background: #2563eb; color: white; font-weight: bold; }
            .total-row td { padding: 15px 12px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }
            .company-info { margin-top: 20px; font-size: 14px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>TILBUD</h1>
                <p style="margin: 10px 0; font-size: 18px;">Tilbudsnummer: ${quoteNumber}</p>
                <p style="margin: 10px 0;">Dato: ${new Date().toLocaleDateString('da-DK')}</p>
            </div>
            
            <div class="content">
                <h2>Kære ${customerName}</h2>
                
                <div class="quote-info">
                    <h3 style="margin-top: 0; color: #2563eb;">${quoteTitle}</h3>
                    ${quoteDescription ? `<p>${quoteDescription}</p>` : ''}
                </div>
                
                <h3>Tilbudsdetaljer:</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Beskrivelse</th>
                            <th style="text-align: center;">Antal</th>
                            <th style="text-align: right;">Pris pr. stk.</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                        <tr class="total-row">
                            <td colspan="3" style="text-align: right;">TOTAL:</td>
                            <td style="text-align: right;">${totalAmount.toLocaleString('da-DK')} ${currency}</td>
                        </tr>
                    </tbody>
                </table>
                
                ${validUntil ? `<p><strong>Tilbuddet er gyldigt til:</strong> ${new Date(validUntil).toLocaleDateString('da-DK')}</p>` : ''}
                
                <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #166534;">Næste skridt:</h4>
                    <p style="margin-bottom: 0;">Kontakt os på <strong>salg@mmmultipartner.dk</strong> eller ring til os for at acceptere tilbuddet eller hvis du har spørgsmål.</p>
                </div>
            </div>
            
            <div class="footer">
                <div class="company-info">
                    <strong>MM Multipartner</strong><br>
                    Email: salg@mmmultipartner.dk<br>
                    Tak for din interesse! Vi ser frem til at høre fra dig.
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Use the existing Office365 email integration
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('Attempting to send quote email via Office365 integration...');

    const { data: emailResponse, error } = await supabase.functions.invoke('office365-send-email', {
      body: {
        to: [to],
        subject: `Tilbud ${quoteNumber} fra MM Multipartner`,
        htmlContent: htmlContent,
        fromAddress: 'salg@mmmultipartner.dk',
        // Make it compatible with the office365-send-email function
        sender_name: 'MM Multipartner Sales',
        ticket_id: 'quote-' + quoteNumber, // Dummy ticket ID for quotes
        message_content: htmlContent
      }
    });

    if (error) {
      console.error("Error sending quote email via Office365:", error);
      throw new Error(`Email sending failed: ${error.message || 'Unknown error'}`);
    }

    console.log("Quote email sent successfully via Office365:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse?.messageId || 'sent'
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