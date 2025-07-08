import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to ensure all tickets have corresponding ticket_messages
 * This fixes the critical issue where tickets exist without messages
 */
export const useTicketMessageEnsurer = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const ensureTicketMessages = async () => {
    setIsProcessing(true);
    
    try {
      console.log('🔧 Starting ticket message ensuring process...');
      
      // Find tickets without corresponding messages
      const { data: ticketsWithoutMessages, error: queryError } = await supabase
        .from('support_tickets')
        .select(`
          id, ticket_number, subject, content, customer_email, customer_name, 
          created_at, email_message_id, mailbox_address
        `)
        .is('id', null)  // This is a trick to get all tickets, we'll filter in JS
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      if (!ticketsWithoutMessages || ticketsWithoutMessages.length === 0) {
        toast({
          title: "Ingen tickets fundet",
          description: "Der er ingen tickets at behandle.",
        });
        return;
      }

      console.log(`Found ${ticketsWithoutMessages.length} tickets to check`);

      // Check which tickets are missing messages
      const missingMessages = [];
      
      for (const ticket of ticketsWithoutMessages) {
        const { data: existingMessages } = await supabase
          .from('ticket_messages')
          .select('id')
          .eq('ticket_id', ticket.id)
          .limit(1);

        if (!existingMessages || existingMessages.length === 0) {
          missingMessages.push(ticket);
        }
      }

      console.log(`Found ${missingMessages.length} tickets missing messages`);

      if (missingMessages.length === 0) {
        toast({
          title: "Alle tickets har beskeder",
          description: "Ingen tickets mangler ticket_messages.",
        });
        return;
      }

      // Create missing ticket messages
      const messagesToInsert = missingMessages.map(ticket => ({
        ticket_id: ticket.id,
        sender_email: ticket.customer_email,
        sender_name: ticket.customer_name || ticket.customer_email,
        message_content: ticket.content || 'Automatisk oprettet besked fra ticket content',
        message_type: 'inbound_email',
        is_internal: false,
        is_ai_generated: false,
        email_message_id: ticket.email_message_id,
        created_at: ticket.created_at, // Use ticket creation time
        attachments: []
      }));

      const { data: insertedMessages, error: insertError } = await supabase
        .from('ticket_messages')
        .insert(messagesToInsert)
        .select('id, ticket_id');

      if (insertError) {
        throw insertError;
      }

      console.log(`✅ Successfully created ${insertedMessages?.length || 0} missing ticket messages`);

      toast({
        title: "Ticket beskeder oprettet",
        description: `${insertedMessages?.length || 0} manglende ticket beskeder blev oprettet.`,
      });

      return insertedMessages;

    } catch (error: any) {
      console.error('Failed to ensure ticket messages:', error);
      toast({
        title: "Fejl ved oprettelse af ticket beskeder",
        description: error.message || "Kunne ikke oprette manglende ticket beskeder.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    ensureTicketMessages,
    isProcessing
  };
};