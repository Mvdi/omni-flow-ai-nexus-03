import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Subscription {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  service_type: string;
  interval_weeks: number;
  price: number;
  estimated_duration: number;
  description?: string;
  notes?: string;
  images: string[];
  status: 'active' | 'paused' | 'cancelled';
  start_date: string;
  last_order_date?: string;
  next_due_date: string;
  auto_create_orders: boolean;
  send_notifications: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateSubscriptionData {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_address?: string;
  service_type: string;
  interval_weeks: number;
  price: number;
  estimated_duration: number;
  description?: string;
  notes?: string;
  images?: string[];
  start_date: string;
  auto_create_orders?: boolean;
  send_notifications?: boolean;
  status?: 'active' | 'paused' | 'cancelled';
}

export const useSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSubscriptions = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching subscriptions for user:', user.id);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subscriptions:', error);
        toast.error('Kunne ikke hente abonnementer');
        return;
      }

      console.log('Subscriptions fetched successfully:', data);
      setSubscriptions((data || []).map(sub => ({
        ...sub,
        images: Array.isArray(sub.images) ? sub.images.filter((img): img is string => typeof img === 'string') : [],
        status: sub.status as 'active' | 'paused' | 'cancelled'
      })));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Kunne ikke hente abonnementer');
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (subscriptionData: CreateSubscriptionData) => {
    if (!user) {
      toast.error('Du skal være logget ind for at oprette et abonnement');
      return null;
    }

    try {
      console.log('Creating subscription:', subscriptionData);
      
      // Calculate next due date based on start date and interval
      const startDate = new Date(subscriptionData.start_date);
      const nextDueDate = new Date(startDate);
      nextDueDate.setDate(nextDueDate.getDate() + (subscriptionData.interval_weeks * 7));
      
      const cleanSubscriptionData = {
        ...subscriptionData,
        next_due_date: nextDueDate.toISOString().split('T')[0],
        user_id: user.id,
        images: subscriptionData.images || [],
        auto_create_orders: subscriptionData.auto_create_orders ?? true,
        send_notifications: subscriptionData.send_notifications ?? true,
      };
      
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([cleanSubscriptionData])
        .select()
        .single();

      if (error) {
        console.error('Error creating subscription:', error);
        toast.error('Kunne ikke oprette abonnement');
        return null;
      }

      console.log('Subscription created successfully:', data);
      
      // Automatically create orders for the subscription
      await createOrdersForSubscription(data);
      
      toast.success('Abonnement oprettet');
      await fetchSubscriptions();
      return data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Kunne ikke oprette abonnement');
      return null;
    }
  };

  const updateSubscription = async (id: string, subscriptionData: Partial<CreateSubscriptionData>) => {
    if (!user) {
      toast.error('Du skal være logget ind for at opdatere et abonnement');
      return null;
    }

    try {
      console.log('Updating subscription:', id, subscriptionData);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating subscription:', error);
        toast.error('Kunne ikke opdatere abonnement');
        return null;
      }

      console.log('Subscription updated successfully:', data);
      toast.success('Abonnement opdateret');
      await fetchSubscriptions();
      return data;
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Kunne ikke opdatere abonnement');
      return null;
    }
  };

  const cancelSubscription = async (id: string) => {
    if (!user) {
      toast.error('Du skal være logget ind for at opsige et abonnement');
      return false;
    }

    try {
      console.log('Cancelling subscription:', id);
      
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling subscription:', error);
        toast.error('Kunne ikke opsige abonnement');
        return false;
      }

      console.log('Subscription cancelled successfully:', data);
      toast.success('Abonnement opsagt');
      await fetchSubscriptions();
      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Kunne ikke opsige abonnement');
      return false;
    }
  };

  const pauseSubscription = async (id: string) => {
    return await updateSubscription(id, { status: 'paused' });
  };

  const resumeSubscription = async (id: string) => {
    return await updateSubscription(id, { status: 'active' });
  };

  const createOrderFromSubscription = async (subscriptionId: string, scheduledDate?: string) => {
    if (!user) {
      toast.error('Du skal være logget ind for at oprette en ordre');
      return null;
    }

    try {
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (!subscription) {
        toast.error('Abonnement ikke fundet');
        return null;
      }

      const orderData = {
        subscription_id: subscriptionId,
        order_type: subscription.service_type,
        customer: subscription.customer_name,
        customer_email: subscription.customer_email,
        price: subscription.price,
        scheduled_date: scheduledDate || subscription.next_due_date,
        status: 'Ikke planlagt',
        comment: `Abonnement: ${subscription.description}${subscription.notes ? '\nNoter: ' + subscription.notes : ''}`,
        address: subscription.customer_address,
        priority: 'Normal',
        estimated_duration: subscription.estimated_duration,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) {
        console.error('Error creating order from subscription:', error);
        toast.error('Kunne ikke oprette ordre fra abonnement');
        return null;
      }

      console.log('Order created from subscription:', data);
      toast.success('Ordre oprettet fra abonnement');
      return data;
    } catch (error) {
      console.error('Error creating order from subscription:', error);
      toast.error('Kunne ikke oprette ordre fra abonnement');
      return null;
    }
  };

  const createOrdersForSubscription = async (subscription: any) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Create order for start date if it's today or in the future
      if (subscription.start_date >= today) {
        const orderData = {
          subscription_id: subscription.id,
          order_type: subscription.service_type,
          customer: subscription.customer_name,
          customer_email: subscription.customer_email,
          price: subscription.price,
          scheduled_date: subscription.start_date,
          status: 'Ikke planlagt',
          comment: `Abonnement (start): ${subscription.description || subscription.service_type}${subscription.notes ? '\nNoter: ' + subscription.notes : ''}`,
          address: subscription.customer_address,
          priority: 'Normal',
          estimated_duration: subscription.estimated_duration,
          user_id: user.id
        };

        const { error: orderError } = await supabase
          .from('orders')
          .insert([orderData]);

        if (orderError) {
          console.error('Error creating start order:', orderError);
        } else {
          console.log('Created start order for subscription');
        }

        // Create future orders for planning (next 3 intervals)
        const futureOrders = [];
        for (let i = 1; i <= 3; i++) {
          const futureDate = new Date(subscription.start_date);
          futureDate.setDate(futureDate.getDate() + (subscription.interval_weeks * 7 * i));
          
          futureOrders.push({
            subscription_id: subscription.id,
            order_type: subscription.service_type,
            customer: subscription.customer_name,
            customer_email: subscription.customer_email,
            price: subscription.price,
            scheduled_date: futureDate.toISOString().split('T')[0],
            status: 'Ikke planlagt',
            comment: `Abonnement (fremtidig): ${subscription.description || subscription.service_type}${subscription.notes ? '\nNoter: ' + subscription.notes : ''}`,
            address: subscription.customer_address,
            priority: 'Normal',
            estimated_duration: subscription.estimated_duration,
            user_id: user.id
          });
        }

        if (futureOrders.length > 0) {
          const { error: futureOrdersError } = await supabase
            .from('orders')
            .insert(futureOrders);

          if (futureOrdersError) {
            console.error('Error creating future orders:', futureOrdersError);
          } else {
            console.log(`Created ${futureOrders.length} future orders for subscription`);
          }
        }

        // Update subscription to mark that start order has been created
        const nextDueDate = new Date(subscription.start_date);
        nextDueDate.setDate(nextDueDate.getDate() + (subscription.interval_weeks * 7));
        
        await supabase
          .from('subscriptions')
          .update({
            last_order_date: subscription.start_date,
            next_due_date: nextDueDate.toISOString().split('T')[0]
          })
          .eq('id', subscription.id);
      }
    } catch (error) {
      console.error('Error creating orders for subscription:', error);
    }
  };

  const getActiveSubscriptions = () => {
    return subscriptions.filter(sub => sub.status === 'active');
  };

  const getSubscriptionsByCustomer = (customerEmail: string) => {
    return subscriptions.filter(sub => sub.customer_email === customerEmail);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  return {
    subscriptions,
    loading,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    createOrderFromSubscription,
    getActiveSubscriptions,
    getSubscriptionsByCustomer,
    refetch: fetchSubscriptions
  };
};