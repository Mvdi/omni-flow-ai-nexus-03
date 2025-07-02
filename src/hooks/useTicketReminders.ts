import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TicketReminder {
  id: string;
  ticket_id: string;
  remind_at: string;
  reminder_text: string;
  is_completed: boolean;
  created_at: string;
  user_id: string;
}

export const useTicketReminders = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-reminders', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_reminders')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('is_completed', false)
        .order('remind_at', { ascending: true });
      
      if (error) throw error;
      return data as TicketReminder[];
    },
    enabled: !!ticketId,
  });
};

export const useAddTicketReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, remindAt, reminderText }: { 
      ticketId: string; 
      remindAt: string; 
      reminderText: string 
    }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ticket_reminders')
        .insert({
          ticket_id: ticketId,
          remind_at: remindAt,
          reminder_text: reminderText,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-reminders', variables.ticketId] });
      toast({
        title: "Påmindelse oprettet",
        description: "Din påmindelse er blevet oprettet.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette påmindelse: " + error.message,
        variant: "destructive",
      });
    },
  });
};

export const useCompleteReminder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (reminderId: string) => {
      const { data, error } = await supabase
        .from('ticket_reminders')
        .update({ is_completed: true })
        .eq('id', reminderId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-reminders'] });
      toast({
        title: "Påmindelse afsluttet",
        description: "Påmindelsen er markeret som afsluttet.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke afslutte påmindelse: " + error.message,
        variant: "destructive",
      });
    },
  });
};