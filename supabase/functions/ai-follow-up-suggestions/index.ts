import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

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

    // Get all leads
    const { data: leads, error: leadsError } = await supabaseClient
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false })

    if (leadsError) throw leadsError

    const suggestions = []

    // Analyze leads for follow-up suggestions
    for (const lead of leads) {
      const lastContact = lead.sidste_kontakt ? new Date(lead.sidste_kontakt) : null
      const daysSinceContact = lastContact ? Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : null

      // High priority leads without recent contact
      if (lead.prioritet === 'Høj' && (!lastContact || daysSinceContact > 3)) {
        suggestions.push({
          leadId: lead.id,
          leadName: lead.navn,
          type: 'high_priority_followup',
          priority: 'Høj',
          message: `Høj prioritet lead "${lead.navn}" har ikke været kontaktet i ${daysSinceContact || 'lang'} tid`,
          action: 'Kontakt omgående',
          estimatedValue: lead.vaerdi || 'Ikke angivet'
        })
      }

      // Qualified leads in proposal stage
      if (lead.status === 'proposal' && (!lastContact || daysSinceContact > 5)) {
        suggestions.push({
          leadId: lead.id,
          leadName: lead.navn,
          type: 'proposal_followup',
          priority: 'Medium',
          message: `Tilbud sendt til "${lead.navn}" - følg op på feedback`,
          action: 'Spørg om feedback på tilbud',
          estimatedValue: lead.vaerdi || 'Ikke angivet'
        })
      }

      // New leads without contact
      if (lead.status === 'new' && !lastContact) {
        suggestions.push({
          leadId: lead.id,
          leadName: lead.navn,
          type: 'initial_contact',
          priority: 'Medium',
          message: `Nyt lead "${lead.navn}" venter på første kontakt`,
          action: 'Gennemfør første opkald/email',
          estimatedValue: lead.vaerdi || 'Ikke angivet'
        })
      }

      // Negotiation stage leads
      if (lead.status === 'negotiation' && (!lastContact || daysSinceContact > 2)) {
        suggestions.push({
          leadId: lead.id,
          leadName: lead.navn,
          type: 'negotiation_followup',
          priority: 'Høj',
          message: `Forhandling med "${lead.navn}" - aktiv opfølgning påkrævet`,
          action: 'Kontakt for at fremskynde beslutning',
          estimatedValue: lead.vaerdi || 'Ikke angivet'
        })
      }
    }

    // Sort by priority and estimated value
    suggestions.sort((a, b) => {
      const priorityOrder = { 'Høj': 3, 'Medium': 2, 'Lav': 1 }
      const aPriority = priorityOrder[a.priority] || 0
      const bPriority = priorityOrder[b.priority] || 0
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // If same priority, sort by estimated value
      const aValue = typeof a.estimatedValue === 'number' ? a.estimatedValue : 0
      const bValue = typeof b.estimatedValue === 'number' ? b.estimatedValue : 0
      return bValue - aValue
    })

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: suggestions.slice(0, 10), // Top 10 suggestions
        totalLeads: leads.length,
        message: `${suggestions.length} opfølgning forslag genereret`
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