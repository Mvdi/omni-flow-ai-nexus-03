import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  email: string;
  navn: string | null;
  telefon: string | null;
  adresse: string | null;
  postnummer: string | null;
  by: string | null;
  cvr: string | null;
  virksomhedsnavn: string | null;
  kundetype: 'Ny' | 'Eksisterende';
  noter: string | null;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerStats {
  totalTickets: number;
  resolvedTickets: number;
  averageResponseTime: string;
  successRate: number;
  score: number;
  kundetype: string;
}

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Customer[];
    },
  });
};

export const useCustomerSidebarData = (email: string) => {
  return useQuery({
    queryKey: ['customer-sidebar', email],
    queryFn: async () => {
      // Fetch customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (customerError) throw customerError;

      if (!customer) {
        return {
          customer: null,
          stats: null,
          recentTickets: []
        };
      }

      // Fetch all tickets for this customer
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });
      if (ticketsError) throw ticketsError;

      // Stats calculation (should match 'seneste tickets')
      const totalTickets = tickets.length;
      const resolvedTickets = tickets.filter(t => t.status === 'Løst' || t.status === 'Lukket').length;
      const successRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
      const responseTimes = tickets
        .filter(t => t.response_time_hours !== null)
        .map(t => t.response_time_hours!);
      const avgResponseTime = responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : '0';
      // Recent tickets (last 10)
      const recentTickets = tickets.slice(0, 10);

      return {
        customer,
        stats: {
          totalTickets,
          resolvedTickets,
          averageResponseTime: `${avgResponseTime}h`,
          successRate,
          score: customer.score,
          kundetype: customer.kundetype
        },
        recentTickets
      };
    },
    enabled: !!email,
  });
};

export const useCustomer = (email: string) => {
  return useQuery({
    queryKey: ['customer', email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!email,
  });
};

export const useCustomerStats = (email: string) => {
  return useQuery({
    queryKey: ['customer-stats', email],
    queryFn: async () => {
      // Get customer data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();
      
      if (customerError) throw customerError;

      // Get all tickets for this customer
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false });
      
      if (ticketsError) throw ticketsError;

      const totalTickets = tickets.length;
      const resolvedTickets = tickets.filter(t => t.status === 'Løst' || t.status === 'Lukket').length;
      const successRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;

      // Calculate average response time
      const responseTimes = tickets
        .filter(t => t.response_time_hours !== null)
        .map(t => t.response_time_hours!);
      
      const avgResponseTime = responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : '0';

      return {
        totalTickets,
        resolvedTickets,
        averageResponseTime: `${avgResponseTime}h`,
        successRate,
        score: customer.score,
        kundetype: customer.kundetype
      } as CustomerStats;
    },
    enabled: !!email,
  });
};

export const useCustomerTickets = (email: string) => {
  return useQuery({
    queryKey: ['customer-tickets', email],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
        .limit(10); // Get last 10 tickets
      
      if (error) throw error;
      return data;
    },
    enabled: !!email,
  });
};

export const useCreateOrUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customerData: Partial<Customer> & { email: string }) => {
      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', customerData.email)
        .single();

      if (existingCustomer) {
        // Update existing customer
        const { data, error } = await supabase
          .from('customers')
          .update({
            ...customerData,
            updated_at: new Date().toISOString()
          })
          .eq('email', customerData.email)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert({
            ...customerData,
            kundetype: 'Ny',
            score: 0
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-sidebar', variables.email] });
      toast({
        title: "Kunde opdateret",
        description: "Kundeoplysninger er blevet gemt.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke opdatere kunde: " + error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCustomerNotes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, noter }: { email: string; noter: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update({ 
          noter,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-sidebar', variables.email] });
      toast({
        title: "Noter gemt",
        description: "Kundenotater er blevet opdateret.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme noter: " + error.message,
        variant: "destructive",
      });
    },
  });
}; 