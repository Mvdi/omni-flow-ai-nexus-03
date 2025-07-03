import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useLeadQuotes = (leadId: string) => {
  return useQuery({
    queryKey: ['lead-quotes', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!leadId,
  });
};

export const useLeadQuotesByEmail = (email: string) => {
  return useQuery({
    queryKey: ['lead-quotes-email', email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!email,
  });
};