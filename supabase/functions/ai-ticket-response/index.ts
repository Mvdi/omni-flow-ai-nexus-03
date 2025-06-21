
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketContent, customerHistory, priority } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `Du er en professionel dansk kundeservice assistent. Analyser support ticketen og kundens historik for at give et hjælpsomt, venligt og professionelt svar på dansk.

Retningslinjer:
- Skriv altid på dansk
- Vær venlig og professionel
- Giv konkrete løsningsforslag
- Bed om mere information hvis nødvendigt
- Henvis til relevante ressourcer hvis det er passende
- Hold svaret kort men informativt (max 200 ord)
- Tilpas tonen baseret på problemets prioritet (${priority})
- Brug korrekt formatering med linjeskift og afsnit
- Undgå markdown formatering som ** eller __ - skriv kun almindelig tekst
- Strukturer svaret med nummererede punkter eller korte afsnit for læsbarhed`;

    const userPrompt = `Support ticket indhold:
${ticketContent}

Kundehistorik:
${customerHistory || 'Ingen tidligere historik tilgængelig'}

Generer et passende svar på denne support henvendelse. Sørg for at svaret er korrekt formateret med passende linjeskift og afsnit.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-ticket-response function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
