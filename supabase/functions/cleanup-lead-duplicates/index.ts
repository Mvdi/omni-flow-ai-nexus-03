import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Starting Facebook lead duplicate cleanup...');

    // Specific duplicate IDs to delete (newer duplicates, keeping the oldest)
    const duplicatesToDelete = [
      '6ebff3f8-86fa-42b5-9e44-b5fdaff710ed', // Karen Tambo duplicate
      'bb0728d4-26d7-4e6c-8b9c-560c782597cf', // Lenette Thomsen duplicate  
      '6dc40cd1-c1ac-4877-8092-aed481cf3cf6', // Lone Helboe duplicate
      '32f2b56a-e0bb-4065-99fb-215a60fcd42d', // Maria Bisgaard duplicate
      'ef6fe8cf-c3dd-481a-a3f0-a69b9449bbec', // Michael Furbo Koch duplicate
      'f1da5998-fae9-45b9-9af8-c96fac67d127', // Marianne Kyed Thøgersen duplicate
      '7c0c27ca-bcec-4eb1-85d4-d780f49d0331'  // Sanne Roed duplicate
    ];

    console.log(`Deleting ${duplicatesToDelete.length} duplicate Facebook leads...`);

    // Delete the duplicate leads
    const { data: deletedLeads, error: deleteError } = await supabase
      .from('leads')
      .delete()
      .in('id', duplicatesToDelete)
      .select('id, navn, email');

    if (deleteError) {
      console.error('Error deleting duplicates:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Successfully deleted ${deletedLeads?.length || 0} duplicate leads`);

    // Verify remaining leads
    const { data: remainingLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, navn, email, telefon, created_at')
      .eq('kilde', 'Facebook Lead')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching remaining leads:', fetchError);
    }

    const result = {
      success: true,
      deletedCount: deletedLeads?.length || 0,
      deletedLeads: deletedLeads,
      remainingCount: remainingLeads?.length || 0,
      remainingLeads: remainingLeads,
      message: `Successfully cleaned up ${deletedLeads?.length || 0} duplicate Facebook leads`
    };

    console.log('Cleanup result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in cleanup-lead-duplicates function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        deletedCount: 0
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
});
