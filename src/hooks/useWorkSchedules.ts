
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WorkSchedule {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
  created_at: string;
  updated_at: string;
}

export const useWorkSchedules = () => {
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchWorkSchedules = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('employee_id', { ascending: true })
        .order('day_of_week', { ascending: true });

      if (error) throw error;
      setWorkSchedules(data || []);
    } catch (error) {
      console.error('Error fetching work schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkSchedule = async (scheduleData: Omit<WorkSchedule, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('work_schedules')
        .insert([{ ...scheduleData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      setWorkSchedules(prev => [...prev, data]);
      return data;
    } catch (error) {
      console.error('Error creating work schedule:', error);
      throw error;
    }
  };

  const updateWorkSchedule = async (id: string, updates: Partial<WorkSchedule>) => {
    try {
      const { data, error } = await supabase
        .from('work_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setWorkSchedules(prev => prev.map(schedule => 
        schedule.id === id ? data : schedule
      ));
      return data;
    } catch (error) {
      console.error('Error updating work schedule:', error);
      throw error;
    }
  };

  const deleteWorkSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setWorkSchedules(prev => prev.filter(schedule => schedule.id !== id));
    } catch (error) {
      console.error('Error deleting work schedule:', error);
      throw error;
    }
  };

  const getEmployeeSchedule = (employeeId: string) => {
    return workSchedules.filter(schedule => schedule.employee_id === employeeId);
  };

  useEffect(() => {
    fetchWorkSchedules();
  }, [user]);

  return {
    workSchedules,
    loading,
    createWorkSchedule,
    updateWorkSchedule,
    deleteWorkSchedule,
    getEmployeeSchedule,
    refetch: fetchWorkSchedules
  };
};
