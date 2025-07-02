import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const quoteNumber = url.searchParams.get('quote');
    const customerEmail = url.searchParams.get('email');

    if (!quoteNumber || !customerEmail) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="da">
        <head>
            <meta charset="utf-8">
            <title>Fejl - MM Multipartner</title>
            <style>
                body { font-family: Inter, sans-serif; background: #f9fafb; margin: 0; padding: 40px; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; text-align: center; }
                .error { color: #dc2626; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="error">❌ Fejl</h1>
                <p>Manglende tilbudsinformation. Kontakt os på salg@mmmultipartner.dk</p>
            </div>
        </body>
        </html>
      `, {
        status: 400,
        headers: { "Content-Type": "text/html", ...corsHeaders }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Processing quote confirmation for ${quoteNumber} from ${customerEmail}`);

    // Find the quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('quote_number', quoteNumber)
      .eq('customer_email', customerEmail)
      .single();

    if (quoteError || !quote) {
      console.error('Quote not found:', quoteError);
      return new Response(`
        <!DOCTYPE html>
        <html lang="da">
        <head>
            <meta charset="utf-8">
            <title>Tilbud ikke fundet - MM Multipartner</title>
            <style>
                body { font-family: Inter, sans-serif; background: #f9fafb; margin: 0; padding: 40px; }
                .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; text-align: center; }
                .error { color: #dc2626; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="error">❌ Tilbud ikke fundet</h1>
                <p>Vi kunne ikke finde dit tilbud. Kontakt os på salg@mmmultipartner.dk</p>
            </div>
        </body>
        </html>
      `, {
        status: 404,
        headers: { "Content-Type": "text/html", ...corsHeaders }
      });
    }

    // Check if quote is already accepted
    if (quote.status === 'accepted') {
      return new Response(`
        <!DOCTYPE html>
        <html lang="da">
        <head>
            <meta charset="utf-8">
            <title>Tilbud allerede accepteret - MM Multipartner</title>
            <style>
                body { font-family: Inter, sans-serif; background: #f9fafb; margin: 0; padding: 40px; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; text-align: center; }
                .success { color: #059669; }
                .cta { background: #4f46e5; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1 class="success">✅ Tilbud allerede accepteret</h1>
                <p>Dit tilbud ${quoteNumber} er allerede blevet accepteret og behandlet.</p>
                <p>Hvis du har spørgsmål, kontakt os på:</p>
                <a href="mailto:salg@mmmultipartner.dk" class="cta">Kontakt os</a>
            </div>
        </body>
        </html>
      `, {
        status: 200,
        headers: { "Content-Type": "text/html", ...corsHeaders }
      });
    }

    // Update quote status to accepted
    const { error: updateQuoteError } = await supabase
      .from('quotes')
      .update({ status: 'accepted' })
      .eq('id', quote.id);

    if (updateQuoteError) {
      console.error('Failed to update quote status:', updateQuoteError);
      throw new Error('Failed to accept quote');
    }

    // Create order from quote
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer: quote.customer_name || customerEmail,
        customer_email: customerEmail,
        order_type: 'Quote Conversion',
        comment: `Ordre oprettet fra tilbud ${quoteNumber}: ${quote.title}`,
        price: quote.total_amount,
        status: 'Planlagt',
        priority: 'Normal',
        user_id: quote.user_id
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      // Continue anyway - quote is accepted even if order creation fails
    }

    // Update lead status to "lukket vundet" if quote has lead_id
    if (quote.lead_id) {
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'lukket vundet' })
        .eq('id', quote.lead_id);

      if (leadError) {
        console.error('Failed to update lead status:', leadError);
        // Continue anyway - quote acceptance is more important
      }
    }

    console.log(`Quote ${quoteNumber} successfully accepted and order created`);

    // Return success page
    return new Response(`
      <!DOCTYPE html>
      <html lang="da">
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tilbud Accepteret - MM Multipartner</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #10b981 0%, #059669 100%); min-height: 100vh; padding: 40px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
              .header { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; padding: 40px; text-align: center; }
              .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 12px; }
              .header p { font-size: 16px; opacity: 0.9; }
              .content { padding: 40px; text-align: center; }
              .success-icon { font-size: 64px; margin-bottom: 24px; }
              .quote-details { background: #f0fdf4; border: 2px solid #bbf7d0; padding: 24px; border-radius: 12px; margin: 24px 0; }
              .quote-details h3 { color: #166534; margin-bottom: 12px; }
              .quote-details p { color: #15803d; }
              .next-steps { background: #fffbeb; border: 2px solid #fbbf24; padding: 24px; border-radius: 12px; margin: 24px 0; }
              .next-steps h3 { color: #92400e; margin-bottom: 12px; }
              .next-steps p { color: #92400e; font-size: 14px; line-height: 1.6; }
              .contact-section { background: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; }
              .contact-btn { background: #4f46e5; color: white; padding: 16px 32px; border-radius: 30px; text-decoration: none; font-weight: 600; display: inline-block; margin: 12px; }
              .contact-btn:hover { background: #3730a3; }
              .footer { text-align: center; color: #6b7280; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🎉 Tillykke!</h1>
                  <p>Dit tilbud er blevet accepteret</p>
              </div>
              
              <div class="content">
                  <div class="success-icon">✅</div>
                  
                  <h2 style="color: #111827; margin-bottom: 16px;">Tak for din bestilling!</h2>
                  <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
                      Vi har modtaget din accept af tilbud ${quoteNumber} og er klar til at komme i gang.
                  </p>
                  
                  <div class="quote-details">
                      <h3>📋 Dine tilbudsdetaljer:</h3>
                      <p><strong>Tilbudsnummer:</strong> ${quoteNumber}</p>
                      <p><strong>Ydelse:</strong> ${quote.title}</p>
                      <p><strong>Beløb:</strong> ${quote.total_amount.toLocaleString('da-DK')} ${quote.currency}</p>
                  </div>
                  
                  <div class="next-steps">
                      <h3>🚀 Næste skridt:</h3>
                      <p>
                          Vi kontakter dig inden for 24 timer for at aftale tidspunkt og koordinere arbejdet. 
                          Du vil modtage en bekræftelse på email, og vi holder dig opdateret gennem hele processen.
                      </p>
                  </div>
                  
                  <div class="contact-section">
                      <h3 style="color: #374151; margin-bottom: 16px;">Har du spørgsmål?</h3>
                      <p style="color: #6b7280; margin-bottom: 16px;">Kontakt os direkte - vi er klar til at hjælpe!</p>
                      <a href="mailto:salg@mmmultipartner.dk" class="contact-btn">📧 Send Email</a>
                      <a href="tel:+45XXXXXXXX" class="contact-btn">📞 Ring til os</a>
                  </div>
                  
                  <div class="footer">
                      <p><strong>MM Multipartner</strong> - Din pålidelige partner inden for professionel rengøring</p>
                      <p style="margin-top: 8px;">salg@mmmultipartner.dk • www.mmmultipartner.dk</p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { "Content-Type": "text/html", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("Error confirming quote:", error);
    return new Response(`
      <!DOCTYPE html>
      <html lang="da">
      <head>
          <meta charset="utf-8">
          <title>Fejl - MM Multipartner</title>
          <style>
              body { font-family: Inter, sans-serif; background: #f9fafb; margin: 0; padding: 40px; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; text-align: center; }
              .error { color: #dc2626; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1 class="error">❌ Der opstod en fejl</h1>
              <p>Vi beklager, men der opstod en teknisk fejl. Kontakt os på salg@mmmultipartner.dk</p>
          </div>
      </body>
      </html>
    `, {
      status: 500,
      headers: { "Content-Type": "text/html", ...corsHeaders }
    });
  }
};

serve(handler);