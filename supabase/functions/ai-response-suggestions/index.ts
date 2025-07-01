
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

    // REVOLUTIONIZED: Much shorter, natural Danish prompt
    const systemPrompt = `Du er en hjælpsom kundeservice medarbejder hos MM Multipartner. 

VIGTIGE REGLER:
- Skriv naturligt dansk - ikke robot-sprog
- Vær direkte og hjælpsom
- Fokuser kun på det konkrete problem
- Undgå generiske fraser som "jeg sætter pris på" eller "hvis du har brug for hjælp"
- Vær professionel men ikke stiv

Generer 3 forskellige svar:
1. HURTIG: Kort, direkte løsning
2. GRUNDIG: Detaljeret forklaring og løsning  
3. VENLIG: Mere personlig tilgang

Format som JSON med denne struktur:
{
  "suggestions": [
    {
      "id": "hurtig_1",
      "content": "Hej\\n\\nSelvfølgelig kan jeg hjælpe med det...\\n\\nBedste hilsner",
      "confidence": 85,
      "reasoning": "Kort beskrivelse af hvorfor",
      "suggestedActions": ["Handling 1", "Handling 2"],
      "approach": "Hurtig & Direkte"
    },
    {
      "id": "grundig_2", 
      "content": "Hej\\n\\nJeg har kigget på dit problem...\\n\\nBedste hilsner",
      "confidence": 90,
      "reasoning": "Grundig forklaring hvorfor", 
      "suggestedActions": ["Detaljeret handling 1"],
      "approach": "Grundig & Detaljeret"
    },
    {
      "id": "venlig_3",
      "content": "Hej\\n\\nTak for din henvendelse...\\n\\nHav en god dag",
      "confidence": 88,
      "reasoning": "Personlig tilgang fordi",
      "suggestedActions": ["Personlig handling"],
      "approach": "Venlig & Personlig"
    }
  ],
  "success": true
}

KRITISK: Brug \\n for linjeskift. Ingen signatur - tilføjes automatisk.`;

    const userPrompt = `KUNDENS PROBLEM:
${ticketContent}

KUNDE INFO:
${customerHistory}

Skriv 3 naturlige, hjælpsomme svar på dansk. Vær konkret og fokuseret på problemet.`;

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
        temperature: 0.5, // Reduced from 0.7 for faster, more consistent responses
        max_tokens: 1000, // Reduced from 2000 for faster generation
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
            userStyle: 'Optimized for speed and naturalness',
            ticketId,
            generatedAt: new Date().toISOString(),
            company: 'MM Multipartner'
          }
        }));
      }

      console.log(`Generated ${parsedResponse.suggestions?.length || 0} fast MM AI suggestions for ticket ${ticketId}`);

      return new Response(JSON.stringify(parsedResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback with improved structure
      return new Response(JSON.stringify({ 
        suggestions: [{
          id: `mm_fallback_${Date.now()}`,
          content: aiResponse.replace(/\n/g, '\\n'), // Preserve line breaks
          confidence: 70,
          reasoning: "Fallback svar",
          suggestedActions: [],
          approach: "Standard",
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
    console.error('Error in MM AI response suggestions:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
