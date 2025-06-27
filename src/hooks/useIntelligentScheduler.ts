
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

  // Dynamic intelligent scheduling that calculates realistic times
  useEffect(() => {
    const scheduleIntelligently = async () => {
      if (!orders.length || !employees.length || !workSchedules.length) {
        console.log('🤖 Intelligent scheduler: Waiting for data...', {
          orders: orders.length,
          employees: employees.length,
          workSchedules: workSchedules.length
        });
        return;
      }

      const today = new Date();
      const currentWeekStart = new Date(today);
      currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      
      // Find orders that need dynamic scheduling
      const ordersToOptimize = orders.filter(order => {
        const needsScheduling = !order.scheduled_date || !order.scheduled_time || !order.assigned_employee_id;
        const hasZeroDuration = !order.estimated_duration || order.estimated_duration === 0;
        const isClusteredTime = order.scheduled_time === '08:00:00' || order.scheduled_time === '09:00:00';
        const needsDynamicPlacement = order.scheduled_time && !order.travel_time_minutes;
        
        return needsScheduling || hasZeroDuration || isClusteredTime || needsDynamicPlacement;
      });

      if (ordersToOptimize.length === 0) {
        console.log('🤖 Dynamic scheduler: All orders properly scheduled');
        return;
      }

      console.log(`🤖 Dynamic scheduler: Optimizing ${ordersToOptimize.length} orders with realistic timing`);

      try {
        // Convert orders to VRP format with enhanced duration logic
        const vrpOrders = ordersToOptimize.map(order => {
          let estimatedDuration = order.estimated_duration || 60;
          
          // Smart duration estimation based on service type
          const serviceType = order.order_type?.toLowerCase() || order.customer?.toLowerCase() || '';
          if (serviceType.includes('kontor') || serviceType.includes('byggeren')) {
            estimatedDuration = Math.max(estimatedDuration, 90);
          } else if (serviceType.includes('privat') || serviceType.includes('villa')) {
            estimatedDuration = Math.max(estimatedDuration, 120);
          } else if (serviceType.includes('gulv') || serviceType.includes('dybren')) {
            estimatedDuration = Math.max(estimatedDuration, 180);
          }

          return {
            id: order.id,
            customer: order.customer,
            address: order.address || '',
            latitude: order.latitude,
            longitude: order.longitude,
            estimated_duration: estimatedDuration,
            priority: order.priority,
            price: order.price,
            preferred_time: order.scheduled_time,
            scheduled_date: order.scheduled_date,
            scheduled_time: order.scheduled_time,
          };
        });

        // Enhanced employee data with realistic travel considerations
        const activeEmployees = employees.filter(emp => emp.is_active).map(emp => ({
          id: emp.id,
          name: emp.name,
          start_location: emp.start_location || 'Kontor',
          latitude: emp.latitude || 56.1629,
          longitude: emp.longitude || 10.2039,
          max_hours_per_day: emp.max_hours_per_day || 8,
          hourly_rate: emp.hourly_rate || 300,
          specialties: emp.specialties || []
        }));

        if (activeEmployees.length === 0) {
          console.log('🤖 No active employees found');
          return;
        }

        // Enhanced work schedules with buffer times
        const vrpWorkSchedules = workSchedules.map(ws => ({
          employee_id: ws.employee_id,
          day_of_week: ws.day_of_week,
          start_time: ws.start_time,
          end_time: ws.end_time,
          is_working_day: ws.is_working_day
        }));

        // Add default schedules for missing days
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

        console.log(`🤖 Running dynamic VRP optimization with realistic timing`);

        // Run dynamic multi-day optimization
        const optimizedRoutes = VRPOptimizer.optimizeWeeklyRoutes(
          vrpOrders,
          activeEmployees,
          vrpWorkSchedules,
          currentWeekStart.toISOString().split('T')[0]
        );

        console.log(`🤖 Dynamic VRP generated ${optimizedRoutes.length} realistic routes`);

        // Apply dynamic scheduling with realistic times
        let scheduledOrders = 0;
        let createdRoutes = 0;

        for (const route of optimizedRoutes) {
          if (route.orders.length === 0) continue;

          // Create enhanced route with travel calculations
          const routeData = {
            name: `Dynamisk: ${route.orders[0]?.customer || 'Route'} - ${route.date}`,
            employee_id: route.employee_id,
            route_date: route.date,
            estimated_distance_km: route.total_distance,
            estimated_duration_hours: route.total_duration / 60,
            total_revenue: route.total_revenue,
            status: 'Planlagt' as const,
            ai_optimized: true,
            optimization_score: route.optimization_score,
            total_travel_time_minutes: route.orders.reduce((sum, order) => sum + (order.travel_time_to_here || 0), 0)
          };

          const createdRoute = await createRoute(routeData);
          if (createdRoute) {
            createdRoutes++;

            // Update orders with dynamic realistic scheduling
            for (const optimizedOrder of route.orders) {
              // Calculate end time based on start time + duration
              const startTime = optimizedOrder.scheduled_time;
              const duration = optimizedOrder.estimated_duration;
              const startMinutes = timeStringToMinutes(startTime);
              const endMinutes = startMinutes + duration;
              const endTime = minutesToTimeString(endMinutes);

              await updateOrder(optimizedOrder.id, {
                scheduled_date: optimizedOrder.scheduled_date,
                scheduled_time: optimizedOrder.scheduled_time,
                expected_completion_time: endTime,
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
            `🤖 Dynamisk optimering: ${scheduledOrders} ordrer med realistisk timing på ${createdRoutes} ruter (${avgScore}% effektivitet)`
          );
          console.log(`✅ Dynamic scheduling completed: ${scheduledOrders} orders with realistic timing`);
        }

      } catch (error) {
        console.error('Dynamic scheduler error:', error);
        console.log('🤖 Dynamic scheduler will retry...');
      }
    };

    // Run dynamic scheduling
    const timeoutId = setTimeout(scheduleIntelligently, 1500);
    
    return () => clearTimeout(timeoutId);
  }, [orders.length, employees.length, workSchedules.length]);

  return null;
};

// Helper functions for time calculations
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
