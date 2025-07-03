
import { useEffect, useState } from 'react';
import { useOrders } from './useOrders';
import { useEmployees } from './useEmployees';
import { useWorkSchedules } from './useWorkSchedules';
import { useRoutes } from './useRoutes';
import { vrpSolver, VRPStop, VRPVehicle } from '@/services/vrpSolver';
import { mapboxService } from '@/services/mapboxService';
import { toast } from 'sonner';

export const useBackendVRPScheduler = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [solverHealthy, setSolverHealthy] = useState(true);
  
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { workSchedules } = useWorkSchedules();
  const { createRoute } = useRoutes();

  // Initialize solver (always healthy with Mapbox)
  useEffect(() => {
    setSolverHealthy(true);
    console.log('🟢 Enhanced VRP solver with Mapbox integration ready');
  }, []);

  // Main scheduling effect with improved optimization
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

      console.log(`🚀 Enhanced VRP: Optimizing ${ordersToOptimize.length} orders with real Mapbox routing`);
      setIsOptimizing(true);

      try {
        // Step 1: Enhanced geocoding with better error handling
        console.log('🌍 Step 1: Geocoding addresses...');
        const ordersWithCoords = await Promise.all(
          ordersToOptimize.map(async (order) => {
            if ((!order.latitude || !order.longitude) && order.address) {
              console.log(`🌍 Geocoding: ${order.address}`);
              const coords = await mapboxService.geocodeAddress(order.address);
              if (coords) {
                console.log(`✅ Geocoded "${order.address}" → ${coords.lat}, ${coords.lng}`);
                await updateOrder(order.id, {
                  latitude: coords.lat,
                  longitude: coords.lng
                });
                return { ...order, latitude: coords.lat, longitude: coords.lng };
              } else {
                console.warn(`⚠️ Failed to geocode: ${order.address}`);
              }
            }
            return order;
          })
        );

        // Step 2: Convert to VRP format with realistic time windows
        console.log('📊 Step 2: Converting orders to VRP format...');
        const vrpStops: VRPStop[] = ordersWithCoords.map((order, index) => ({
          id: index + 1,
          lat: order.latitude || 56.1629, // Aalborg fallback
          lon: order.longitude || 10.2039,
          service_min: order.estimated_duration || 60,
          tw_start: 480, // 08:00 Monday
          tw_end: 2400, // Friday 16:00 (5 days * 8 hours * 60 min)
          priority: order.priority,
          customer_name: order.customer
        }));

        // Step 3: Convert employees to VRP vehicles with proper start locations
        console.log('👥 Step 3: Setting up vehicles...');
        const vrpVehicles: VRPVehicle[] = await Promise.all(
          employees
            .filter(emp => emp.is_active)
            .map(async (emp) => {
              let startLat = emp.latitude || 56.1629;
              let startLon = emp.longitude || 10.2039;
              
              // Geocode employee start location if needed
              if ((!emp.latitude || !emp.longitude) && emp.start_location) {
                console.log(`🏠 Geocoding employee start: ${emp.start_location}`);
                const coords = await mapboxService.geocodeAddress(emp.start_location);
                if (coords) {
                  startLat = coords.lat;
                  startLon = coords.lng;
                  console.log(`✅ Employee start location: ${coords.lat}, ${coords.lng}`);
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
          toast.error('Ingen aktive medarbejdere fundet');
          return;
        }

        // Step 4: Run VRP optimization with real Mapbox data
        console.log('🎯 Step 4: Running VRP optimization with real distances...');
        const result = await vrpSolver.optimizeRoutes({
          stops: vrpStops,
          vehicles: vrpVehicles,
          depot_lat: 56.1629,
          depot_lon: 10.2039
        });

        console.log('✅ VRP optimization completed:', {
          routes: result.routes.length,
          totalDistance: result.total_distance_km,
          score: result.optimization_score,
          computeTime: result.computation_time_ms
        });

        // Step 5: Apply results with proper multi-day distribution
        console.log('📅 Step 5: Creating routes and updating orders...');
        let scheduledOrders = 0;
        let createdRoutes = 0;

        // Get current Monday
        const today = new Date();
        const mondayOfWeek = new Date(today);
        mondayOfWeek.setDate(today.getDate() - today.getDay() + 1);

        // Create routes grouped by vehicle and day
        const routesByVehicleDay = new Map<string, typeof result.routes[0]>();
        
        for (const route of result.routes) {
          const key = `${route.vehicle_id}-${route.day_idx}`;
          if (!routesByVehicleDay.has(key)) {
            routesByVehicleDay.set(key, route);
          }
        }

        // Create actual routes and update orders
        for (const [key, route] of routesByVehicleDay) {
          const employee = employees.find(e => e.id === route.vehicle_id);
          if (!employee) continue;

          // Calculate route date
          const routeDate = new Date(mondayOfWeek);
          routeDate.setDate(mondayOfWeek.getDate() + route.day_idx);

          // Create route
          const routeData = {
            name: `${employee.name} - ${['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'][route.day_idx]} ${routeDate.toLocaleDateString('da-DK')}`,
            employee_id: route.vehicle_id,
            route_date: routeDate.toISOString().split('T')[0],
            estimated_distance_km: Math.round(result.total_distance_km / result.routes.length * 10) / 10,
            estimated_duration_hours: Math.round(route.total_duration / 60 * 10) / 10,
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
            console.log(`📍 Created route: ${routeData.name}`);

            // Update orders in this route
            for (const stop of route.stops) {
              const order = ordersWithCoords[stop.stop_id - 1];
              if (!order) continue;

              // Convert arrival time to proper date/time
              const totalMinutes = stop.arrival_time;
              const dayOffset = Math.floor(totalMinutes / (24 * 60));
              const timeOfDay = totalMinutes % (24 * 60);
              const hours = Math.floor(timeOfDay / 60);
              const minutes = timeOfDay % 60;

              const actualRouteDate = new Date(mondayOfWeek);
              actualRouteDate.setDate(mondayOfWeek.getDate() + dayOffset);

              const scheduledTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              
              // Calculate completion time
              const completionMinutes = stop.departure_time % (24 * 60);
              const completionHours = Math.floor(completionMinutes / 60);
              const completionMins = completionMinutes % 60;
              const expectedCompletionTime = `${completionHours.toString().padStart(2, '0')}:${completionMins.toString().padStart(2, '0')}`;

              // For subscription orders, keep original date and only update time
              const updateData: any = {
                scheduled_time: scheduledTime,
                expected_completion_time: expectedCompletionTime,
                route_id: createdRoute.id,
                order_sequence: stop.sequence,
                travel_time_minutes: stop.travel_time_from_prev,
                ai_suggested_time: scheduledTime,
                assigned_employee_id: route.vehicle_id,
                estimated_duration: order.estimated_duration || 60
              };

              // Only change date for non-subscription orders
              if (!order.subscription_id) {
                updateData.scheduled_date = actualRouteDate.toISOString().split('T')[0];
              }

              await updateOrder(order.id, updateData);
              
              scheduledOrders++;
              console.log(`✅ Scheduled: ${order.customer} on ${order.subscription_id ? order.scheduled_date : actualRouteDate.toLocaleDateString('da-DK')} at ${scheduledTime} (${stop.travel_time_from_prev} min travel)`);
            }
          }
        }

        if (scheduledOrders > 0) {
          const daysUsed = new Set(result.routes.map(r => r.day_idx)).size;
          toast.success(
            `🎯 VRP: ${scheduledOrders} ordrer planlagt på ${daysUsed} dage med korrekte køretider (${Math.round(result.optimization_score)}% effektivitet)`
          );
          console.log(`✅ VRP completed: ${scheduledOrders} orders across ${daysUsed} days in ${result.computation_time_ms}ms`);
        }

      } catch (error) {
        console.error('❌ VRP optimization failed:', error);
        toast.error('VRP optimering fejlede - prøv igen');
      } finally {
        setIsOptimizing(false);
      }
    };

    // Run optimization with delay
    const timeoutId = setTimeout(runEnhancedOptimization, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [orders.length, employees.length, isOptimizing]);

  return {
    isOptimizing,
    solverHealthy
  };
};
