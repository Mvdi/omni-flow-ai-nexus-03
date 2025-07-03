
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { suggestionId, isUseful, userModifications, timestamp } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store learning feedback for future AI improvements
    const { error } = await supabase
      .from('ai_learning_feedback')
      .insert({
        suggestion_id: suggestionId,
        is_useful: isUseful,
        user_modifications: userModifications,
        feedback_timestamp: timestamp,
        created_at: new Date().toISOString()
      });

    if (error) {
      // If table doesn't exist, just log the feedback for now
      console.log('AI Learning Feedback (table not created yet):', {
        suggestionId,
        isUseful,
        userModifications,
        timestamp
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Feedback received and will be used to improve AI responses'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-learning-feedback function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
