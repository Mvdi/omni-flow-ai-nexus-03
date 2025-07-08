import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SupportTicket } from './useTickets';

/**
 * Real-time notifications for "Nyt svar" tickets and other critical updates
 */
export const useRealtimeTicketNotifications = () => {
  const [hasNewReplies, setHasNewReplies] = useState(false);
  const [newReplyCount, setNewReplyCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔔 Setting up real-time ticket notifications...');

    // Channel for ticket updates
    const ticketChannel = supabase
      .channel('ticket-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: 'status=eq.Nyt svar'
        },
        (payload) => {
          console.log('🔔 New ticket reply detected:', payload);
          
          const ticket = payload.new as SupportTicket;
          
          // Show notification
          toast({
            title: "🔔 Nyt kunde svar!",
            description: `${ticket.ticket_number}: ${ticket.subject}`,
            duration: 8000,
          });

          // Update state
          setHasNewReplies(true);
          setNewReplyCount(prev => prev + 1);

          // Play notification sound (browser permission required)
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFAlGn+DyvmAWAy2Py/HNeSsFJYDO8diOOAYYarntwpZIG');
            audio.volume = 0.3;
            audio.play().catch(() => {
              // Ignore audio errors (no permission)
            });
          } catch (error) {
            // Ignore audio errors
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: 'is_internal=eq.false'
        },
        (payload) => {
          console.log('🔔 New customer message detected:', payload);
          
          const message = payload.new;
          
          // Only notify for customer messages (not support replies)
          if (!message.sender_email?.includes('@mmmultipartner.dk')) {
            toast({
              title: "📧 Ny kunde besked",
              description: `Fra: ${message.sender_name || message.sender_email}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Ticket notifications channel status:', status);
      });

    return () => {
      console.log('🔔 Cleaning up ticket notifications...');
      supabase.removeChannel(ticketChannel);
    };
  }, [toast]);

  const clearNewReplies = () => {
    setHasNewReplies(false);
    setNewReplyCount(0);
  };

  return {
    hasNewReplies,
    newReplyCount,
    clearNewReplies
  };
};