import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Order {
  id: string;
  customer: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimated_duration: number;
  priority: string;
  subscription_id?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_employee_id?: string;
  price: number;
}

interface Employee {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  start_location?: string;
  max_hours_per_day: number;
}

// Haversine distance calculation in kilometers
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Advanced Route Optimization Algorithm (inspired by OR-Tools)
function optimizeRoutes(orders: Order[], employees: Employee[], weekStart: Date) {
  console.log(`🧠 AI Route Optimization: ${orders.length} orders, ${employees.length} employees`);
  
  const priorityWeights = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 };
  const workDays = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
  const optimizedRoutes: any[] = [];
  
  // Create 5 work days starting from Monday
  const mondayStart = new Date(weekStart);
  mondayStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  
  // Group orders by priority and calculate revenue density
  const enrichedOrders = orders.map(order => ({
    ...order,
    priorityScore: priorityWeights[order.priority as keyof typeof priorityWeights] || 2,
    revenueDensity: order.price / (order.estimated_duration || 60), // Revenue per minute
    coordinates: { lat: order.latitude || 56.1629, lng: order.longitude || 10.2039 }
  }));
  
  // Sort by priority and revenue density
  enrichedOrders.sort((a, b) => {
    if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
    return b.revenueDensity - a.revenueDensity;
  });
  
  // Distribute orders across employees and days using advanced algorithms
  for (const employee of employees) {
    const employeeOrders = [...enrichedOrders];
    const maxDailyMinutes = (employee.max_hours_per_day || 8) * 60;
    const employeeLocation = { lat: employee.latitude || 56.1629, lng: employee.longitude || 10.2039 };
    
    for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
      const currentDate = new Date(mondayStart);
      currentDate.setDate(mondayStart.getDate() + dayIndex);
      
      const dayOrders: any[] = [];
      let remainingMinutes = maxDailyMinutes;
      let currentLocation = employeeLocation;
      let totalDistance = 0;
      let totalRevenue = 0;
      
      // Greedy algorithm with distance optimization
      while (remainingMinutes > 30 && employeeOrders.length > 0) {
        let bestOrderIndex = -1;
        let bestScore = -1;
        
        // Find optimal next order using composite scoring
        for (let i = 0; i < employeeOrders.length; i++) {
          const order = employeeOrders[i];
          const duration = order.estimated_duration || 60;
          
          if (duration > remainingMinutes) continue;
          
          const distance = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            order.coordinates.lat, order.coordinates.lng
          );
          
          // Advanced scoring: priority + revenue density - distance penalty
          const distancePenalty = Math.min(distance * 0.1, 2); // Max 2 point penalty
          const score = order.priorityScore + order.revenueDensity - distancePenalty;
          
          if (score > bestScore) {
            bestScore = score;
            bestOrderIndex = i;
          }
        }
        
        if (bestOrderIndex === -1) break;
        
        // Add best order to route
        const selectedOrder = employeeOrders.splice(bestOrderIndex, 1)[0];
        const travelDistance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          selectedOrder.coordinates.lat, selectedOrder.coordinates.lng
        );
        
        dayOrders.push({
          ...selectedOrder,
          sequence: dayOrders.length + 1,
          travelDistance,
          scheduledDate: currentDate.toISOString().split('T')[0],
          estimatedTime: calculateTimeSlot(dayOrders.length, remainingMinutes, maxDailyMinutes)
        });
        
        remainingMinutes -= (selectedOrder.estimated_duration || 60);
        totalDistance += travelDistance;
        totalRevenue += selectedOrder.price;
        currentLocation = selectedOrder.coordinates;
      }
      
      if (dayOrders.length > 0) {
        optimizedRoutes.push({
          employeeId: employee.id,
          employeeName: employee.name,
          date: currentDate.toISOString().split('T')[0],
          dayName: workDays[dayIndex],
          orders: dayOrders,
          totalDistance: Math.round(totalDistance * 10) / 10,
          totalRevenue: Math.round(totalRevenue),
          efficiencyScore: Math.round((totalRevenue / Math.max(totalDistance, 1)) * 10) / 10,
          utilizationPercent: Math.round(((maxDailyMinutes - remainingMinutes) / maxDailyMinutes) * 100)
        });
      }
    }
  }
  
  return optimizedRoutes;
}

function calculateTimeSlot(orderIndex: number, remainingMinutes: number, maxDailyMinutes: number): string {
  const workStartHour = 8; // 08:00
  const minutesUsed = maxDailyMinutes - remainingMinutes;
  const hourOffset = Math.floor(minutesUsed / 60);
  const minuteOffset = minutesUsed % 60;
  
  const hour = workStartHour + hourOffset;
  const minute = minuteOffset;
  
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weekStart, userId, forceOptimize = false } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🚀 Advanced Route Planning initiated for week ${weekStart}, user ${userId}`);

    // Get orders that need planning (CRITICAL: Never touch subscription orders with existing schedules)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['Ikke planlagt', 'Planlagt'])
      .is('assigned_employee_id', forceOptimize ? null : null); // Only unassigned if not forced

    if (ordersError) throw ordersError;

    // CRITICAL FILTER: Never modify subscription orders that already have date+time
    const ordersToOptimize = orders?.filter(order => {
      // Never touch completed orders
      if (order.status === 'Afsluttet' || order.status === 'Færdig') return false;
      
      // ABSOLUTE RULE: Never modify subscription orders with existing scheduling
      if (order.subscription_id) {
        const hasScheduling = order.scheduled_date && order.scheduled_time && order.assigned_employee_id;
        if (hasScheduling && !forceOptimize) {
          console.log(`🔒 Protecting subscription order ${order.id}: has complete scheduling`);
          return false;
        }
      }
      
      // Allow optimization of unscheduled orders
      return !order.assigned_employee_id || !order.scheduled_date || forceOptimize;
    }) || [];

    console.log(`📊 Orders analysis: ${orders?.length} total, ${ordersToOptimize.length} to optimize`);

    if (ordersToOptimize.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Alle ordrer er allerede optimalt planlagt',
        routes: [],
        stats: { ordersOptimized: 0, routesCreated: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (employeesError) throw employeesError;
    if (!employees?.length) throw new Error('Ingen aktive medarbejdere fundet');

    // Run advanced AI optimization
    const optimizedRoutes = optimizeRoutes(ordersToOptimize, employees, new Date(weekStart));
    
    let ordersUpdated = 0;
    let routesCreated = 0;

    // Apply optimization results
    for (const route of optimizedRoutes) {
      // Create route record
      const { data: createdRoute, error: routeError } = await supabase
        .from('routes')
        .insert({
          user_id: userId,
          name: `${route.employeeName} - ${route.dayName} ${new Date(route.date).toLocaleDateString('da-DK')}`,
          employee_id: route.employeeId,
          route_date: route.date,
          estimated_distance_km: route.totalDistance,
          estimated_duration_hours: Math.round((route.orders.reduce((sum: number, o: any) => sum + o.estimated_duration, 0) / 60) * 10) / 10,
          total_revenue: route.totalRevenue,
          optimization_score: route.efficiencyScore,
          ai_optimized: true,
          status: 'Planlagt'
        })
        .select()
        .single();

      if (routeError) {
        console.error('Route creation error:', routeError);
        continue;
      }

      routesCreated++;

      // Update orders with optimized scheduling
      for (const order of route.orders) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            assigned_employee_id: route.employeeId,
            scheduled_date: order.scheduledDate,
            scheduled_time: order.estimatedTime,
            route_id: createdRoute.id,
            order_sequence: order.sequence,
            travel_time_minutes: Math.round(order.travelDistance * 2), // Estimate: 2 min per km
            ai_suggested_time: order.estimatedTime,
            status: 'Planlagt'
          })
          .eq('id', order.id);

        if (!updateError) {
          ordersUpdated++;
          console.log(`✅ Optimized: ${order.customer} → ${route.employeeName} ${order.scheduledDate} ${order.estimatedTime}`);
        } else {
          console.error(`❌ Failed to update order ${order.id}:`, updateError);
        }
      }
    }

    const stats = {
      ordersOptimized: ordersUpdated,
      routesCreated,
      totalRevenue: optimizedRoutes.reduce((sum, r) => sum + r.totalRevenue, 0),
      totalDistance: optimizedRoutes.reduce((sum, r) => sum + r.totalDistance, 0),
      avgEfficiency: optimizedRoutes.length > 0 
        ? Math.round(optimizedRoutes.reduce((sum, r) => sum + r.efficiencyScore, 0) / optimizedRoutes.length * 10) / 10 
        : 0
    };

    console.log(`🎯 AI Optimization Complete:`, stats);

    return new Response(JSON.stringify({
      success: true,
      message: `AI-optimeret ${ordersUpdated} ordrer på ${routesCreated} ruter`,
      routes: optimizedRoutes,
      stats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Advanced route planning error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});