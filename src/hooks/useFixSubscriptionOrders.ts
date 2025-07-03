import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFixSubscriptionOrders = () => {
  const fixSubscriptionOrders = async (subscriptionId: string) => {
    try {
      console.log('🔧 Fixing subscription orders for:', subscriptionId);
      
      // Get subscription details
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        toast.error('Kunne ikke finde abonnement');
        return false;
      }

      // CRITICAL: Only fix orders that don't have correct dates
      // Don't recreate orders that already have proper 8-week spacing
      const { data: existingOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('scheduled_date', { ascending: true });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        toast.error('Kunne ikke hente eksisterende ordrer');
        return false;
      }

      console.log('📋 Existing orders:', existingOrders?.length || 0);

      // Check if orders already have correct 8-week intervals
      if (existingOrders && existingOrders.length > 0) {
        const sortedOrders = existingOrders.sort((a, b) => 
          new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
        );

        let hasCorrectIntervals = true;
        for (let i = 1; i < sortedOrders.length; i++) {
          const prevDate = new Date(sortedOrders[i-1].scheduled_date);
          const currentDate = new Date(sortedOrders[i].scheduled_date);
          const daysDiff = Math.abs((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          const expectedDays = subscription.interval_weeks * 7;
          
          // Allow 1-2 days tolerance for weekends/holidays
          if (Math.abs(daysDiff - expectedDays) > 2) {
            hasCorrectIntervals = false;
            break;
          }
        }

        if (hasCorrectIntervals) {
          console.log('✅ Orders already have correct 8-week intervals');
          toast.success('Ordrer har allerede korrekte 8-ugers intervaller');
          return true;
        }
      }

      // Delete existing orders only if they don't have correct intervals
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('subscription_id', subscriptionId);

      if (deleteError) {
        console.error('Error deleting orders:', deleteError);
        toast.error('Kunne ikke slette eksisterende ordrer');
        return false;
      }

      console.log('✅ Deleted existing orders with incorrect intervals');

      // Create orders with correct 8-week intervals
      const orders = [];
      const startDate = new Date(subscription.start_date);

      // Create 4 orders with proper 8-week spacing
      for (let i = 0; i < 4; i++) {
        const orderDate = new Date(startDate);
        orderDate.setDate(startDate.getDate() + (subscription.interval_weeks * 7 * i));
        
        orders.push({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          order_type: subscription.service_type,
          customer: subscription.customer_name,
          customer_email: subscription.customer_email,
          price: subscription.price,
          scheduled_date: orderDate.toISOString().split('T')[0],
          status: 'Ikke planlagt',
          comment: `Abonnement (${i === 0 ? 'start' : 'fremtidig'}): ${subscription.description || subscription.service_type}`,
          address: subscription.customer_address,
          priority: 'Normal',
          estimated_duration: subscription.estimated_duration
        });
      }

      // Insert new orders with correct intervals
      const { error: insertError } = await supabase
        .from('orders')
        .insert(orders);

      if (insertError) {
        console.error('Error inserting orders:', insertError);
        toast.error('Kunne ikke oprette nye ordrer');
        return false;
      }

      console.log(`✅ Created ${orders.length} orders with correct 8-week intervals`);
      toast.success(`Oprettede ${orders.length} ordrer med korrekte 8-ugers intervaller`);
      
      return true;

    } catch (error) {
      console.error('Error fixing subscription orders:', error);
      toast.error('Fejl ved rettelse af abonnement ordrer');
      return false;
    }
  };

  return { fixSubscriptionOrders };
};