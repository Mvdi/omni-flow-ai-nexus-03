import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendQuoteRequest {
  to: string;
  customerName: string;
  quoteNumber: string;
  quoteHtml: string;
  subject: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, customerName, quoteNumber, quoteHtml, subject }: SendQuoteRequest = await req.json();

    console.log(`Sending quote ${quoteNumber} to ${to} via Office365`);

    // Use the existing Office365 email integration
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: emailResponse, error } = await supabase.functions.invoke('office365-send-email', {
      body: {
        to: [to],
        subject: subject || `Tilbud ${quoteNumber} fra MM Multipartner`,
        htmlContent: quoteHtml,
        fromAddress: 'salg@mmmultipartner.dk' // Alle tilbud sendes fra salg@mmmultipartner.dk
      }
    });

    if (error) {
      console.error("Error sending quote email via Office365:", error);
      throw error;
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
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);