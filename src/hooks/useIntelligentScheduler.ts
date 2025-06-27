
import { useEffect } from 'react';
import { useOrders } from './useOrders';
import { useEmployees } from './useEmployees';
import { useWorkSchedules } from './useWorkSchedules';
import { useRoutes } from './useRoutes';
import { VRPOptimizer } from '@/utils/vrpOptimizer';
import { toast } from 'sonner';

export const useIntelligentScheduler = () => {
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { workSchedules } = useWorkSchedules();
  const { createRoute } = useRoutes();

  // Automatic intelligent scheduling when orders change
  useEffect(() => {
    const scheduleIntelligently = async () => {
      // Only run if we have the necessary data
      if (!orders.length || !employees.length || !workSchedules.length) {
        return;
      }

      // Find unscheduled orders (no date or assigned employee)
      const unscheduledOrders = orders.filter(order => 
        !order.scheduled_date || !order.assigned_employee_id
      );

      if (unscheduledOrders.length === 0) {
        return;
      }

      console.log(`🤖 Intelligent scheduler: Found ${unscheduledOrders.length} unscheduled orders`);

      try {
        // Get current week date range
        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
        
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday

        // Convert orders to VRP format
        const vrpOrders = unscheduledOrders.map(order => ({
          id: order.id,
          customer: order.customer,
          address: order.address || '',
          latitude: order.latitude,
          longitude: order.longitude,
          estimated_duration: order.estimated_duration || 60,
          priority: order.priority,
          price: order.price,
          preferred_time: order.scheduled_time,
          scheduled_date: order.scheduled_date,
          scheduled_time: order.scheduled_time,
        }));

        // Filter active employees with coordinates
        const activeEmployees = employees.filter(emp => emp.is_active).map(emp => ({
          id: emp.id,
          name: emp.name,
          start_location: emp.start_location,
          latitude: emp.latitude,
          longitude: emp.longitude,
          max_hours_per_day: emp.max_hours_per_day || 8,
          hourly_rate: emp.hourly_rate,
          specialties: emp.specialties
        }));

        if (activeEmployees.length === 0) {
          console.log('🤖 No active employees with coordinates found');
          return;
        }

        // Convert work schedules to VRP format
        const vrpWorkSchedules = workSchedules.map(ws => ({
          employee_id: ws.employee_id,
          day_of_week: ws.day_of_week,
          start_time: ws.start_time,
          end_time: ws.end_time,
          is_working_day: ws.is_working_day
        }));

        // Run intelligent multi-day optimization
        const optimizedRoutes = VRPOptimizer.optimizeWeeklyRoutes(
          vrpOrders,
          activeEmployees,
          vrpWorkSchedules,
          currentWeekStart.toISOString().split('T')[0]
        );

        console.log(`🤖 Intelligent scheduler: Generated ${optimizedRoutes.length} optimized routes`);

        // Apply the intelligent scheduling
        let scheduledOrders = 0;
        let createdRoutes = 0;

        for (const route of optimizedRoutes) {
          // Create route in database
          const routeData = {
            name: `${route.orders[0]?.customer || 'Auto'} - ${route.date}`,
            employee_id: route.employee_id,
            route_date: route.date,
            estimated_distance_km: route.total_distance,
            estimated_duration_hours: route.total_duration / 60,
            total_revenue: route.total_revenue,
            status: 'Planlagt' as const,
            ai_optimized: true,
            optimization_score: route.optimization_score
          };

          const createdRoute = await createRoute(routeData);
          if (createdRoute) {
            createdRoutes++;

            // Update orders with intelligent scheduling
            for (const optimizedOrder of route.orders) {
              await updateOrder(optimizedOrder.id, {
                scheduled_date: optimizedOrder.scheduled_date,
                scheduled_time: optimizedOrder.scheduled_time,
                route_id: createdRoute.id,
                order_sequence: optimizedOrder.order_sequence,
                travel_time_minutes: optimizedOrder.travel_time_to_here,
                ai_suggested_time: optimizedOrder.scheduled_time,
                assigned_employee_id: route.employee_id
              });
              scheduledOrders++;
            }
          }
        }

        if (scheduledOrders > 0) {
          toast.success(
            `🤖 Intelligent planlægning: ${scheduledOrders} ordrer automatisk planlagt på ${createdRoutes} ruter med ${Math.round(optimizedRoutes.reduce((sum, r) => sum + r.optimization_score, 0) / optimizedRoutes.length)}% effektivitet`
          );
        }

      } catch (error) {
        console.error('Intelligent scheduler error:', error);
        // Don't show error toast for automatic scheduling - just log
        console.log('🤖 Intelligent scheduler will retry when conditions improve');
      }
    };

    // Debounce the scheduling to avoid too frequent runs
    const timeoutId = setTimeout(scheduleIntelligently, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [orders.length, employees.length, workSchedules.length]); // Only run when counts change

  return null; // This is a background service hook
};
