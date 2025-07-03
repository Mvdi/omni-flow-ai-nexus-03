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
  latitude?: number;
  longitude?: number;
  bfe_number?: string;
  priority: string;
  estimated_duration?: number;
  assigned_employee_id?: string;
  route_id?: string;
  order_sequence?: number;
  travel_time_minutes?: number;
  ai_suggested_time?: string;
  expected_completion_time?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  subscription_id?: string;
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
  latitude?: number;
  longitude?: number;
  bfe_number?: string;
  priority: string;
  estimated_duration?: number;
  assigned_employee_id?: string;
  route_id?: string;
  order_sequence?: number;
  travel_time_minutes?: number;
  ai_suggested_time?: string;
  expected_completion_time?: string;
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
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

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
      
      // Ensure estimated_duration is a valid integer and handle new fields
      const cleanOrderData = {
        ...orderData,
        estimated_duration: Math.round(orderData.estimated_duration || 60), // Convert to integer
        scheduled_date: orderData.scheduled_date || null,
        scheduled_time: orderData.scheduled_time || null,
        expected_completion_time: orderData.expected_completion_time || null,
        scheduled_week: orderData.scheduled_week || null,
        latitude: orderData.latitude || null,
        longitude: orderData.longitude || null,
        user_id: user.id
      };
      
      const { data, error } = await supabase
        .from('orders')
        .insert([cleanOrderData])
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
      
      // Clean the data before sending to database with new field handling
      const cleanOrderData = {
        ...orderData,
        estimated_duration: orderData.estimated_duration ? Math.round(orderData.estimated_duration) : undefined,
        scheduled_date: orderData.scheduled_date || null,
        scheduled_time: orderData.scheduled_time || null,
        expected_completion_time: orderData.expected_completion_time || null,
        scheduled_week: orderData.scheduled_week || null,
        latitude: orderData.latitude || null,
        longitude: orderData.longitude || null
      };

      // Remove any undefined values
      Object.keys(cleanOrderData).forEach(key => {
        if (cleanOrderData[key as keyof typeof cleanOrderData] === undefined) {
          delete cleanOrderData[key as keyof typeof cleanOrderData];
        }
      });
      
      const { data, error } = await supabase
        .from('orders')
        .update(cleanOrderData)
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
      // Don't show toast for automated updates to avoid spam
      if (!orderData.assigned_employee_id && !orderData.route_id) {
        toast.success('Ordre opdateret');
      }
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
