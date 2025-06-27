
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Route {
  id: string;
  name: string;
  employee_id: string;
  route_date: string;
  start_location?: string;
  estimated_distance_km?: number;
  estimated_duration_hours?: number;
  actual_distance_km?: number;
  actual_duration_hours?: number;
  total_revenue?: number;
  status: string;
  ai_optimized: boolean;
  optimization_score?: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateRouteData {
  name: string;
  employee_id: string;
  route_date: string;
  start_location?: string;
  estimated_distance_km?: number;
  estimated_duration_hours?: number;
  status?: string;
}

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchRoutes = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching routes for user:', user.id);
      
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('user_id', user.id)
        .order('route_date', { ascending: false });

      if (error) {
        console.error('Error fetching routes:', error);
        toast.error('Kunne ikke hente ruter');
        return;
      }

      console.log('Routes fetched successfully:', data);
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Kunne ikke hente ruter');
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async (routeData: CreateRouteData) => {
    if (!user) {
      toast.error('Du skal være logget ind for at oprette en rute');
      return null;
    }

    try {
      console.log('Creating route:', routeData);
      
      const { data, error } = await supabase
        .from('routes')
        .insert([{ ...routeData, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Error creating route:', error);
        toast.error('Kunne ikke oprette rute');
        return null;
      }

      console.log('Route created successfully:', data);
      toast.success('Rute oprettet');
      await fetchRoutes();
      return data;
    } catch (error) {
      console.error('Error creating route:', error);
      toast.error('Kunne ikke oprette rute');
      return null;
    }
  };

  const optimizeRoute = async (routeId: string) => {
    if (!user) {
      toast.error('Du skal være logget ind for at optimere en rute');
      return null;
    }

    try {
      console.log('Optimizing route:', routeId);
      
      // Call AI optimization edge function
      const { data: optimizationData, error: optimizationError } = await supabase.functions.invoke('optimize-route', {
        body: { routeId, userId: user.id }
      });

      if (optimizationError) {
        console.error('Error optimizing route:', optimizationError);
        toast.error('Kunne ikke optimere rute');
        return null;
      }

      console.log('Route optimized successfully:', optimizationData);
      toast.success('Rute optimeret');
      await fetchRoutes();
      return optimizationData;
    } catch (error) {
      console.error('Error optimizing route:', error);
      toast.error('Kunne ikke optimere rute');
      return null;
    }
  };

  const getRoutesByDate = (date: string): Route[] => {
    return routes.filter(route => route.route_date === date);
  };

  const getRoutesByEmployee = (employeeId: string): Route[] => {
    return routes.filter(route => route.employee_id === employeeId);
  };

  useEffect(() => {
    fetchRoutes();
  }, [user]);

  return {
    routes,
    loading,
    createRoute,
    optimizeRoute,
    getRoutesByDate,
    getRoutesByEmployee,
    refetch: fetchRoutes
  };
};
