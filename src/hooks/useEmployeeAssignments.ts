
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface EmployeeAssignment {
  id: string;
  employee_id: string;
  customer_email: string;
  customer_name?: string;
  is_primary: boolean;
  assignment_date: string;
  notes?: string;
  created_at: string;
  user_id: string;
}

export interface CreateAssignmentData {
  employee_id: string;
  customer_email: string;
  customer_name?: string;
  is_primary?: boolean;
  assignment_date?: string;
  notes?: string;
}

export const useEmployeeAssignments = () => {
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAssignments = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching assignments for user:', user.id);
      
      const { data, error } = await supabase
        .from('employee_customer_assignments')
        .select('*')
        .eq('user_id', user.id)
        .order('assignment_date', { ascending: false });

      if (error) {
        console.error('Error fetching assignments:', error);
        toast.error('Kunne ikke hente tildelinger');
        return;
      }

      console.log('Assignments fetched successfully:', data);
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Kunne ikke hente tildelinger');
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assignmentData: CreateAssignmentData) => {
    if (!user) {
      toast.error('Du skal være logget ind for at oprette en tildeling');
      return null;
    }

    try {
      console.log('Creating assignment:', assignmentData);
      
      const { data, error } = await supabase
        .from('employee_customer_assignments')
        .insert([{ ...assignmentData, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating assignment:', error);
        toast.error('Kunne ikke oprette tildeling');
        return null;
      }

      console.log('Assignment created successfully:', data);
      toast.success('Tildeling oprettet');
      await fetchAssignments();
      return data;
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Kunne ikke oprette tildeling');
      return null;
    }
  };

  const getAssignmentsByEmployee = (employeeId: string): EmployeeAssignment[] => {
    return assignments.filter(assignment => assignment.employee_id === employeeId);
  };

  const getEmployeeForCustomer = (customerEmail: string): EmployeeAssignment | undefined => {
    return assignments.find(assignment => 
      assignment.customer_email === customerEmail && assignment.is_primary
    );
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  return {
    assignments,
    loading,
    createAssignment,
    getAssignmentsByEmployee,
    getEmployeeForCustomer,
    refetch: fetchAssignments
  };
};
