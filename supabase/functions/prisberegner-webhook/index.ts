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

    // Extract data from webhook payload (tagbehandling data)
    const {
      navn,
      email,
      telefon,
      adresse,
      interval,
      vedligeholdelse,
      beregnet_pris,
      form_source = 'Prisberegner Widget'
    } = webhookData;

    if (!email || !navn) {
      throw new Error('Missing required fields: email and navn');
    }

    // Calculate numeric price value
    const numericPrice = parseInt(beregnet_pris?.replace(/[^\d]/g, '') || '0') || 0;
    const serviceDescription = `Algebehandling af tag - ${interval}${vedligeholdelse ? ' + Vedligeholdelsesaftale' : ''}`;

    // Insert into tilbud table first
    const { error: tilbudError } = await supabase
      .from('tilbud')
      .insert({
        navn,
        adresse,
        telefon,
        email,
        interval,
        vedligeholdelse,
        beregnet_pris
      });

    if (tilbudError) {
      console.error('Error inserting tilbud:', tilbudError);
      // Don't throw error, continue to create lead
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
          noter: `Prisberegning: ${serviceDescription}, beregnet pris: ${beregnet_pris}`,
          vaerdi: numericPrice,
          services: serviceDescription,
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
          message: 'Tak! Vi har modtaget din forespørgsel og vender tilbage hurtigst muligt.',
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
        navn,
        email,
        telefon: telefon || null,
        adresse: adresse || null,
        services: serviceDescription,
        vaerdi: numericPrice,
        status: 'new',
        kilde: form_source,
        prioritet: numericPrice && numericPrice > 5000 ? 'medium' : 'low',
        noter: `Prisberegning fra widget: ${interval}, vedligeholdelse: ${vedligeholdelse ? 'Ja' : 'Nej'}, beregnet pris: ${beregnet_pris}`,
        sidste_kontakt: `Prisberegner besøg: ${new Date().toISOString()}`,
        ai_enriched_data: {
          source: 'prisberegner_widget',
          estimated_price: numericPrice,
          service_requested: serviceDescription,
          interval: interval,
          maintenance: vedligeholdelse,
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