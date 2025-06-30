
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/hooks/useLeads';

export const useLeadToOrderConversion = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lead: Lead) => {
      console.log('Converting lead to order:', lead.id);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // First, create the order from lead data
      const orderData = {
        customer: lead.navn,
        customer_email: lead.email,
        order_type: 'Konvertering fra Lead', // Default order type for converted leads
        address: lead.adresse || '',
        price: lead.vaerdi || 0,
        priority: lead.prioritet || 'Normal', // Use lead priority or default
        estimated_duration: 120, // Default 2 hours
        comment: `Konverteret fra lead: ${lead.noter || 'Ingen noter'}`,
        status: 'Ikke planlagt',
        scheduled_date: null,
        scheduled_time: null,
        scheduled_week: null,
        latitude: null,
        longitude: null,
        bfe_number: '',
        user_id: user.id // Fix: Add required user_id
      };

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      console.log('Order created successfully:', order.id);

      // Update lead status to closed-won
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          status: 'closed-won',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (leadError) {
        console.error('Error updating lead status:', leadError);
        throw leadError;
      }

      console.log('Lead status updated to closed-won');

      return { order, leadId: lead.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      
      toast({
        title: "Lead konverteret til ordre",
        description: `Lead er blevet konverteret til ordre og fjernet fra aktive leads.`,
      });
    },
    onError: (error: any) => {
      console.error('Lead to order conversion failed:', error);
      toast({
        title: "Konvertering fejlede",
        description: "Kunne ikke konvertere lead til ordre: " + error.message,
        variant: "destructive",
      });
    },
  });
};
