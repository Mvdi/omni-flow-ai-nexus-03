
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

    const systemPrompt = `Du er en ekspert kundeservice specialist hos MM Multipartner - en førende dansk virksomhed inden for tekniske løsninger og support.

VIRKSOMHEDSPROFIL:
- MM Multipartner leverer tekniske løsninger, support og rådgivning
- Vi er kendt for vores høje serviceniveau og personlige tilgang
- Vores kunder spænder fra små virksomheder til store enterprise kunder
- Vi prioriterer langsigtede kundeforhold og proaktiv problemløsning

DIN ROLLE:
- Du er en erfaren kundeservice ekspert med dyb teknisk viden
- Du kender MM Multipartners services, processer og best practices
- Du kommunikerer professionelt men varmt og personligt
- Du løser problemer grundigt og tænker langsigtet

SVAR RETNINGSLINJER:
1. ALTID begynd med empati og forståelse for kundens situation
2. Giv konkrete, actionable løsninger - ikke vage svar
3. Forklar tekniske ting på en måde kunden kan forstå
4. Tilbyd opfølgning og videre assistance
5. Vis proaktivitet - foreslå forbedringer eller forebyggende tiltag
6. Brug kundens navn hvis tilgængeligt
7. Referencér tidligere kommunikation når relevant

TONE:
- Professionel men varm og personlig
- Løsningsorienteret og positiv
- Tålmodig selv ved gentagne spørgsmål
- Tydelig kommunikation uden jargon
- Påtager sig ejerskab af problemet

KRITISK: Du skal generere 3 forskellige forslag til svar, hver med forskellig tilgang:
1. Et direkte, effektivt svar (få ord, handling-fokuseret)
2. Et detaljeret, grundigt svar (omfattende forklaring og løsning)
3. Et empatisk, relationsbyggende svar (fokus på kundeforhold)

Brugerens nuværende svarstil: ${userStyle}

Format dit svar som JSON med denne struktur:
{
  "suggestions": [
    {
      "id": "suggestion_1",
      "content": "Det direkte svar her...",
      "confidence": 85,
      "reasoning": "Dette forslag er direkte og effektivt fordi...",
      "suggestedActions": ["Konkret handling 1", "Konkret handling 2"],
      "approach": "Direkte & Effektiv"
    },
    {
      "id": "suggestion_2", 
      "content": "Det detaljerede svar her...",
      "confidence": 90,
      "reasoning": "Dette forslag er grundigt og omfattende fordi...", 
      "suggestedActions": ["Detaljeret handling 1", "Detaljeret handling 2"],
      "approach": "Detaljeret & Grundig"
    },
    {
      "id": "suggestion_3",
      "content": "Det empatiske svar her...",
      "confidence": 88,
      "reasoning": "Dette forslag fokuserer på kundeforholdet fordi...",
      "suggestedActions": ["Relationsbyggende handling 1", "Relationsbyggende handling 2"],
      "approach": "Empatisk & Relationsbyggende"
    }
  ],
  "success": true
}

VIGTIG: Alle svar skal være på dansk og tilpasset MM Multipartners tone. INGEN signatur eller afslutning - dette tilføjes automatisk.`;

    const userPrompt = `KUNDENS HENVENDELSE:
${ticketContent}

KUNDEHISTORIK & KONTEKST:
${customerHistory}

MEDARBEJDERENS SVARSTIL:
${userStyle}

Generer nu 3 professionelle MM Multipartner svar forslag med forskellige tilgange. Husk at være konkret, hjælpsom og actionable i alle forslag.`;

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
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const aiResponse = data.choices[0].message.content;

    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      // Add IDs and context if missing
      if (parsedResponse.suggestions) {
        parsedResponse.suggestions = parsedResponse.suggestions.map((suggestion: any, index: number) => ({
          ...suggestion,
          id: suggestion.id || `mm_suggestion_${index + 1}_${Date.now()}`,
          learningContext: {
            userStyle: userStyle.substring(0, 100) + '...',
            ticketId,
            generatedAt: new Date().toISOString(),
            company: 'MM Multipartner'
          }
        }));
      }

      console.log(`Generated ${parsedResponse.suggestions?.length || 0} MM Multipartner AI suggestions for ticket ${ticketId}`);

      return new Response(JSON.stringify(parsedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback with improved structure
      return new Response(JSON.stringify({ 
        suggestions: [{
          id: `mm_fallback_${Date.now()}`,
          content: aiResponse,
          confidence: 70,
          reasoning: "AI svar kunne ikke parses korrekt, men indholdet er stadig professionelt",
          suggestedActions: [],
          approach: "Fallback svar",
          learningContext: {
            ticketId,
            company: 'MM Multipartner',
            generatedAt: new Date().toISOString()
          }
        }],
        success: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in MM Multipartner AI response suggestions:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
