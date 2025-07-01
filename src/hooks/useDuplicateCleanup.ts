import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDuplicateCleanup = () => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const { toast } = useToast();

  const cleanupDuplicateMessages = async () => {
    setIsCleaningUp(true);
    try {
      console.log('🧹 Starting duplicate message cleanup...');

      // First, identify potential duplicates based on content similarity and time proximity
      const { data: messages, error: fetchError } = await supabase
        .from('ticket_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch messages: ${fetchError.message}`);
      }

      if (!messages || messages.length === 0) {
        toast({
          title: "Ingen beskeder fundet",
          description: "Der er ingen beskeder at rydde op i.",
        });
        return;
      }

      // Group messages by ticket and sender to find duplicates
      const duplicateGroups = new Map<string, any[]>();
      
      messages.forEach(message => {
        const contentKey = message.message_content
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase()
          .substring(0, 200);
        
        const groupKey = `${message.ticket_id}|${message.sender_email}|${contentKey}`;
        
        if (!duplicateGroups.has(groupKey)) {
          duplicateGroups.set(groupKey, []);
        }
        duplicateGroups.get(groupKey)!.push(message);
      });

      // Find groups with more than one message (potential duplicates)
      const duplicatesToDelete: string[] = [];
      let duplicateCount = 0;

      duplicateGroups.forEach((group) => {
        if (group.length > 1) {
          // Sort by creation time and keep the first one, mark others for deletion
          group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          // Check if messages are within 10 minutes of each other
          for (let i = 1; i < group.length; i++) {
            const timeDiff = Math.abs(
              new Date(group[i].created_at).getTime() - 
              new Date(group[0].created_at).getTime()
            );
            
            if (timeDiff < 10 * 60 * 1000) { // Within 10 minutes
              duplicatesToDelete.push(group[i].id);
              duplicateCount++;
            }
          }
        }
      });

      if (duplicatesToDelete.length === 0) {
        toast({
          title: "Ingen duplikater fundet",
          description: "Der blev ikke fundet duplikerede beskeder at fjerne.",
        });
        return;
      }

      console.log(`Found ${duplicatesToDelete.length} duplicate messages to delete`);

      // Delete duplicates in batches
      const batchSize = 50;
      for (let i = 0; i < duplicatesToDelete.length; i += batchSize) {
        const batch = duplicatesToDelete.slice(i, i + batchSize);
        
        const { error: deleteError } = await supabase
          .from('ticket_messages')
          .delete()
          .in('id', batch);

        if (deleteError) {
          console.error('Error deleting batch:', deleteError);
          throw new Error(`Failed to delete duplicates: ${deleteError.message}`);
        }
      }

      // Log cleanup activity
      await supabase
        .from('email_sync_log')
        .insert({
          mailbox_address: 'CLEANUP_DUPLICATES',
          status: 'completed',
          emails_processed: duplicateCount,
          errors_count: 0,
          error_details: `Cleaned up ${duplicateCount} duplicate messages`,
          sync_started_at: new Date().toISOString(),
          sync_completed_at: new Date().toISOString()
        });

      toast({
        title: "Oprydning gennemført",
        description: `${duplicateCount} duplikerede beskeder blev fjernet.`,
      });

      console.log(`✅ Cleanup completed: ${duplicateCount} duplicates removed`);

    } catch (error: any) {
      console.error('Failed to cleanup duplicates:', error);
      toast({
        title: "Oprydning fejlede",
        description: error.message || "Kunne ikke fjerne duplikerede beskeder.",
        variant: "destructive",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return {
    cleanupDuplicateMessages,
    isCleaningUp
  };
};
