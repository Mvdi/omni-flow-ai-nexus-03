
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  content: string | null;
  customer_email: string;
  customer_name: string | null;
  priority: 'Høj' | 'Medium' | 'Lav';
  status: 'Åben' | 'I gang' | 'Afventer kunde' | 'Løst' | 'Lukket';
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  last_response_at: string | null;
  response_time_hours: number | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_email: string;
  sender_name: string | null;
  message_content: string;
  is_internal: boolean;
  is_ai_generated: boolean;
  created_at: string;
  attachments: any[];
}

export const useTickets = () => {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SupportTicket[];
    },
  });
};

export const useTicketMessages = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-messages', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TicketMessage[];
    },
    enabled: !!ticketId,
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupportTicket> }) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: "Ticket opdateret",
        description: "Ticket er blevet opdateret succesfuldt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere ticket: " + error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAddTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticket: Omit<SupportTicket, 'id' | 'ticket_number' | 'created_at' | 'updated_at' | 'last_response_at' | 'response_time_hours'>) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert(ticket)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: "Ticket oprettet",
        description: "Den nye ticket er blevet oprettet succesfuldt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette ticket: " + error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAddTicketMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (message: Omit<TicketMessage, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert(message)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', variables.ticket_id] });
      toast({
        title: "Besked sendt",
        description: "Din besked er blevet tilføjet til ticketen.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke sende besked: " + error.message,
        variant: "destructive",
      });
    },
  });
};
