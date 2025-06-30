import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

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
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      console.log('Fetching tickets...');
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching tickets:', error);
        throw error;
      }
      
      console.log(`Fetched ${data?.length || 0} tickets`);
      return data as SupportTicket[];
    },
    staleTime: 30000, // Reduceret til 30 sekunder for hurtigere opdateringer
    refetchInterval: false, // Fjern polling - brug kun real-time
  });

  // Optimeret real-time subscription
  useEffect(() => {
    console.log('Setting up optimized real-time ticket subscription...');
    
    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          console.log('Real-time ticket update received:', payload.eventType, payload.new?.ticket_number);
          
          // Invalidate både tickets og dashboard queries for at sikre konsistens
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] });
          
          // Hvis det er en ny ticket, vis toast
          if (payload.eventType === 'INSERT' && payload.new) {
            console.log('Ny ticket oprettet:', payload.new.ticket_number);
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up optimized real-time ticket subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
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
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
    mutationFn: async (ticket: {
      subject: string;
      content: string | null;
      customer_email: string;
      customer_name: string | null;
      priority: 'Høj' | 'Medium' | 'Lav';
      status: 'Åben' | 'I gang' | 'Afventer kunde' | 'Løst' | 'Lukket';
      assignee_id: string | null;
    }) => {
      // Always upsert customer (create if not exists, update if exists)
      await supabase
        .from('customers')
        .upsert({
          email: ticket.customer_email,
          navn: ticket.customer_name
        }, { onConflict: 'email', ignoreDuplicates: true });

      // Then create the ticket
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          ...ticket,
          ticket_number: '' // This will trigger the database function to generate a ticket number
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
