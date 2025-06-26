
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TicketMessage } from './useTickets';

export const useTicketMessages = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async () => {
      console.log('Fetching messages for ticket:', ticketId);
      
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching ticket messages:', error);
        throw error;
      }
      
      console.log('Fetched messages:', data?.length || 0);
      return data as TicketMessage[];
    },
    enabled: !!ticketId,
    staleTime: 30000, // 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
