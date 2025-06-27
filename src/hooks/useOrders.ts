
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Order {
  id: string;
  order_type: string;
  customer: string;
  customer_email?: string;
  price: number;
  scheduled_week?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  status: string;
  comment?: string;
  address?: string;
  priority: string;
  estimated_duration?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateOrderData {
  order_type: string;
  customer: string;
  customer_email?: string;
  price: number;
  scheduled_week?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  status: string;
  comment?: string;
  address?: string;
  priority: string;
  estimated_duration?: number;
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching orders for user:', user.id);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        toast.error('Kunne ikke hente ordre');
        return;
      }

      console.log('Orders fetched successfully:', data);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Kunne ikke hente ordre');
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: CreateOrderData) => {
    if (!user) {
      toast.error('Du skal være logget ind for at oprette en ordre');
      return null;
    }

    try {
      console.log('Creating order:', orderData);
      
      const { data, error } = await supabase
        .from('orders')
        .insert([{ ...orderData, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating order:', error);
        toast.error('Kunne ikke oprette ordre');
        return null;
      }

      console.log('Order created successfully:', data);
      toast.success('Ordre oprettet');
      await fetchOrders();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Kunne ikke oprette ordre');
      return null;
    }
  };

  const updateOrder = async (id: string, orderData: Partial<CreateOrderData>) => {
    if (!user) {
      toast.error('Du skal være logget ind for at opdatere en ordre');
      return null;
    }

    try {
      console.log('Updating order:', id, orderData);
      
      const { data, error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating order:', error);
        toast.error('Kunne ikke opdatere ordre');
        return null;
      }

      console.log('Order updated successfully:', data);
      toast.success('Ordre opdateret');
      await fetchOrders();
      return data;
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Kunne ikke opdatere ordre');
      return null;
    }
  };

  const deleteOrder = async (id: string) => {
    if (!user) {
      toast.error('Du skal være logget ind for at slette en ordre');
      return false;
    }

    try {
      console.log('Deleting order:', id);
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting order:', error);
        toast.error('Kunne ikke slette ordre');
        return false;
      }

      console.log('Order deleted successfully');
      toast.success('Ordre slettet');
      await fetchOrders();
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Kunne ikke slette ordre');
      return false;
    }
  };

  const getOrdersByWeek = (week: number): Order[] => {
    return orders.filter(order => order.scheduled_week === week);
  };

  const getOrdersByStatus = (status: string): Order[] => {
    return orders.filter(order => order.status === status);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  return {
    orders,
    loading,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrdersByWeek,
    getOrdersByStatus,
    refetch: fetchOrders
  };
};
