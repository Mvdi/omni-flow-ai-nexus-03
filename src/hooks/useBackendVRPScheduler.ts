
import { useEffect, useState } from 'react';
import { useOrders } from './useOrders';
import { useEmployees } from './useEmployees';
import { useWorkSchedules } from './useWorkSchedules';
import { useRoutes } from './useRoutes';
import { vrpSolver, VRPStop, VRPVehicle } from '@/services/vrpSolver';
import { toast } from 'sonner';

export const useBackendVRPScheduler = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [solverHealthy, setSolverHealthy] = useState(false);
  
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { workSchedules } = useWorkSchedules();
  const { createRoute } = useRoutes();

  // Check solver health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await vrpSolver.healthCheck();
      setSolverHealthy(healthy);
      
      if (!healthy) {
        console.warn('🔴 VRP solver not available - falling back to browser optimization');
      } else {
        console.log('🟢 VRP solver is healthy');
      }
    };
    
    checkHealth();
  }, []);

  // Main scheduling effect
  useEffect(() => {
    const runBackendOptimization = async () => {
      if (!orders.length || !employees.length || !solverHealthy || isOptimizing) {
        return;
      }

      // Find orders that need scheduling
      const ordersToOptimize = orders.filter(order => {
        const needsScheduling = !order.scheduled_date || !order.scheduled_time || !order.assigned_employee_id;
        const hasValidCoordinates = order.latitude && order.longitude;
        const isNotCompleted = order.status !== 'Afsluttet';
        
        return needsScheduling && hasValidCoordinates && isNotCompleted;
      });

      if (ordersToOptimize.length === 0) {
        console.log('🤖 Backend VRP: All orders properly scheduled');
        return;
      }

      console.log(`🤖 Backend VRP: Optimizing ${ordersToOptimize.length} orders`);
      setIsOptimizing(true);

      try {
        // Convert orders to VRP format
        const vrpStops: VRPStop[] = ordersToOptimize.map((order, index) => {
          const estimatedDuration = order.estimated_duration || 60;
          
          // Calculate time windows (prefer morning hours, expand based on priority)
          let twStart = vrpSolver.timeToMinutesFromMonday(1, 8); // Monday 08:00
          let twEnd = vrpSolver.timeToMinutesFromMonday(5, 16); // Friday 16:00
          
          // Adjust based on priority
          if (order.priority === 'Høj') {
            twEnd = vrpSolver.timeToMinutesFromMonday(3, 14); // By Wednesday 14:00
          } else if (order.priority === 'Lav') {
            twStart = vrpSolver.timeToMinutesFromMonday(3, 10); // Thursday 10:00 earliest
          }

          return {
            id: index + 1, // Use 1-based indexing for VRP solver
            lat: order.latitude!,
            lon: order.longitude!,
            service_min: estimatedDuration,
            tw_start: twStart,
            tw_end: twEnd,
            priority: order.priority,
            customer_name: order.customer
          };
        });

        // Convert employees to VRP vehicles
        const vrpVehicles: VRPVehicle[] = employees
          .filter(emp => emp.is_active)
          .map(emp => ({
            id: emp.id,
            name: emp.name,
            max_hours_per_day: (emp.max_hours_per_day || 8) * 60, // Convert to minutes
            start_lat: emp.latitude || 56.1629, // Aalborg default
            start_lon: emp.longitude || 10.2039
          }));

        if (vrpVehicles.length === 0) {
          console.warn('🔴 No active employees found for optimization');
          return;
        }

        // Call backend VRP solver
        const result = await vrpSolver.optimizeRoutes({
          stops: vrpStops,
          vehicles: vrpVehicles,
          depot_lat: 56.1629, // Aalborg coordinates
          depot_lon: 10.2039
        });

        console.log('🚀 Backend VRP result:', result);

        // Apply the optimization results
        let scheduledOrders = 0;
        let createdRoutes = 0;

        // Group routes by vehicle and day
        const routesByVehicleDay = new Map<string, typeof result.routes[0]>();
        
        for (const route of result.routes) {
          const key = `${route.vehicle_id}-${route.day_idx}`;
          routesByVehicleDay.set(key, route);
        }

        // Create routes and update orders
        for (const [key, route] of routesByVehicleDay) {
          const employee = employees.find(e => e.id === route.vehicle_id);
          if (!employee) continue;

          // Calculate route date
          const today = new Date();
          const mondayOfWeek = new Date(today);
          mondayOfWeek.setDate(today.getDate() - today.getDay() + 1);
          const routeDate = new Date(mondayOfWeek);
          routeDate.setDate(mondayOfWeek.getDate() + route.day_idx);

          // Create route
          const routeData = {
            name: `Optimeret: ${employee.name} - ${routeDate.toLocaleDateString('da-DK')}`,
            employee_id: route.vehicle_id,
            route_date: routeDate.toISOString().split('T')[0],
            estimated_distance_km: result.total_distance_km / result.routes.length,
            estimated_duration_hours: route.total_duration / 60,
            total_revenue: route.stops.reduce((sum, stop) => {
              const order = ordersToOptimize[stop.stop_id - 1];
              return sum + (order?.price || 0);
            }, 0),
            status: 'Planlagt' as const,
            ai_optimized: true,
            optimization_score: result.optimization_score,
            total_travel_time_minutes: route.total_travel_time
          };

          const createdRoute = await createRoute(routeData);
          if (createdRoute) {
            createdRoutes++;

            // Update orders in this route
            for (const stop of route.stops) {
              const order = ordersToOptimize[stop.stop_id - 1];
              if (!order) continue;

              // Convert arrival time back to date/time
              const { day, hour, minute } = vrpSolver.minutesFromMondayToDateTime(stop.arrival_time);
              const scheduledDate = new Date(mondayOfWeek);
              scheduledDate.setDate(mondayOfWeek.getDate() + day - 1);

              const scheduledTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              
              // Calculate completion time
              const completionMinutes = stop.departure_time;
              const { hour: endHour, minute: endMinute } = vrpSolver.minutesFromMondayToDateTime(completionMinutes);
              const expectedCompletionTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

              await updateOrder(order.id, {
                scheduled_date: scheduledDate.toISOString().split('T')[0],
                scheduled_time: scheduledTime,
                expected_completion_time: expectedCompletionTime,
                route_id: createdRoute.id,
                order_sequence: stop.sequence,
                travel_time_minutes: stop.travel_time_from_prev,
                ai_suggested_time: scheduledTime,
                assigned_employee_id: route.vehicle_id,
                estimated_duration: order.estimated_duration
              });

              scheduledOrders++;
            }
          }
        }

        if (scheduledOrders > 0) {
          toast.success(
            `🤖 Backend optimering: ${scheduledOrders} ordrer planlagt på ${createdRoutes} ruter (${Math.round(result.optimization_score)}% effektivitet, ${result.computation_time_ms}ms)`
          );
          console.log(`✅ Backend VRP completed: ${scheduledOrders} orders scheduled in ${result.computation_time_ms}ms`);
        }

      } catch (error) {
        console.error('Backend VRP optimization failed:', error);
        toast.error('Backend optimering fejlede - falder tilbage til browser-optimering');
      } finally {
        setIsOptimizing(false);
      }
    };

    // Run optimization with delay to avoid overwhelming the solver
    const timeoutId = setTimeout(runBackendOptimization, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [orders.length, employees.length, solverHealthy, isOptimizing]);

  return {
    isOptimizing,
    solverHealthy
  };
};
