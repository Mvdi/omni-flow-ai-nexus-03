
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialties: string[];
  preferred_areas: string[];
  max_hours_per_day: number;
  start_location?: string;
  latitude?: number;
  longitude?: number;
  bfe_number?: string;
  work_radius_km?: number;
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  phone?: string;
  specialties: string[];
  preferred_areas: string[];
  max_hours_per_day: number;
  start_location?: string;
  latitude?: number;
  longitude?: number;
  bfe_number?: string;
  work_radius_km?: number;
  hourly_rate?: number;
  is_active?: boolean;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchEmployees = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching employees for user:', user.id);
      
      // Include coordinate data and hourly_rate for VRP optimization
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          email,
          phone,
          specialties,
          preferred_areas,
          max_hours_per_day,
          start_location,
          latitude,
          longitude,
          bfe_number,
          work_radius_km,
          hourly_rate,
          is_active,
          created_at,
          updated_at,
          user_id
        `)
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching employees:', error);
        toast.error('Kunne ikke hente medarbejdere');
        return;
      }

      console.log('Employees fetched successfully:', data);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Kunne ikke hente medarbejdere');
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: CreateEmployeeData) => {
    if (!user) {
      toast.error('Du skal være logget ind for at oprette en medarbejder');
      return null;
    }

    try {
      console.log('Creating employee with coordinate storage');
      
      const { data, error } = await supabase
        .from('employees')
        .insert([{ ...employeeData, user_id: user.id }])
        .select(`
          id,
          name,
          email,
          phone,
          specialties,
          preferred_areas,
          max_hours_per_day,
          start_location,
          latitude,
          longitude,
          bfe_number,
          work_radius_km,
          hourly_rate,
          is_active,
          created_at,
          updated_at,
          user_id
        `)
        .single();

      if (error) {
        console.error('Error creating employee:', error);
        toast.error('Kunne ikke oprette medarbejder');
        return null;
      }

      console.log('Employee created successfully');
      toast.success('Medarbejder oprettet');
      await fetchEmployees();
      return data;
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('Kunne ikke oprette medarbejder');
      return null;
    }
  };

  const updateEmployee = async (id: string, employeeData: Partial<CreateEmployeeData>) => {
    if (!user) {
      toast.error('Du skal være logget ind for at opdatere en medarbejder');
      return null;
    }

    try {
      console.log('Updating employee:', id);
      
      const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select(`
          id,
          name,
          email,
          phone,
          specialties,
          preferred_areas,
          max_hours_per_day,
          start_location,
          latitude,
          longitude,
          bfe_number,
          work_radius_km,
          hourly_rate,
          is_active,
          created_at,
          updated_at,
          user_id
        `)
        .single();

      if (error) {
        console.error('Error updating employee:', error);
        toast.error('Kunne ikke opdatere medarbejder');
        return null;
      }

      console.log('Employee updated successfully');
      toast.success('Medarbejder opdateret');
      await fetchEmployees();
      return data;
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Kunne ikke opdatere medarbejder');
      return null;
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!user) {
      toast.error('Du skal være logget ind for at slette en medarbejder');
      return false;
    }

    try {
      console.log('Deleting employee:', id);
      
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting employee:', error);
        toast.error('Kunne ikke slette medarbejder');
        return false;
      }

      console.log('Employee deleted successfully');
      toast.success('Medarbejder slettet');
      await fetchEmployees();
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Kunne ikke slette medarbejder');
      return false;
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  return {
    employees,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refetch: fetchEmployees
  };
};
