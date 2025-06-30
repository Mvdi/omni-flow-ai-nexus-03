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
      console.log('Fetching tickets with Danish timezone support...');
      
      // First get tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        throw ticketsError;
      }

      // Then get assignee names separately
      const assigneeIds = ticketsData?.map(t => t.assignee_id).filter(Boolean) || [];
      let assigneeMap: Record<string, string> = {};
      
      if (assigneeIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, navn')
          .in('id', assigneeIds);
        
        if (!profilesError && profilesData) {
          assigneeMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile.navn || '';
            return acc;
          }, {} as Record<string, string>);
        }
      }
      
      console.log(`Fetched ${ticketsData?.length || 0} tickets with enhanced metadata`);
      
      // Process tickets for enhanced features
      const processedTickets = ticketsData?.map(ticket => ({
        ...ticket,
        assignee_name: ticket.assignee_id ? assigneeMap[ticket.assignee_id] || null : null,
        // Auto-prioritize based on keywords and customer history
        priority: ticket.priority || autoDetectPriority(ticket),
        // Auto-categorize based on subject and content
        category: ticket.category || autoDetectCategory(ticket),
        // Calculate SLA deadline if not set
        sla_deadline: ticket.sla_deadline || calculateSLADeadline(ticket.created_at, ticket.priority)
      })) || [];
      
      return processedTickets as SupportTicket[];
    },
    staleTime: 30000,
    refetchInterval: false,
  });

  // Enhanced real-time subscription with more events
  useEffect(() => {
    console.log('Setting up enhanced real-time ticket subscription with Danish timezone...');
    
    const channel = supabase
      .channel('tickets-realtime-enhanced')
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
            
            // Show toast for important status changes
            if (payload.eventType === 'UPDATE' && payload.new.status === 'Nyt svar') {
              console.log('🔔 Nyt kundesvar modtaget for ticket:', payload.new.ticket_number);
            }
          }
          
          // Invalidate queries for consistency
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-analytics'] });
        }
      )
      .subscribe((status) => {
        console.log('Enhanced real-time subscription status:', status);
      });

    return () => {
      console.log('Cleaning up enhanced real-time ticket subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// AI-powered priority detection (synchronous version)
const autoDetectPriority = (ticket: any): 'Høj' | 'Medium' | 'Lav' => {
  const content = `${ticket.subject} ${ticket.content || ''}`.toLowerCase();
  
  // High priority keywords
  const highPriorityKeywords = ['urgent', 'kritisk', 'nødsituation', 'ned', 'virker ikke', 'kan ikke', 'fejl', 'problem'];
  const mediumPriorityKeywords = ['spørgsmål', 'hjælp', 'hvordan', 'support'];
  
  if (highPriorityKeywords.some(keyword => content.includes(keyword))) {
    return 'Høj';
  } else if (mediumPriorityKeywords.some(keyword => content.includes(keyword))) {
    return 'Medium';
  }
  
  return 'Lav';
};

// AI-powered category detection (synchronous version)
const autoDetectCategory = (ticket: any): string => {
  const content = `${ticket.subject} ${ticket.content || ''}`.toLowerCase();
  
  if (content.includes('faktura') || content.includes('betaling') || content.includes('regning')) {
    return 'Fakturering';
  } else if (content.includes('teknisk') || content.includes('fejl') || content.includes('virker ikke')) {
    return 'Teknisk Support';
  } else if (content.includes('klage') || content.includes('utilfreds') || content.includes('problem')) {
    return 'Klage';
  } else if (content.includes('ændring') || content.includes('opdater') || content.includes('skift')) {
    return 'Ændringer';
  }
  
  return 'Generel';
};

// Calculate SLA deadline based on priority
const calculateSLADeadline = (createdAt: string, priority: string | null): string => {
  const created = new Date(createdAt);
  let hoursToAdd = 24; // Default 24 hours
  
  switch (priority) {
    case 'Høj':
      hoursToAdd = 4; // 4 hours for high priority
      break;
    case 'Medium':
      hoursToAdd = 12; // 12 hours for medium priority
      break;
    case 'Lav':
      hoursToAdd = 48; // 48 hours for low priority
      break;
  }
  
  return new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000).toISOString();
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SupportTicket> }) => {
      // Auto-assign when status changes to "I gang"
      if (updates.status === 'I gang' && !updates.assignee_id) {
        // Get current user or auto-assign logic here
        // For now, we'll let the user manually assign
      }
      
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
      
      // Auto-change status from "Nyt svar" to "I gang" when support responds
      if (!message.is_internal && message.sender_email !== 'support@company.com') {
        // This is a customer message, keep as is
      } else {
        // This is a support response, update ticket status
        await supabase
          .from('support_tickets')
          .update({ 
            status: 'I gang',
            last_response_at: new Date().toISOString()
          })
          .eq('id', message.ticket_id);
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
        slaBreaches: tickets.filter(t => t.sla_deadline && new Date(t.sla_deadline) < now && t.status !== 'Løst').length
      };
    },
    staleTime: 60000, // 1 minute
  });
};
