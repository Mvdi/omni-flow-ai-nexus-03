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

      // Delete existing orders
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('subscription_id', subscriptionId);

      if (deleteError) {
        console.error('Error deleting orders:', deleteError);
        toast.error('Kunne ikke slette eksisterende ordrer');
        return false;
      }

      console.log('✅ Deleted existing orders');

      // Create orders with correct 8-week intervals
      const orders = [];
      const startDate = new Date(subscription.start_date);

      // Start order
      orders.push({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        order_type: subscription.service_type,
        customer: subscription.customer_name,
        customer_email: subscription.customer_email,
        price: subscription.price,
        scheduled_date: startDate.toISOString().split('T')[0],
        status: 'Ikke planlagt',
        comment: `Abonnement (start): ${subscription.description || subscription.service_type}`,
        address: subscription.customer_address,
        priority: 'Normal',
        estimated_duration: subscription.estimated_duration
      });

      // Future orders - each 8 weeks apart
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(startDate);
        futureDate.setDate(startDate.getDate() + (subscription.interval_weeks * 7 * i));
        
        orders.push({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          order_type: subscription.service_type,
          customer: subscription.customer_name,
          customer_email: subscription.customer_email,
          price: subscription.price,
          scheduled_date: futureDate.toISOString().split('T')[0],
          status: 'Ikke planlagt',
          comment: `Abonnement (fremtidig): ${subscription.description || subscription.service_type}`,
          address: subscription.customer_address,
          priority: 'Normal',
          estimated_duration: subscription.estimated_duration
        });
      }

      // Insert new orders
      const { error: insertError } = await supabase
        .from('orders')
        .insert(orders);

      if (insertError) {
        console.error('Error inserting orders:', insertError);
        toast.error('Kunne ikke oprette nye ordrer');
        return false;
      }

      console.log(`✅ Created ${orders.length} orders with correct intervals`);
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