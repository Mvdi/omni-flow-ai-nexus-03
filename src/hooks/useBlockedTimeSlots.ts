
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface BlockedTimeSlot {
  id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  employee_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBlockedTimeSlotData {
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  employee_id?: string;
}

export const useBlockedTimeSlots = () => {
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBlockedSlots = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching blocked time slots for user:', user.id);
      
      const { data, error } = await supabase
        .from('blocked_time_slots')
        .select('*')
        .eq('user_id', user.id)
        .order('blocked_date', { ascending: true });

      if (error) {
        console.error('Error fetching blocked time slots:', error);
        toast.error('Kunne ikke hente blokerede tidspunkter');
        return;
      }

      console.log('Blocked time slots fetched successfully:', data);
      setBlockedSlots(data || []);
    } catch (error) {
      console.error('Error fetching blocked time slots:', error);
      toast.error('Kunne ikke hente blokerede tidspunkter');
    } finally {
      setLoading(false);
    }
  };

  const createBlockedSlot = async (slotData: CreateBlockedTimeSlotData) => {
    if (!user) {
      toast.error('Du skal være logget ind for at blokere tidspunkter');
      return null;
    }

    try {
      console.log('Creating blocked time slot:', slotData);
      
      const { data, error } = await supabase
        .from('blocked_time_slots')
        .insert([{
          ...slotData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating blocked time slot:', error);
        toast.error('Kunne ikke blokere tidspunkt');
        return null;
      }

      console.log('Blocked time slot created successfully:', data);
      toast.success('Tidspunkt blokeret');
      await fetchBlockedSlots();
      return data;
    } catch (error) {
      console.error('Error creating blocked time slot:', error);
      toast.error('Kunne ikke blokere tidspunkt');
      return null;
    }
  };

  const deleteBlockedSlot = async (id: string) => {
    if (!user) {
      toast.error('Du skal være logget ind for at fjerne blokering');
      return false;
    }

    try {
      console.log('Deleting blocked time slot:', id);
      
      const { error } = await supabase
        .from('blocked_time_slots')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting blocked time slot:', error);
        toast.error('Kunne ikke fjerne blokering');
        return false;
      }

      console.log('Blocked time slot deleted successfully');
      toast.success('Blokering fjernet');
      await fetchBlockedSlots();
      return true;
    } catch (error) {
      console.error('Error deleting blocked time slot:', error);
      toast.error('Kunne ikke fjerne blokering');
      return false;
    }
  };

  useEffect(() => {
    fetchBlockedSlots();
  }, [user]);

  return {
    blockedSlots,
    loading,
    createBlockedSlot,
    deleteBlockedSlot,
    refetch: fetchBlockedSlots
  };
};
