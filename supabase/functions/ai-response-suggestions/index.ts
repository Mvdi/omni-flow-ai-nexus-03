
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
    const { ticketContent, customerHistory, userStyle, ticketId } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const systemPrompt = `Du er en avanceret AI assistent der hjælper kundeservice medarbejdere med at generere personaliserede svar.

KRITISK: Du skal generere 3 forskellige forslag til svar, hver med forskellig tilgang:
1. Et kort og direkte svar
2. Et detaljeret og omfattende svar  
3. Et empatisk og personligt svar

Retningslinjer:
- Skriv altid på dansk
- Tilpas tonen til brugerens stil: ${userStyle}
- Giv konkrete løsningsforslag
- Bed om mere information hvis nødvendigt
- Hold hvert svar professionelt men tilpasset kundens behov
- INGEN signatur eller afslutning som 'Venlig hilsen' - dette tilføjes automatisk
- Generer også confidence score (0-100) for hvor sikker AI'en er på svaret
- Forklar reasoning bag hvert forslag

Format dit svar som JSON med denne struktur:
{
  "suggestions": [
    {
      "id": "suggestion_1",
      "content": "Det korte svar her...",
      "confidence": 85,
      "reasoning": "Dette forslag er kort og direkte fordi...",
      "suggestedActions": ["action1", "action2"]
    },
    ...
  ],
  "success": true
}`;

    const userPrompt = `Support ticket indhold:
${ticketContent}

Kundehistorik:
${customerHistory}

Brugerens stil der skal matches:
${userStyle}

Generer 3 forskellige forslag til svar på denne support henvendelse med varierende tilgange (kort/detaljeret/empatisk).`;

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
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const aiResponse = data.choices[0].message.content;

    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      // Add IDs if missing
      if (parsedResponse.suggestions) {
        parsedResponse.suggestions = parsedResponse.suggestions.map((suggestion: any, index: number) => ({
          ...suggestion,
          id: suggestion.id || `suggestion_${index + 1}_${Date.now()}`,
          learningContext: {
            userStyle: userStyle.substring(0, 100) + '...',
            ticketId,
            generatedAt: new Date().toISOString()
          }
        }));
      }

      return new Response(JSON.stringify(parsedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return new Response(JSON.stringify({ 
        suggestions: [{
          id: `fallback_${Date.now()}`,
          content: aiResponse,
          confidence: 70,
          reasoning: "AI svar kunne ikke parses korrekt, men indholdet er stadig brugbart",
          suggestedActions: []
        }],
        success: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in ai-response-suggestions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
