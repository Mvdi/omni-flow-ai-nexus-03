
import { useEffect, useState } from 'react';
import { useOrders } from './useOrders';
import { useEmployees } from './useEmployees';
import { useWorkSchedules } from './useWorkSchedules';
import { useRoutes } from './useRoutes';
import { vrpSolver, VRPStop, VRPVehicle, VRPSolverService } from '@/services/vrpSolver';
import { mapboxService } from '@/services/mapboxService';
import { toast } from 'sonner';

export const useBackendVRPScheduler = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [solverHealthy, setSolverHealthy] = useState(true); // Always healthy with Mapbox
  
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { workSchedules } = useWorkSchedules();
  const { createRoute } = useRoutes();

  // Check solver health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await vrpSolver.healthCheck();
      setSolverHealthy(healthy);
      
      console.log('🟢 Enhanced VRP solver with Mapbox integration ready');
    };
    
    checkHealth();
  }, []);

  // Main scheduling effect
  useEffect(() => {
    const runEnhancedOptimization = async () => {
      if (!orders.length || !employees.length || isOptimizing) {
        return;
      }

      // Find orders that need scheduling
      const ordersToOptimize = orders.filter(order => {
        const needsScheduling = !order.scheduled_date || !order.scheduled_time || !order.assigned_employee_id;
        const isNotCompleted = order.status !== 'Afsluttet' && order.status !== 'Færdig';
        
        return needsScheduling && isNotCompleted;
      });

      if (ordersToOptimize.length === 0) {
        console.log('🎯 Enhanced VRP: All orders properly scheduled');
        return;
      }

      console.log(`🚀 Enhanced VRP: Optimizing ${ordersToOptimize.length} orders with Mapbox integration`);
      setIsOptimizing(true);

      try {
        // Step 1: Geocode missing addresses
        const ordersWithCoords = await Promise.all(
          ordersToOptimize.map(async (order) => {
            if ((!order.latitude || !order.longitude) && order.address) {
              console.log(`🌍 Geocoding address: ${order.address}`);
              const coords = await mapboxService.geocodeAddress(order.address);
              if (coords) {
                // Update order with coordinates
                await updateOrder(order.id, {
                  latitude: coords.lat,
                  longitude: coords.lng
                });
                return {
                  ...order,
                  latitude: coords.lat,
                  longitude: coords.lng
                };
              }
            }
            return order;
          })
        );

        // Step 2: Convert orders to VRP format with enhanced time windows
        const vrpStops: VRPStop[] = ordersWithCoords.map((order, index) => {
          const estimatedDuration = order.estimated_duration || 60;
          
          // Enhanced time windows based on priority and workday distribution
          let twStart = VRPSolverService.timeToMinutesFromMonday(1, 8); // Monday 08:00
          let twEnd = VRPSolverService.timeToMinutesFromMonday(5, 16); // Friday 16:00
          
          // Adjust based on priority for better distribution
          if (order.priority === 'Kritisk') {
            twEnd = VRPSolverService.timeToMinutesFromMonday(2, 14); // By Tuesday 14:00
          } else if (order.priority === 'Høj') {
            twEnd = VRPSolverService.timeToMinutesFromMonday(3, 16); // By Wednesday 16:00
          } else if (order.priority === 'Lav') {
            twStart = VRPSolverService.timeToMinutesFromMonday(3, 10); // Thursday 10:00 earliest
          }

          return {
            id: index + 1,
            lat: order.latitude || 56.1629, // Aalborg fallback
            lon: order.longitude || 10.2039,
            service_min: estimatedDuration,
            tw_start: twStart,
            tw_end: twEnd,
            priority: order.priority,
            customer_name: order.customer
          };
        });

        // Step 3: Convert employees to VRP vehicles with better start locations
        const vrpVehicles: VRPVehicle[] = await Promise.all(
          employees
            .filter(emp => emp.is_active)
            .map(async (emp) => {
              let startLat = emp.latitude || 56.1629; // Aalborg default
              let startLon = emp.longitude || 10.2039;
              
              // Try to geocode employee start location if missing coordinates
              if ((!emp.latitude || !emp.longitude) && emp.start_location) {
                const coords = await mapboxService.geocodeAddress(emp.start_location);
                if (coords) {
                  startLat = coords.lat;
                  startLon = coords.lng;
                }
              }

              return {
                id: emp.id,
                name: emp.name,
                max_hours_per_day: (emp.max_hours_per_day || 8) * 60, // Convert to minutes
                start_lat: startLat,
                start_lon: startLon
              };
            })
        );

        if (vrpVehicles.length === 0) {
          console.warn('🔴 No active employees found for optimization');
          return;
        }

        // Step 4: Call enhanced VRP solver with Mapbox integration
        const result = await vrpSolver.optimizeRoutes({
          stops: vrpStops,
          vehicles: vrpVehicles,
          depot_lat: 56.1629, // Aalborg coordinates
          depot_lon: 10.2039
        });

        console.log('🎯 Enhanced VRP result with multi-day distribution:', result);

        // Step 5: Apply optimization results with improved day distribution
        let scheduledOrders = 0;
        let createdRoutes = 0;

        // Group routes by vehicle and day
        const routesByVehicleDay = new Map<string, typeof result.routes[0]>();
        
        for (const route of result.routes) {
          const key = `${route.vehicle_id}-${route.day_idx}`;
          routesByVehicleDay.set(key, route);
        }

        // Create routes and update orders with proper day distribution
        for (const [key, route] of routesByVehicleDay) {
          const employee = employees.find(e => e.id === route.vehicle_id);
          if (!employee) continue;

          // Calculate route date (Monday + day_idx)
          const today = new Date();
          const mondayOfWeek = new Date(today);
          mondayOfWeek.setDate(today.getDate() - today.getDay() + 1); // Get Monday
          const routeDate = new Date(mondayOfWeek);
          routeDate.setDate(mondayOfWeek.getDate() + route.day_idx);

          // Create route with enhanced data
          const routeData = {
            name: `${employee.name} - ${['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'][route.day_idx]} ${routeDate.toLocaleDateString('da-DK')}`,
            employee_id: route.vehicle_id,
            route_date: routeDate.toISOString().split('T')[0],
            estimated_distance_km: result.total_distance_km / result.routes.length,
            estimated_duration_hours: route.total_duration / 60,
            total_revenue: route.stops.reduce((sum, stop) => {
              const order = ordersWithCoords[stop.stop_id - 1];
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

            // Update orders in this route with proper scheduling
            for (const stop of route.stops) {
              const order = ordersWithCoords[stop.stop_id - 1];
              if (!order) continue;

              // Convert arrival time back to date/time
              const { day, hour, minute } = VRPSolverService.minutesFromMondayToDateTime(stop.arrival_time);
              const scheduledDate = new Date(mondayOfWeek);
              scheduledDate.setDate(mondayOfWeek.getDate() + day - 1);

              const scheduledTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              
              // Calculate completion time
              const completionMinutes = stop.departure_time;
              const { hour: endHour, minute: endMinute } = VRPSolverService.minutesFromMondayToDateTime(completionMinutes);
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
                estimated_duration: order.estimated_duration || 60
              });

              scheduledOrders++;
            }
          }
        }

        if (scheduledOrders > 0) {
          const daysUsed = new Set(result.routes.map(r => r.day_idx)).size;
          toast.success(
            `🎯 Enhanced VRP: ${scheduledOrders} ordrer planlagt på ${daysUsed} dage, ${createdRoutes} ruter (${Math.round(result.optimization_score)}% effektivitet)`
          );
          console.log(`✅ Enhanced VRP completed: ${scheduledOrders} orders scheduled across ${daysUsed} days in ${result.computation_time_ms}ms`);
        }

      } catch (error) {
        console.error('Enhanced VRP optimization failed:', error);
        toast.error('VRP optimering fejlede - prøver igen om lidt');
      } finally {
        setIsOptimizing(false);
      }
    };

    // Run optimization with delay to allow UI to load
    const timeoutId = setTimeout(runEnhancedOptimization, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [orders.length, employees.length, isOptimizing]);

  return {
    isOptimizing,
    solverHealthy
  };
};
