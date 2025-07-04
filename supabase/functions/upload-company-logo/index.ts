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
    
    const { imageData } = await req.json();
    
    if (!imageData) {
      throw new Error("No image data provided");
    }
    
    // Convert base64 to blob
    const base64Data = imageData.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    
    console.log('📤 Uploading logo to storage, size:', byteArray.length);
    
    const { data, error } = await supabase.storage
      .from('company-assets')
      .upload('mm-multipartner-logo.png', byteArray, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    console.log('✅ Logo uploaded successfully:', data.path);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Logo uploaded successfully to storage',
      path: data.path,
      url: `${supabaseUrl}/storage/v1/object/public/company-assets/mm-multipartner-logo.png`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Upload failed', 
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});