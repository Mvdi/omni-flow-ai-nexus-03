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

  const triggerIntelligentPlanning = async () => {
    if (!user) return;
    
    try {
      console.log('🤖 Triggering intelligent auto-planning...');
      await supabase.functions.invoke('intelligent-auto-planner', {
        body: { userId: user.id }
      });
    } catch (error) {
      console.error('Error triggering intelligent planning:', error);
    }
  };

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

  // Auto-fix broken orders on load
  const fixBrokenOrders = async () => {
    if (!user) return;
    
    try {
      // Find orders with missing data
      const brokenOrders = orders.filter(order => 
        order.scheduled_date && (!order.scheduled_week || !order.assigned_employee_id)
      );
      
      if (brokenOrders.length === 0) return;
      
      console.log(`🔧 Auto-fixing ${brokenOrders.length} broken orders`);
      
      // Get first active employee
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);
      
      const employeeId = employees?.[0]?.id;
      
      for (const order of brokenOrders) {
        const updates: any = {};
        
        // Calculate missing scheduled_week
        if (!order.scheduled_week && order.scheduled_date) {
          const date = new Date(order.scheduled_date);
          const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
          const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
          updates.scheduled_week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        }
        
        // Assign to employee if missing
        if (!order.assigned_employee_id && employeeId) {
          updates.assigned_employee_id = employeeId;
        }
        
        // Update status
        if (order.status === 'Ikke planlagt') {
          updates.status = 'Planlagt';
          updates.scheduled_time = '08:00';
        }
        
        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', order.id)
            .eq('user_id', user.id);
            
          if (!error) {
            console.log(`✅ Fixed order ${order.id}:`, updates);
          }
        }
      }
      
      // Refresh orders after fixing
      await fetchOrders();
    } catch (error) {
      console.error('Error fixing broken orders:', error);
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
      
      // Automatically trigger intelligent planning
      await triggerIntelligentPlanning();
      
      await fetchOrders();
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Kunne ikke oprette ordre');
      return null;
    }
  };

  const updateOrder = async (id: string, orderData: Partial<CreateOrderData>, showToast = true) => {
    if (!user) {
      toast.error('Du skal være logget ind for at opdatere en ordre');
      return null;
    }

    try {
      console.log('Updating order:', id, orderData);
      
      // Auto-calculate scheduled_week if scheduled_date is provided but scheduled_week is missing
      let calculatedOrderData = { ...orderData };
      if (orderData.scheduled_date && !orderData.scheduled_week) {
        const date = new Date(orderData.scheduled_date);
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        calculatedOrderData.scheduled_week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      }
      
      // Clean the data before sending to database with new field handling
      const cleanOrderData = {
        ...calculatedOrderData,
        estimated_duration: calculatedOrderData.estimated_duration ? Math.round(calculatedOrderData.estimated_duration) : undefined,
        scheduled_date: calculatedOrderData.scheduled_date || null,
        scheduled_time: calculatedOrderData.scheduled_time || null,
        expected_completion_time: calculatedOrderData.expected_completion_time || null,
        scheduled_week: calculatedOrderData.scheduled_week || null,
        latitude: calculatedOrderData.latitude || null,
        longitude: calculatedOrderData.longitude || null
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
        if (showToast) {
          toast.error('Kunne ikke opdatere ordre');
        }
        return null;
      }

      console.log('Order updated successfully:', data);
      // FENSTER-STYLE: Never show automated toasts, only manual ones
      if (showToast) {
        toast.success('Ordre opdateret');
      }
      await fetchOrders();
      return data;
    } catch (error) {
      console.error('Error updating order:', error);
      if (showToast) {
        toast.error('Kunne ikke opdatere ordre');
      }
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

  // Auto-fix broken orders when orders change
  useEffect(() => {
    if (orders.length > 0) {
      fixBrokenOrders();
    }
  }, [orders.length]);

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
