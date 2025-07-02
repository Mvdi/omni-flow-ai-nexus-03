import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    console.error('Missing OpenAI API key');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { originalText, context, tone = 'professional' } = await req.json();

    if (!originalText) {
      throw new Error('Original text is required');
    }

    console.log('Improving response with AI...', { originalText: originalText.substring(0, 100), tone });

    const systemPrompt = `Du er en AI-assistent der hjælper med at forbedre kundeservice-svar.

    Din opgave er at forbedre det givne svar så det bliver:
    - Mere professionelt og høfligt på dansk
    - Klart og forståeligt
    - Passende i tone (${tone})
    - Hjælpsomt og løsningsorienteret
    - Grammatisk korrekt
    - Tilpasset den specifikke kunde og situation

    VIGTIGE REGLER: 
    - Forbedre KUN selve beskedteksten - ALDRIG inkluder signatur, hilsner eller afslutninger
    - INGEN "Med venlig hilsen", "Mvh", navne, stillinger eller virksomhedsnavne
    - Svaret skal slutte direkte efter den faktiske besked
    - Behold den oprindelige betydning og information
    - Forbedre kun sproget - IKKE opfinde nyt indhold
    - Gør svaret mere personligt og relevant til den specifikke ticket

    Svar kun med den forbedrede beskedtekst, ingen signatur eller hilsner.`;

    const userPrompt = `Kontekst: ${context || 'Kundeservice svar'}

    Oprindeligt svar:
    ${originalText}

    Forbedre dette svar til at være mere professionelt og hjælpsomt:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to improve response');
    }

    const data = await response.json();
    const improvedText = data.choices[0].message.content;

    console.log('Response improved successfully');

    return new Response(
      JSON.stringify({ improvedText }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-response-improver function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});