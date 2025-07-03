import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { leadId } = await req.json()

    if (!leadId) {
      throw new Error('Lead ID is required')
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError) throw leadError

    // Simulate AI enrichment (in real implementation, this would call external APIs)
    const enrichedData: any = {}
    const enrichmentNotes: string[] = []

    // Email domain analysis
    if (lead.email) {
      const domain = lead.email.split('@')[1]
      if (domain) {
        enrichedData.email_domain = domain
        enrichmentNotes.push(`Email domæne identificeret: ${domain}`)
        
        // Company size estimation based on domain
        if (domain.includes('gmail.com') || domain.includes('hotmail.com')) {
          enrichedData.estimated_company_size = 'Freelancer/Enkeltmandsvirksomhed'
        } else {
          enrichedData.estimated_company_size = 'Virksomhed'
        }
      }
    }

    // Phone number analysis
    if (lead.telefon) {
      const phone = lead.telefon.replace(/\s/g, '')
      if (phone.startsWith('+45')) {
        enrichedData.country = 'Danmark'
        enrichmentNotes.push('Telefonnummer bekræftet som dansk')
      }
    }

    // Address validation
    if (lead.postnummer && lead.by) {
      enrichedData.address_complete = true
      enrichmentNotes.push('Komplet adresse tilgængelig')
    }

    // Company name analysis
    if (lead.virksomhed) {
      const companyName = lead.virksomhed.toLowerCase()
      if (companyName.includes('aps') || companyName.includes('a/s') || companyName.includes('as')) {
        enrichedData.company_type = 'Aktieselskab'
        enrichmentNotes.push('Virksomhedstype identificeret som aktieselskab')
      } else if (companyName.includes('aps') || companyName.includes('p/s')) {
        enrichedData.company_type = 'Anpartsselskab'
        enrichmentNotes.push('Virksomhedstype identificeret som anpartsselskab')
      } else {
        enrichedData.company_type = 'Enkeltmandsvirksomhed'
        enrichmentNotes.push('Virksomhedstype estimeret som enkeltmandsvirksomhed')
      }
    }

    // Value estimation if not provided
    if (!lead.vaerdi && enrichedData.estimated_company_size) {
      if (enrichedData.estimated_company_size === 'Virksomhed') {
        enrichedData.estimated_value = 75000
        enrichmentNotes.push('Værdi estimeret til 75.000 kr baseret på virksomhedstype')
      } else {
        enrichedData.estimated_value = 25000
        enrichmentNotes.push('Værdi estimeret til 25.000 kr baseret på virksomhedstype')
      }
    }

    // Update lead with enriched data
    const { error: updateError } = await supabaseClient
      .from('leads')
      .update({ 
        ai_enriched_data: enrichedData,
        ai_enrichment_notes: enrichmentNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        enrichedData,
        enrichmentNotes,
        message: `Lead beriget med ${enrichmentNotes.length} nye datapunkter`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 