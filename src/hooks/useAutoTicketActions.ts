
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Hook for automated ticket actions and monitoring
export const useAutoTicketActions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Set up real-time monitoring for automated actions
    console.log('Setting up automated ticket action monitoring...');
    
    const channel = supabase
      .channel('auto-ticket-actions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets'
        },
        (payload) => {
          if (payload.new && payload.old) {
            const newTicket = payload.new as any;
            const oldTicket = payload.old as any;
            
            // Monitor status changes to "Nyt svar"
            if (newTicket.status === 'Nyt svar' && oldTicket.status !== 'Nyt svar') {
              console.log(`🔔 New customer reply detected for ticket ${newTicket.ticket_number}`);
              
              toast({
                title: "Nyt kundesvar",
                description: `Ticket ${newTicket.ticket_number} har fået et nyt svar fra kunden`,
                duration: 5000,
              });
              
              // Could trigger additional automation here:
              // - Send notification to assigned user
              // - Update priority if needed
              // - Log in activity feed
            }
            
            // Monitor SLA breaches
            if (newTicket.sla_deadline && new Date(newTicket.sla_deadline) < new Date() && 
                newTicket.status !== 'Løst' && newTicket.status !== 'Lukket') {
              console.log(`⚠️ SLA breach detected for ticket ${newTicket.ticket_number}`);
              
              toast({
                title: "SLA Brudt",
                description: `Ticket ${newTicket.ticket_number} har overskredet SLA deadline`,
                variant: "destructive",
                duration: 10000,
              });
            }
            
            // Monitor ticket assignments
            if (newTicket.assignee_id !== oldTicket.assignee_id && newTicket.assignee_id) {
              console.log(`👤 Ticket ${newTicket.ticket_number} assigned to user ${newTicket.assignee_id}`);
            }
          }
          
          // Refresh queries
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-analytics'] });
        }
      )
      .subscribe((status) => {
        console.log('Auto-actions subscription status:', status);
      });

    return () => {
      console.log('Cleaning up auto-actions subscription...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Auto-close resolved tickets after 7 days
  const autoCloseResolvedTickets = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .update({ 
          status: 'Lukket',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'Løst')
        .lt('updated_at', sevenDaysAgo.toISOString())
        .select();
      
      if (error) {
        console.error('Error auto-closing tickets:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`Auto-closed ${data.length} resolved tickets`);
        toast({
          title: "Automatisk lukning",
          description: `${data.length} løste tickets er blevet automatisk lukket`,
        });
        
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }
    } catch (error) {
      console.error('Error in auto-close function:', error);
    }
  };

  // Smart assignment based on workload and expertise
  const smartAssignTicket = async (ticketId: string, category: string) => {
    try {
      // This would typically query for available agents, their current workload,
      // and their expertise areas to make an intelligent assignment
      console.log(`Smart assignment requested for ticket ${ticketId} with category ${category}`);
      
      // Mock implementation - in real system this would:
      // 1. Query available agents
      // 2. Check their current ticket load
      // 3. Match expertise areas
      // 4. Consider timezone and availability
      // 5. Make optimal assignment
      
    } catch (error) {
      console.error('Error in smart assignment:', error);
    }
  };

  return {
    autoCloseResolvedTickets,
    smartAssignTicket
  };
};
