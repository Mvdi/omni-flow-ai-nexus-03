import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration');
      return new Response(JSON.stringify({ error: "Server configuration error" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Keatech token from secrets
    const { data: secrets, error } = await supabase
      .from('integration_secrets')
      .select('key_value')
      .eq('provider', 'keatech')
      .eq('key_name', 'api_token')
      .single();

    if (error || !secrets) {
      console.error('❌ Keatech token not found');
      return new Response(JSON.stringify({ error: "Keatech token not configured" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    return new Response(JSON.stringify({ 
      token: secrets.key_value 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Get Keatech token failed:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      timestamp: new Date().toISOString()
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});