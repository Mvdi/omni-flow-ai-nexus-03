
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
  priority: 'Høj' | 'Medium' | 'Lav' | null;
  status: 'Åben' | 'I gang' | 'Afventer kunde' | 'Løst' | 'Lukket' | 'Nyt svar';
  assignee_id: string | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  last_response_at: string | null;
  response_time_hours: number | null;
  category?: string | null;
  tags?: string[] | null;
  customer_sentiment?: 'positive' | 'neutral' | 'negative' | null;
  sla_deadline?: string | null;
  auto_assigned?: boolean;
  escalated?: boolean;
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
      
      // Process tickets without async operations
      const processedTickets = data?.map(ticket => ({
        ...ticket,
        assignee_name: null, // Will be populated separately if needed
      })) || [];
      
      return processedTickets as SupportTicket[];
    },
    staleTime: 30000,
    refetchInterval: false,
  });

  // Real-time subscription
  useEffect(() => {
    console.log('Setting up real-time ticket subscription...');
    
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
          console.log('Real-time ticket update received:', payload.eventType);
          
          if (payload.new && typeof payload.new === 'object' && 'ticket_number' in payload.new) {
            console.log('Ticket:', payload.new.ticket_number, 'Status:', payload.new.status);
          }
          
          // Invalidate queries for consistency
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-analytics'] });
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time ticket subscription...');
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
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      // Enhanced success messages
      let message = "Ticket opdateret succesfuldt";
      if (variables.updates.status === 'I gang') {
        message = "Ticket sat i gang";
      } else if (variables.updates.status === 'Løst') {
        message = "Ticket markeret som løst";
      }
      
      toast({
        title: message,
        description: `Ticket ${data.ticket_number} er blevet opdateret.`,
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
      priority: 'Høj' | 'Medium' | 'Lav' | null;
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

// KRITISK FIX: Forbedret addTicketMessage med korrekt "Nyt svar" logik
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
      
      // KRITISK: Kun kundesvar skal sætte status til "Nyt svar"
      // Tjek om det er en kunde der sender beskeden
      const isCustomerMessage = !message.sender_email.includes('@mmmultipartner.dk');
      
      console.log('Message sender:', message.sender_email, 'Is customer:', isCustomerMessage);
      
      if (isCustomerMessage) {
        // Dette er et kundesvar - sæt status til "Nyt svar"
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({ 
            status: 'Nyt svar',
            last_response_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', message.ticket_id);
        
        if (updateError) {
          console.error('Failed to update ticket status to "Nyt svar":', updateError);
        } else {
          console.log('Customer reply received - ticket status set to "Nyt svar"');
        }
      } else {
        // Dette er et support svar - opdater kun last_response_at, IKKE status
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({ 
            last_response_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', message.ticket_id);
        
        if (updateError) {
          console.error('Failed to update last_response_at:', updateError);
        } else {
          console.log('Support reply sent - only updated last_response_at');
        }
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', variables.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
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

// New hook for ticket analytics
export const useTicketAnalytics = () => {
  return useQuery({
    queryKey: ['ticket-analytics'],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*');
      
      if (error) throw error;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      return {
        totalTickets: tickets.length,
        newToday: tickets.filter(t => new Date(t.created_at) >= today).length,
        newThisWeek: tickets.filter(t => new Date(t.created_at) >= thisWeek).length,
        newThisMonth: tickets.filter(t => new Date(t.created_at) >= thisMonth).length,
        avgResponseTime: tickets.reduce((acc, t) => acc + (t.response_time_hours || 0), 0) / tickets.length,
        satisfactionScore: 4.2, // Mock data - would come from customer feedback
        slaBreaches: 0 // Simplified for now
      };
    },
    staleTime: 60000, // 1 minute
  });
};
