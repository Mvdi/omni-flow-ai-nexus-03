import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting duplicate cleanup...');

    // First, let's identify duplicates
    const { data: duplicates, error: selectError } = await supabase
      .from('ticket_messages')
      .select('id, ticket_id, sender_email, message_content, created_at')
      .order('created_at', { ascending: true });

    if (selectError) {
      console.error('Error fetching messages:', selectError);
      throw selectError;
    }

    console.log(`Found ${duplicates?.length} total messages`);

    // Group messages by ticket_id, sender_email, and message_content
    const messageGroups = new Map();
    
    duplicates?.forEach(msg => {
      const key = `${msg.ticket_id}-${msg.sender_email}-${msg.message_content.substring(0, 100)}`;
      if (!messageGroups.has(key)) {
        messageGroups.set(key, []);
      }
      messageGroups.get(key).push(msg);
    });

    // Find IDs to delete (keep earliest, delete rest)
    const idsToDelete = [];
    messageGroups.forEach(messages => {
      if (messages.length > 1) {
        // Sort by created_at and keep the first one
        messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        // Add all but the first to deletion list
        for (let i = 1; i < messages.length; i++) {
          idsToDelete.push(messages[i].id);
        }
      }
    });

    console.log(`Found ${idsToDelete.length} duplicate messages to delete`);

    if (idsToDelete.length > 0) {
      // Delete duplicates in batches
      const batchSize = 100;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error: deleteError } = await supabase
          .from('ticket_messages')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error('Error deleting batch:', deleteError);
          throw deleteError;
        }
      }
    }

    console.log('Duplicate cleanup completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount: idsToDelete.length,
        message: `Deleted ${idsToDelete.length} duplicate messages` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in cleanup-duplicates function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
