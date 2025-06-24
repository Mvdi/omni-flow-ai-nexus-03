import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type Lead = Database['public']['Tables']['leads']['Row'];
export type LeadInsert = Database['public']['Tables']['leads']['Insert'];
export type LeadUpdate = Database['public']['Tables']['leads']['Update'];

export const useLeads = () => {
  return useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });
};

export const useLead = (id: string) => {
  return useQuery<Lead>({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!id,
  });
};

export const useCreateOrUpdateLead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lead: LeadInsert & { id?: string } | (Partial<LeadUpdate> & { id: string })) => {
      if ('id' in lead && lead.id) {
        // Update
        const { id, ...updates } = lead;
        const { data, error } = await supabase
          .from('leads')
          .update({ ...(updates as Partial<LeadUpdate>), updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Create
        const { data, error } = await supabase
          .from('leads')
          .insert(lead as LeadInsert)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead gemt', description: 'Lead er blevet oprettet/opdateret.' });
    },
    onError: (error: any) => {
      toast({ title: 'Fejl', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead slettet', description: 'Lead er blevet slettet.' });
    },
    onError: (error: any) => {
      toast({ title: 'Fejl', description: error.message, variant: 'destructive' });
    },
  });
};

// Hent support tickets for et lead (via email)
export const useLeadSupportTickets = (email: string) => {
  return useQuery({
    queryKey: ['lead-support-tickets', email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!email,
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Lead['status'] }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: "Status opdateret",
        description: "Lead status er blevet opdateret.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere status: " + error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateLastContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sidste_kontakt }: { id: string; sidste_kontakt: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          sidste_kontakt,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: "Kontakt opdateret",
        description: "Sidste kontakt er blevet opdateret.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere kontakt: " + error.message,
        variant: "destructive",
      });
    },
  });
};

// AI Automation Functions
export const useAILeadScoring = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadId: string) => {
      // Call AI function to score lead
      const { data, error } = await supabase.functions.invoke('ai-lead-scoring', {
        body: { leadId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "AI Scoring gennemført",
        description: "Lead er blevet scoret baseret på AI analyse.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI Scoring fejlede",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAILeadEnrichment = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-lead-enrichment', {
        body: { leadId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Data berigelse gennemført",
        description: "Lead data er blevet beriget med AI.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Data berigelse fejlede",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAIFollowUpSuggestions = () => {
  return useQuery({
    queryKey: ['ai-follow-up-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-follow-up-suggestions', {
        body: {}
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAILeadRouting = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-lead-routing', {
        body: { leadId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "AI Routing gennemført",
        description: "Lead er blevet routet til bedste sælger.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI Routing fejlede",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useAICustomerInsights = (leadId: string) => {
  return useQuery({
    queryKey: ['ai-customer-insights', leadId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-customer-insights', {
        body: { leadId }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useAISupportTicketAnalysis = (leadId: string) => {
  return useQuery({
    queryKey: ['ai-support-ticket-analysis', leadId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-support-ticket-analysis', {
        body: { leadId }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Analytics and Insights - Disabled until functions are created
// export const useLeadAnalytics = () => {
//   return useQuery({
//     queryKey: ['lead-analytics'],
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .rpc('get_lead_analytics');
//       
//       if (error) throw error;
//       return data;
//     },
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   });
// };

// export const useLeadConversionRate = () => {
//   return useQuery({
//     queryKey: ['lead-conversion-rate'],
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .rpc('get_lead_conversion_rate');
//       
//       if (error) throw error;
//       return data;
//     },
//     staleTime: 10 * 60 * 1000, // 10 minutes
//   });
// }; 