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
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Load the logo from public folder and upload to storage
    const logoResponse = await fetch('https://tckynbgheicyqezqprdp.supabase.co/mm-multipartner-logo.png');
    if (!logoResponse.ok) {
      throw new Error('Failed to fetch logo');
    }
    
    const logoArrayBuffer = await logoResponse.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload('mm-multipartner-logo.png', logoArrayBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Logo uploaded successfully',
      path: data.path
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error uploading logo:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Upload failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});