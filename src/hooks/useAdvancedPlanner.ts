import { useState, useCallback } from 'react';
import { useOrders } from './useOrders';
import { useEmployees } from './useEmployees';
import { useRoutes } from './useRoutes';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PlanningStats {
  ordersOptimized: number;
  routesCreated: number;
  totalRevenue: number;
  totalDistance: number;
  avgEfficiency: number;
}

interface PlanningResult {
  success: boolean;
  message: string;
  stats: PlanningStats;
  routes: any[];
}

export const useAdvancedPlanner = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<PlanningResult | null>(null);
  
  const { orders, refetch: refetchOrders } = useOrders();
  const { employees } = useEmployees();
  const { refetch: refetchRoutes } = useRoutes();
  const { user } = useAuth();

  // Get orders that need AI planning (NEVER touch subscription orders with schedules)
  const getOrdersNeedingOptimization = useCallback(() => {
    return orders.filter(order => {
      // Never touch completed orders
      if (order.status === 'Afsluttet' || order.status === 'Færdig') return false;
      
      // CRITICAL: Never touch subscription orders that have ANY scheduling data
      if (order.subscription_id) {
        const hasAnyScheduling = order.scheduled_date || order.scheduled_time || order.assigned_employee_id;
        if (hasAnyScheduling) {
          return false; // Subscription orders with ANY scheduling are protected
        }
      }
      
      // Only optimize completely unscheduled orders
      return !order.assigned_employee_id && !order.scheduled_date;
    });
  }, [orders]);

  // Advanced AI Route Planning
  const runAdvancedOptimization = useCallback(async (weekStart?: Date, forceOptimize = false) => {
    if (!user || isOptimizing) return null;

    const ordersToOptimize = getOrdersNeedingOptimization();
    if (ordersToOptimize.length === 0 && !forceOptimize) {
      toast.info('🎯 Alle ordrer er allerede AI-optimeret');
      return null;
    }

    setIsOptimizing(true);
    const startDate = weekStart || new Date();

    try {
      console.log(`🧠 FENSTER AI Route Planning - MINDST KØRSEL, HØJEST INDTÆGT...`);
      console.log(`📊 Orders to optimize: ${ordersToOptimize.length}`);
      console.log(`👥 Active employees: ${employees.filter(e => e.is_active).length}`);
      console.log(`🎯 Target: Minimize driving, maximize revenue, schedule ALL orders`);

      // Call our advanced edge function using Supabase client
      const { data, error } = await supabase.functions.invoke('advanced-route-planner', {
        body: {
          weekStart: startDate.toISOString(),
          userId: user.id,
          forceOptimize
        },
      });

      if (error) {
        console.error('❌ Advanced planner failed:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      const result: PlanningResult = data;
      
      if (!result.success) {
        throw new Error(result.message || 'AI optimization failed');
      }

      setLastOptimization(result);

      // Refresh data to show new optimized routes
      await Promise.all([refetchOrders(), refetchRoutes()]);

      // Show success with detailed stats
      const { stats } = result;
      toast.success(
        `🎯 AI-Optimering Komplet!\n` +
        `✅ ${stats.ordersOptimized} ordrer optimeret\n` +
        `🚗 ${stats.routesCreated} ruter oprettet\n` +
        `💰 ${stats.totalRevenue.toLocaleString()} kr omsætning\n` +
        `📏 ${stats.totalDistance} km samlet kørsel\n` +
        `⚡ ${stats.avgEfficiency} efficiens-score`,
        { duration: 6000 }
      );

      console.log(`🎯 Advanced AI Optimization Complete:`, stats);
      return result;

    } catch (error) {
      console.error('❌ Advanced AI Planning failed:', error);
      toast.error(`AI-planlægning fejlede: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, [user, isOptimizing, getOrdersNeedingOptimization, employees, refetchOrders, refetchRoutes]);

  // Quick stats for UI
  const getPlanningStats = useCallback(() => {
    const unoptimized = getOrdersNeedingOptimization();
    const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
    const activeEmployees = employees.filter(e => e.is_active).length;

    return {
      ordersNeedingOptimization: unoptimized.length,
      totalOrders: orders.length,
      totalRevenue,
      activeEmployees,
      optimizationRate: orders.length > 0 ? Math.round(((orders.length - unoptimized.length) / orders.length) * 100) : 0
    };
  }, [orders, employees, getOrdersNeedingOptimization]);

  return {
    isOptimizing,
    lastOptimization,
    runAdvancedOptimization,
    getOrdersNeedingOptimization,
    getPlanningStats,
    hasOrdersNeedingOptimization: getOrdersNeedingOptimization().length > 0
  };
};