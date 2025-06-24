import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Get support tickets for this lead
    const { data: tickets } = await supabaseClient
      .from('support_tickets')
      .select('*')
      .eq('customer_email', lead.email)

    // AI Lead Scoring Logic
    let score = 0
    const factors = []

    // Company size factor (if available)
    if (lead.virksomhed) {
      score += 20
      factors.push('Virksomhed identificeret (+20)')
    }

    // Contact information completeness
    if (lead.email && lead.telefon) {
      score += 15
      factors.push('Komplet kontaktinfo (+15)')
    } else if (lead.email || lead.telefon) {
      score += 8
      factors.push('Delvis kontaktinfo (+8)')
    }

    // Value factor
    if (lead.vaerdi && lead.vaerdi > 100000) {
      score += 25
      factors.push('Høj værdi lead (+25)')
    } else if (lead.vaerdi && lead.vaerdi > 50000) {
      score += 15
      factors.push('Medium værdi lead (+15)')
    } else if (lead.vaerdi) {
      score += 5
      factors.push('Lav værdi lead (+5)')
    }

    // Support history factor
    if (tickets && tickets.length > 0) {
      const activeTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress')
      if (activeTickets.length === 0) {
        score += 10
        factors.push('Tidligere kunde, ingen aktive tickets (+10)')
      } else {
        score -= 5
        factors.push('Aktive support tickets (-5)')
      }
    }

    // Priority factor
    if (lead.prioritet === 'Høj') {
      score += 10
      factors.push('Høj prioritet (+10)')
    } else if (lead.prioritet === 'Medium') {
      score += 5
      factors.push('Medium prioritet (+5)')
    }

    // Status factor
    if (lead.status === 'qualified') {
      score += 15
      factors.push('Kvalificeret lead (+15)')
    } else if (lead.status === 'proposal') {
      score += 20
      factors.push('Tilbud sendt (+20)')
    } else if (lead.status === 'negotiation') {
      score += 25
      factors.push('I forhandling (+25)')
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score))

    // Determine score category
    let category = 'Lav'
    if (score >= 70) category = 'Høj'
    else if (score >= 40) category = 'Medium'

    // Update lead with score
    const { error: updateError } = await supabaseClient
      .from('leads')
      .update({ 
        ai_score: score,
        ai_score_factors: factors,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        score,
        category,
        factors,
        message: `Lead scoret til ${score}/100 (${category})`
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