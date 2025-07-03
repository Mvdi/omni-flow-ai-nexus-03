
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Order {
  id: string;
  customer: string;
  address: string;
  latitude: number;
  longitude: number;
  estimated_duration: number;
  price: number;
  priority: string;
  assigned_employee_id?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  order_type: string;
}

interface Employee {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  max_hours_per_day: number;
  specialties: string[];
  preferred_areas: string[];
}

interface OptimizedRoute {
  employee_id: string;
  date: string;
  orders: Order[];
  total_distance_km: number;
  total_duration_hours: number;
  estimated_revenue: number;
  optimization_score: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weekStart, weekEnd, employeeId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Starting intelligent route optimization for week: ${weekStart} to ${weekEnd}`);

    // Get orders that need optimization
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .or(`status.eq.Ikke planlagt,scheduled_date.gte.${weekStart},scheduled_date.lte.${weekEnd}`)
      .order('priority', { ascending: false });

    if (employeeId) {
      ordersQuery = ordersQuery.eq('assigned_employee_id', employeeId);
    }

    const { data: orders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    // Get active employees
    let employeesQuery = supabase
      .from('employees')
      .select('*')
      .eq('is_active', true);

    if (employeeId) {
      employeesQuery = employeesQuery.eq('id', employeeId);
    }

    const { data: employees, error: employeesError } = await employeesQuery;
    if (employeesError) throw employeesError;

    // Get blocked time slots
    const { data: blockedSlots, error: blockedError } = await supabase
      .from('blocked_time_slots')
      .select('*')
      .gte('blocked_date', weekStart)
      .lte('blocked_date', weekEnd);

    if (blockedError) throw blockedError;

    console.log(`Processing ${orders?.length || 0} orders for ${employees?.length || 0} employees`);

    // Filter orders with valid coordinates
    const validOrders = orders?.filter(order => 
      order.latitude && order.longitude && 
      Math.abs(order.latitude) > 0.001 && Math.abs(order.longitude) > 0.001
    ) || [];

    const invalidOrders = orders?.filter(order => 
      !order.latitude || !order.longitude || 
      Math.abs(order.latitude) <= 0.001 || Math.abs(order.longitude) <= 0.001
    ) || [];

    console.log(`${validOrders.length} orders have valid coordinates, ${invalidOrders.length} need geocoding`);

    // Geocode invalid orders (fallback to Danish postal codes)
    for (const order of invalidOrders) {
      try {
        const geocoded = await geocodeAddress(order.address);
        if (geocoded) {
          order.latitude = geocoded.latitude;
          order.longitude = geocoded.longitude;
          validOrders.push(order);
          
          // Update order in database
          await supabase
            .from('orders')
            .update({ latitude: geocoded.latitude, longitude: geocoded.longitude })
            .eq('id', order.id);
        }
      } catch (error) {
        console.error(`Failed to geocode order ${order.id}:`, error);
      }
    }

    // Generate work days
    const workDays = generateWorkDays(new Date(weekStart), new Date(weekEnd));
    console.log(`Generated ${workDays.length} work days:`, workDays);

    // Perform intelligent VRP optimization
    const optimizedRoutes = await optimizeRoutes(validOrders, employees, workDays, blockedSlots);

    // Update orders with optimized assignments
    let updatedOrders = 0;
    let createdRoutes = 0;

    for (const route of optimizedRoutes) {
      // Create route
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert({
          name: `${employees?.find(e => e.id === route.employee_id)?.name} - ${route.date}`,
          employee_id: route.employee_id,
          route_date: route.date,
          estimated_distance_km: route.total_distance_km,
          estimated_duration_hours: route.total_duration_hours,
          total_revenue: route.estimated_revenue,
          status: 'Planlagt',
          ai_optimized: true,
          optimization_score: route.optimization_score,
          user_id: employees?.find(e => e.id === route.employee_id)?.user_id
        })
        .select()
        .single();

      if (routeError) {
        console.error('Error creating route:', routeError);
        continue;
      }

      createdRoutes++;

      // Update orders with route assignment
      for (let i = 0; i < route.orders.length; i++) {
        const order = route.orders[i];
        const timeSlot = calculateOptimalTimeSlot(route.date, i, route.orders.length);

        const { error: updateError } = await supabase
          .from('orders')
          .update({
            assigned_employee_id: route.employee_id,
            route_id: routeData.id,
            scheduled_date: route.date,
            scheduled_time: timeSlot,
            scheduled_week: getWeekNumber(new Date(route.date)),
            order_sequence: i + 1,
            status: 'Planlagt'
          })
          .eq('id', order.id);

        if (!updateError) {
          updatedOrders++;
        }
      }
    }

    const result = {
      success: true,
      ordersOptimized: updatedOrders,
      routesCreated: createdRoutes,
      totalDistance: optimizedRoutes.reduce((sum, route) => sum + route.total_distance_km, 0),
      totalRevenue: optimizedRoutes.reduce((sum, route) => sum + route.estimated_revenue, 0),
      averageOptimizationScore: optimizedRoutes.reduce((sum, route) => sum + route.optimization_score, 0) / Math.max(optimizedRoutes.length, 1),
      message: `Intelligent optimering fuldført: ${updatedOrders} ordrer optimeret på ${createdRoutes} ruter med ${Math.round(optimizedRoutes.reduce((sum, route) => sum + route.optimization_score, 0) / Math.max(optimizedRoutes.length, 1))}% effektivitet`
    };

    console.log('Intelligent optimization completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in intelligent route planner:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Intelligent VRP optimization algorithm
async function optimizeRoutes(
  orders: Order[], 
  employees: Employee[], 
  workDays: string[], 
  blockedSlots: any[]
): Promise<OptimizedRoute[]> {
  const routes: OptimizedRoute[] = [];
  
  // Group orders by geographical clusters
  const clusters = performGeographicalClustering(orders, employees.length);
  
  for (const employee of employees) {
    const employeeRoutes = await optimizeEmployeeRoutes(
      employee, 
      clusters, 
      workDays, 
      blockedSlots.filter(slot => !slot.employee_id || slot.employee_id === employee.id)
    );
    routes.push(...employeeRoutes);
  }
  
  return routes;
}

// Geographical clustering using k-means-like algorithm
function performGeographicalClustering(orders: Order[], numClusters: number): Order[][] {
  if (orders.length === 0) return [];
  if (orders.length <= numClusters) return orders.map(order => [order]);
  
  // Simple geographical clustering based on coordinates
  const clusters: Order[][] = Array(numClusters).fill(null).map(() => []);
  
  // Calculate geographical bounds
  const bounds = {
    minLat: Math.min(...orders.map(o => o.latitude)),
    maxLat: Math.max(...orders.map(o => o.latitude)),
    minLng: Math.min(...orders.map(o => o.longitude)),
    maxLng: Math.max(...orders.map(o => o.longitude))
  };
  
  // Assign orders to clusters based on geographical position
  for (const order of orders) {
    const latPercent = (order.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat);
    const lngPercent = (order.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng);
    
    // Simple grid-based clustering
    const clusterIndex = Math.floor((latPercent + lngPercent) / 2 * numClusters);
    const safeIndex = Math.min(clusterIndex, numClusters - 1);
    
    clusters[safeIndex].push(order);
  }
  
  return clusters.filter(cluster => cluster.length > 0);
}

// Optimize routes for a specific employee
async function optimizeEmployeeRoutes(
  employee: Employee,
  clusters: Order[][],
  workDays: string[],
  blockedSlots: any[]
): Promise<OptimizedRoute[]> {
  const routes: OptimizedRoute[] = [];
  
  // Assign clusters to work days
  const maxHoursPerDay = employee.max_hours_per_day || 8;
  
  for (let dayIndex = 0; dayIndex < workDays.length && clusters.length > 0; dayIndex++) {
    const workDay = workDays[dayIndex];
    const dayBlockedSlots = blockedSlots.filter(slot => slot.blocked_date === workDay);
    
    // Calculate available hours for this day
    const availableHours = calculateAvailableHours(workDay, dayBlockedSlots, maxHoursPerDay);
    
    if (availableHours < 1) continue; // Skip if less than 1 hour available
    
    // Find best cluster for this day
    const bestCluster = findBestClusterForDay(clusters, employee, availableHours);
    
    if (bestCluster && bestCluster.length > 0) {
      // Optimize order sequence within cluster
      const optimizedOrders = optimizeOrderSequence(bestCluster, employee);
      
      // Calculate route metrics
      const routeMetrics = calculateRouteMetrics(optimizedOrders);
      
      routes.push({
        employee_id: employee.id,
        date: workDay,
        orders: optimizedOrders,
        total_distance_km: routeMetrics.distance,
        total_duration_hours: routeMetrics.duration,
        estimated_revenue: routeMetrics.revenue,
        optimization_score: routeMetrics.score
      });
      
      // Remove used cluster
      const clusterIndex = clusters.indexOf(bestCluster);
      clusters.splice(clusterIndex, 1);
    }
  }
  
  return routes;
}

// Find the best cluster for a specific day and employee
function findBestClusterForDay(clusters: Order[][], employee: Employee, availableHours: number): Order[] | null {
  let bestCluster = null;
  let bestScore = -1;
  
  for (const cluster of clusters) {
    // Calculate cluster requirements
    const totalDuration = cluster.reduce((sum, order) => sum + (order.estimated_duration || 60), 0) / 60; // Convert to hours
    const totalRevenue = cluster.reduce((sum, order) => sum + order.price, 0);
    
    // Check if cluster fits in available time
    if (totalDuration > availableHours) continue;
    
    // Score based on revenue per hour and employee specialties
    let score = totalRevenue / Math.max(totalDuration, 1);
    
    // Bonus for matching employee specialties
    for (const order of cluster) {
      if (employee.specialties?.includes(order.order_type)) {
        score *= 1.2;
      }
    }
    
    // Bonus for high priority orders
    const priorityBonus = cluster.filter(o => o.priority === 'Høj' || o.priority === 'Kritisk').length * 10;
    score += priorityBonus;
    
    if (score > bestScore) {
      bestScore = score;
      bestCluster = cluster;
    }
  }
  
  return bestCluster;
}

// Optimize the sequence of orders within a cluster
function optimizeOrderSequence(orders: Order[], employee: Employee): Order[] {
  if (orders.length <= 1) return orders;
  
  // Start from employee's location or first order
  const startLat = employee.latitude || orders[0].latitude;
  const startLng = employee.longitude || orders[0].longitude;
  
  // Simple nearest neighbor heuristic
  const optimized: Order[] = [];
  const remaining = [...orders];
  
  let currentLat = startLat;
  let currentLng = startLng;
  
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = calculateDistance(currentLat, currentLng, remaining[0].latitude, remaining[0].longitude);
    
    for (let i = 1; i < remaining.length; i++) {
      const distance = calculateDistance(currentLat, currentLng, remaining[i].latitude, remaining[i].longitude);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    const nearestOrder = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearestOrder);
    currentLat = nearestOrder.latitude;
    currentLng = nearestOrder.longitude;
  }
  
  return optimized;
}

// Calculate route metrics
function calculateRouteMetrics(orders: Order[]): { distance: number; duration: number; revenue: number; score: number } {
  if (orders.length === 0) return { distance: 0, duration: 0, revenue: 0, score: 0 };
  
  let totalDistance = 0;
  let totalDuration = 0;
  let totalRevenue = 0;
  
  // Calculate total revenue
  totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
  
  // Calculate total duration (service time)
  totalDuration = orders.reduce((sum, order) => sum + (order.estimated_duration || 60), 0) / 60; // Convert to hours
  
  // Calculate total travel distance
  for (let i = 1; i < orders.length; i++) {
    const prevOrder = orders[i - 1];
    const currentOrder = orders[i];
    const distance = calculateDistance(
      prevOrder.latitude, prevOrder.longitude,
      currentOrder.latitude, currentOrder.longitude
    );
    totalDistance += distance;
  }
  
  // Calculate optimization score (revenue per km)
  const score = totalDistance > 0 ? (totalRevenue / totalDistance) * 100 : totalRevenue;
  
  return {
    distance: totalDistance,
    duration: totalDuration,
    revenue: totalRevenue,
    score: Math.min(score, 100) // Cap at 100%
  };
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate available hours for a day considering blocked slots
function calculateAvailableHours(workDay: string, blockedSlots: any[], maxHours: number): number {
  const totalMinutes = maxHours * 60;
  const blockedMinutes = blockedSlots.reduce((sum, slot) => {
    const start = new Date(`2000-01-01T${slot.start_time}`);
    const end = new Date(`2000-01-01T${slot.end_time}`);
    return sum + (end.getTime() - start.getTime()) / 60000;
  }, 0);
  
  return Math.max(0, (totalMinutes - blockedMinutes) / 60);
}

// Geocode address using DAWA (Danish Address API)
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!address) return null;
  
  try {
    const response = await fetch(`https://api.dataforsyningen.dk/adresser?q=${encodeURIComponent(address)}&format=json&struktur=mini`);
    const data = await response.json();
    
    if (data && data.length > 0 && data[0].adresse) {
      const coords = data[0].adresse.adgangspunkt?.koordinater;
      if (coords && coords.length === 2) {
        return {
          longitude: coords[0],
          latitude: coords[1]
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Utility functions
function generateWorkDays(startDate: Date, endDate: Date): string[] {
  const workDays: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      workDays.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function calculateOptimalTimeSlot(date: string, orderIndex: number, totalOrders: number): string {
  const startHour = 8; // 8 AM
  const endHour = 16; // 4 PM
  const totalHours = endHour - startHour;
  
  // Distribute orders evenly throughout the day
  const hourOffset = (totalHours / Math.max(totalOrders, 1)) * orderIndex;
  const targetHour = Math.floor(startHour + hourOffset);
  const targetMinute = Math.floor((hourOffset % 1) * 60);
  
  return `${targetHour.toString().padStart(2, '0')}:${targetMinute.toString().padStart(2, '0')}`;
}
