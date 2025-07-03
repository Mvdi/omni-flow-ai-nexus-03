
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
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

    // REVOLUTIONIZED: Intelligent context understanding
    const systemPrompt = `Du er en ekspert kundeservice medarbejder hos MM Multipartner. 

KRITISK: LÆS HELE KUNDENS BESKED NØJE!

VIGTIGE REGLER:
- Analyser HELE kundens besked fra start til slut
- Identificer ALLE kundeønsker og anmodninger
- Vær særligt opmærksom på:
  * Bestillinger (f.eks. "jeg vil gerne bestille", "nu vil jeg gerne have")
  * Serviceønsker (vinduespudsning, rengøring, etc.)
  * Spørgsmål om produkter/services
  * Klager eller problemer
  * Test-relaterede beskeder vs. rigtige anmodninger

KONTEKST-ANALYSE:
- Hvis kunden nævner "test" OG derefter noget konkret (bestilling, service) - fokuser på det konkrete
- Hvis kunden siger "nu vil jeg gerne..." - det er en REEL anmodning, ikke test
- Separer mellem test-aktivitet og faktiske kundeønsker
- Prioriter kundens seneste/konkrete anmodning højest

SVAR TILGANG:
- Anerkend ALLE dele af kundens besked
- Adresser kundens konkrete ønsker direkte
- Vær professionel og hjælpsom

Generer 3 forskellige svar:
1. HURTIG: Direkte adressering af kundens konkrete anmodning
2. GRUNDIG: Omfattende svar der dækker alle aspekter af beskeden
3. VENLIG: Personlig tilgang der anerkender både test-delen og den konkrete anmodning

Format som JSON med denne struktur:
{
  "suggestions": [
    {
      "id": "hurtig_1",
      "content": "Hej\\n\\nTak for feedback om testen. Vedrørende din anmodning om vinduespudsning...\\n\\nBedste hilsner",
      "confidence": 85,
      "reasoning": "Direkte fokus på kundens konkrete anmodning",
      "suggestedActions": ["Behandl bestilling", "Send tilbud"],
      "approach": "Hurtig & Direkte"
    },
    {
      "id": "grundig_2", 
      "content": "Hej\\n\\nTak for din positive feedback om systemtesten. Jeg er glad for at høre, at det fungerede godt. Vedrørende din anmodning om vinduespudsning...\\n\\nBedste hilsner",
      "confidence": 90,
      "reasoning": "Adresserer både test-feedback og konkret anmodning", 
      "suggestedActions": ["Anerkend test-feedback", "Proces service-anmodning"],
      "approach": "Grundig & Detaljeret"
    },
    {
      "id": "venlig_3",
      "content": "Hej\\n\\nDet er fantastisk at høre, at systemtesten gik så godt! Tak for din feedback. Jeg kan se, at du nu gerne vil bestille en vinduespudsning...\\n\\nHav en god dag",
      "confidence": 88,
      "reasoning": "Personlig tilgang der anerkender begge dele",
      "suggestedActions": ["Fejr test-succes", "Håndter service-anmodning"],
      "approach": "Venlig & Personlig"
    }
  ],
  "success": true
}

KRITISK: Brug \\n for linjeskift. Fokuser på kundens KONKRETE anmodninger, ikke kun på første del af beskeden.`;

    const userPrompt = `KUNDENS KOMPLETTE BESKED (analyser HELE beskeden nøje):
${ticketContent}

KUNDE INFO:
${customerHistory}

KRITISK INSTRUKTION: 
- Læs HELE kundens besked fra start til slut
- Identificer ALLE kundeønsker (især bestillinger, serviceønsker)
- Hvis kunden nævner både "test" og "bestilling/service" - fokuser på den konkrete anmodning
- Svar på kundens FAKTISKE ønsker, ikke kun på første del af beskeden

Skriv 3 intelligente, kontekst-bevidste svar på dansk.`;

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
        temperature: 0.3, // Lower for more consistent context understanding
        max_tokens: 1200,
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
          id: suggestion.id || `mm_intelligent_${index + 1}_${Date.now()}`,
          learningContext: {
            userStyle: 'Revolutionized context understanding',
            ticketId,
            generatedAt: new Date().toISOString(),
            company: 'MM Multipartner',
            contextAnalysis: 'Full message analysis with concrete request identification'
          }
        }));
      }

      console.log(`Generated ${parsedResponse.suggestions?.length || 0} INTELLIGENT MM AI suggestions for ticket ${ticketId}`);

      return new Response(JSON.stringify(parsedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback with improved structure
      return new Response(JSON.stringify({ 
        suggestions: [{
          id: `mm_fallback_${Date.now()}`,
          content: aiResponse.replace(/\n/g, '\\n'),
          confidence: 70,
          reasoning: "Fallback intelligent response",
          suggestedActions: ["Analyser kundens anmodning"],
          approach: "Intelligent Fallback",
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
    console.error('Error in INTELLIGENT MM AI response suggestions:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
