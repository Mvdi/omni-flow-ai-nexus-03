
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

  // Aggressive intelligent scheduling that redistributes ALL orders
  useEffect(() => {
    const scheduleIntelligently = async () => {
      // Only run if we have the necessary data
      if (!orders.length || !employees.length || !workSchedules.length) {
        console.log('🤖 Intelligent scheduler: Waiting for data...', {
          orders: orders.length,
          employees: employees.length,
          workSchedules: workSchedules.length
        });
        return;
      }

      // Get current week
      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      
      // Find orders that need intelligent redistribution
      const ordersToOptimize = orders.filter(order => {
        // Include orders without proper scheduling OR orders clustered at same time
        const needsScheduling = !order.scheduled_date || !order.scheduled_time || !order.assigned_employee_id;
        const hasZeroDuration = !order.estimated_duration || order.estimated_duration === 0;
        const isClusteredTime = order.scheduled_time === '08:00:00' || order.scheduled_time === '09:00:00';
        
        return needsScheduling || hasZeroDuration || isClusteredTime;
      });

      if (ordersToOptimize.length === 0) {
        console.log('🤖 Intelligent scheduler: All orders properly distributed');
        return;
      }

      console.log(`🤖 Intelligent scheduler: Optimizing ${ordersToOptimize.length} orders`);

      try {
        // Convert orders to VRP format with realistic durations
        const vrpOrders = ordersToOptimize.map(order => ({
          id: order.id,
          customer: order.customer,
          address: order.address || '',
          latitude: order.latitude,
          longitude: order.longitude,
          estimated_duration: Math.max(order.estimated_duration || 60, 30), // Minimum 30 min
          priority: order.priority,
          price: order.price,
          preferred_time: order.scheduled_time,
          scheduled_date: order.scheduled_date,
          scheduled_time: order.scheduled_time,
        }));

        // Filter active employees with meaningful data
        const activeEmployees = employees.filter(emp => emp.is_active).map(emp => ({
          id: emp.id,
          name: emp.name,
          start_location: emp.start_location || 'Kontor',
          latitude: emp.latitude || 56.1629, // Default Aarhus coordinates
          longitude: emp.longitude || 10.2039,
          max_hours_per_day: emp.max_hours_per_day || 8,
          hourly_rate: emp.hourly_rate || 300,
          specialties: emp.specialties || []
        }));

        if (activeEmployees.length === 0) {
          console.log('🤖 No active employees found');
          return;
        }

        // Convert work schedules - ensure we have schedules for Mon-Fri
        const vrpWorkSchedules = workSchedules.map(ws => ({
          employee_id: ws.employee_id,
          day_of_week: ws.day_of_week,
          start_time: ws.start_time,
          end_time: ws.end_time,
          is_working_day: ws.is_working_day
        }));

        // Add default schedules for missing days (Mon-Fri = 1-5)
        for (const employee of activeEmployees) {
          for (let day = 1; day <= 5; day++) {
            const hasSchedule = vrpWorkSchedules.some(ws => 
              ws.employee_id === employee.id && ws.day_of_week === day
            );
            
            if (!hasSchedule) {
              vrpWorkSchedules.push({
                employee_id: employee.id,
                day_of_week: day,
                start_time: '08:00',
                end_time: '16:00',
                is_working_day: true
              });
            }
          }
        }

        console.log(`🤖 Running VRP optimization with ${vrpOrders.length} orders, ${activeEmployees.length} employees, ${vrpWorkSchedules.length} work schedules`);

        // Run intelligent multi-day optimization
        const optimizedRoutes = VRPOptimizer.optimizeWeeklyRoutes(
          vrpOrders,
          activeEmployees,
          vrpWorkSchedules,
          currentWeekStart.toISOString().split('T')[0]
        );

        console.log(`🤖 VRP generated ${optimizedRoutes.length} optimized routes`);

        // Apply the intelligent scheduling
        let scheduledOrders = 0;
        let createdRoutes = 0;

        for (const route of optimizedRoutes) {
          if (route.orders.length === 0) continue;

          // Create route in database
          const routeData = {
            name: `Auto: ${route.orders[0]?.customer || 'Route'} - ${route.date}`,
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
                assigned_employee_id: route.employee_id,
                estimated_duration: optimizedOrder.estimated_duration
              });
              scheduledOrders++;
            }
          }
        }

        if (scheduledOrders > 0) {
          const avgScore = Math.round(optimizedRoutes.reduce((sum, r) => sum + r.optimization_score, 0) / optimizedRoutes.length);
          toast.success(
            `🤖 Intelligent optimering: ${scheduledOrders} ordrer automatisk planlagt på ${createdRoutes} ruter med ${avgScore}% effektivitet`
          );
          console.log(`✅ Intelligent scheduling completed: ${scheduledOrders} orders on ${createdRoutes} routes`);
        }

      } catch (error) {
        console.error('Intelligent scheduler error:', error);
        console.log('🤖 Intelligent scheduler will retry...');
      }
    };

    // More aggressive scheduling - run sooner and more often for orders that need it
    const timeoutId = setTimeout(scheduleIntelligently, 1500);
    
    return () => clearTimeout(timeoutId);
  }, [orders.length, employees.length, workSchedules.length]);

  return null;
};
