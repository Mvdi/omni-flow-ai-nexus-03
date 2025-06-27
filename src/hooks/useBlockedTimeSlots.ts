
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

    // Validate that end time is after start time
    if (slotData.start_time >= slotData.end_time) {
      toast.error('Sluttidspunkt skal være efter starttidspunkt');
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
      const duration = calculateDuration(slotData.start_time, slotData.end_time);
      toast.success(`Tidspunkt blokeret (${duration})`);
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

  // Helper function to calculate duration between two times
  const calculateDuration = (startTime: string, endTime: string): string => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const diffMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${hours}t ${minutes}min` : `${hours}t`;
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
