import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = await req.json();
    console.log('Received prisberegner webhook:', webhookData);

    // Extract data from webhook payload
    const {
      name,
      email,
      phone,
      address,
      service_type,
      estimated_price,
      additional_info,
      form_source = 'Prisberegner'
    } = webhookData;

    if (!email || !name) {
      throw new Error('Missing required fields: email and name');
    }

    // Check if lead already exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .single();

    if (existingLead) {
      console.log('Lead already exists, updating with new info');
      
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          sidste_kontakt: `Prisberegner besøg: ${new Date().toISOString()}`,
          noter: additional_info ? `Prisberegner: ${additional_info}` : null,
          vaerdi: estimated_price || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating existing lead:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Existing lead updated',
          leadId: existingLead.id 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create new lead
    const { data: newLead, error: createError } = await supabase
      .from('leads')
      .insert({
        navn: name,
        email: email,
        telefon: phone || null,
        adresse: address || null,
        services: service_type || null,
        vaerdi: estimated_price || null,
        status: 'new',
        kilde: form_source,
        prioritet: estimated_price && estimated_price > 5000 ? 'Medium' : 'Lav',
        noter: additional_info || null,
        sidste_kontakt: `Prisberegner besøg: ${new Date().toISOString()}`,
        ai_enriched_data: {
          source: 'prisberegner',
          estimated_price: estimated_price,
          service_requested: service_type,
          form_data: webhookData
        }
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating lead:', createError);
      throw createError;
    }

    console.log('New lead created successfully:', newLead.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead created successfully',
        leadId: newLead.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in prisberegner-webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});