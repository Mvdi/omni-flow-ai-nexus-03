import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TicketTag {
  id: string;
  tag_name: string;
  ticket_id: string | null;
  created_at: string | null;
}

export const useTicketTags = (ticketId: string) => {
  return useQuery({
    queryKey: ['ticket-tags', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_tags')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TicketTag[];
    },
    enabled: !!ticketId,
  });
};

export const useAddTicketTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, tagName }: { ticketId: string; tagName: string }) => {
      const { data, error } = await supabase
        .from('ticket_tags')
        .insert({
          ticket_id: ticketId,
          tag_name: tagName
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tags', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: "Tag tilføjet",
        description: "Tag er blevet tilføjet til ticketen.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke tilføje tag: " + error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRemoveTicketTag = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('ticket_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) throw error;
      return tagId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-tags'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: "Tag fjernet",
        description: "Tag er blevet fjernet fra ticketen.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke fjerne tag: " + error.message,
        variant: "destructive",
      });
    },
  });
};