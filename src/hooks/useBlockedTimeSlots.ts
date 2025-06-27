
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BlockedTimeSlot {
  id: string;
  employee_id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export const useBlockedTimeSlots = () => {
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBlockedSlots = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('blocked_time_slots')
        .select('*')
        .eq('user_id', user.id)
        .order('blocked_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBlockedSlots(data || []);
    } catch (error) {
      console.error('Error fetching blocked time slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBlockedSlot = async (slotData: Omit<BlockedTimeSlot, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('blocked_time_slots')
        .insert([{ ...slotData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setBlockedSlots(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error creating blocked time slot:', error);
      throw error;
    }
  };

  const updateBlockedSlot = async (id: string, updates: Partial<BlockedTimeSlot>) => {
    try {
      const { data, error } = await supabase
        .from('blocked_time_slots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setBlockedSlots(prev => prev.map(slot => 
        slot.id === id ? data : slot
      ));
      return data;
    } catch (error) {
      console.error('Error updating blocked time slot:', error);
      throw error;
    }
  };

  const deleteBlockedSlot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_time_slots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBlockedSlots(prev => prev.filter(slot => slot.id !== id));
    } catch (error) {
      console.error('Error deleting blocked time slot:', error);
      throw error;
    }
  };

  const getEmployeeBlockedSlots = (employeeId: string, date?: string) => {
    return blockedSlots.filter(slot => 
      slot.employee_id === employeeId && 
      (!date || slot.blocked_date === date)
    );
  };

  useEffect(() => {
    fetchBlockedSlots();
  }, [user]);

  return {
    blockedSlots,
    loading,
    createBlockedSlot,
    updateBlockedSlot,
    deleteBlockedSlot,
    getEmployeeBlockedSlots,
    refetch: fetchBlockedSlots
  };
};
