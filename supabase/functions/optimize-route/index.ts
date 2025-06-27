import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptimizationRequest {
  routeId: string;
  userId: string;
}

interface Order {
  id: string;
  address: string;
  latitude?: number;
  longitude?: number;
  customer: string;
  estimated_duration: number;
  priority: string;
  order_sequence?: number;
}

interface Employee {
  latitude?: number;
  longitude?: number;
  start_location?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { routeId, userId }: OptimizationRequest = await req.json()
    console.log('Optimizing route:', routeId, 'for user:', userId)

    // Fetch route and associated orders with coordinates
    const { data: route, error: routeError } = await supabaseClient
      .from('routes')
      .select(`
        *,
        employees (
          latitude,
          longitude,
          start_location
        )
      `)
      .eq('id', routeId)
      .eq('user_id', userId)
      .single()

    if (routeError) {
      throw new Error(`Route fetch error: ${routeError.message}`)
    }

    const { data: orders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('route_id', routeId)
      .eq('user_id', userId)
      .order('order_sequence', { ascending: true })

    if (ordersError) {
      throw new Error(`Orders fetch error: ${ordersError.message}`)
    }

    console.log('Found orders for optimization:', orders?.length || 0)

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No orders found for this route',
          optimizationScore: 0,
          totalDistance: 0,
          totalDuration: 0,
          ordersOptimized: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Optimize order sequence using coordinates when available
    const optimizedOrders = await optimizeOrderSequenceWithCoordinates(orders, route.employees)
    
    // Calculate metrics with improved coordinate-based calculations
    const totalDistance = await calculateTotalDistanceWithCoordinates(optimizedOrders, route.employees)
    const totalDuration = calculateTotalDuration(optimizedOrders)
    const optimizationScore = calculateOptimizationScore(orders, optimizedOrders)
    
    // Calculate travel times between orders using coordinates
    const travelTimes = await calculateTravelTimesWithCoordinates(optimizedOrders, route.employees)

    // Update route with optimization results
    const { error: updateError } = await supabaseClient
      .from('routes')
      .update({
        ai_optimized: true,
        optimization_score: optimizationScore,
        estimated_distance_km: totalDistance,
        estimated_duration_hours: totalDuration,
        total_travel_time_minutes: travelTimes.totalTravelTime,
        mapbox_route_data: {
          optimized_at: new Date().toISOString(),
          total_distance_km: totalDistance,
          total_duration_hours: totalDuration,
          travel_segments: travelTimes.segments,
          coordinate_based_optimization: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', routeId)
      .eq('user_id', userId)

    if (updateError) {
      throw new Error(`Route update error: ${updateError.message}`)
    }

    // Update order sequences and travel times
    for (let i = 0; i < optimizedOrders.length; i++) {
      const order = optimizedOrders[i]
      const travelTime = travelTimes.segments[i]?.duration || 0
      
      await supabaseClient
        .from('orders')
        .update({
          order_sequence: i + 1,
          travel_time_minutes: travelTime,
          ai_suggested_time: generateOptimalTime(i, order.estimated_duration, travelTime)
        })
        .eq('id', order.id)
        .eq('user_id', userId)
    }

    console.log('Route optimization completed successfully with coordinate-based improvements')

    return new Response(
      JSON.stringify({
        success: true,
        optimizationScore,
        totalDistance,
        totalDuration,
        ordersOptimized: optimizedOrders.length,
        totalTravelTime: travelTimes.totalTravelTime,
        fuelCostEstimate: calculateFuelCost(totalDistance),
        coordinateBasedOptimization: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Route optimization error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function optimizeOrderSequenceWithCoordinates(orders: Order[], employee: Employee): Promise<Order[]> {
  // Enhanced optimization algorithm using coordinates when available
  const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
  
  return orders.sort((a, b) => {
    // Primary sort: Priority
    const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    
    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }
    
    // Secondary sort: Distance from employee home when coordinates are available
    if (employee?.latitude && employee?.longitude && a.latitude && a.longitude && b.latitude && b.longitude) {
      const distanceA = calculateHaversineDistance(employee.latitude, employee.longitude, a.latitude, a.longitude)
      const distanceB = calculateHaversineDistance(employee.latitude, employee.longitude, b.latitude, b.longitude)
      
      if (Math.abs(distanceA - distanceB) > 0.5) { // Only if significant difference (> 500m)
        return distanceA - distanceB // Closer orders first
      }
    }
    
    // Tertiary sort: Duration (shorter tasks first for momentum)
    const durationA = a.estimated_duration || 120
    const durationB = b.estimated_duration || 120
    
    if (Math.abs(durationA - durationB) > 30) { // Only if significant difference
      return durationA - durationB
    }
    
    // Fallback to geographical proximity (simplified)
    if (a.address && b.address) {
      const areaA = extractArea(a.address)
      const areaB = extractArea(b.address)
      return areaA.localeCompare(areaB)
    }
    
    return 0
  })
}

async function calculateTotalDistanceWithCoordinates(orders: Order[], employee: Employee): Promise<number> {
  if (orders.length <= 1) return 0
  
  let totalDistance = 0
  
  // Check if we have coordinate data for precise calculations
  const hasCoordinates = orders.every(order => order.latitude && order.longitude)
  const hasEmployeeCoords = employee?.latitude && employee?.longitude
  
  if (hasCoordinates && hasEmployeeCoords) {
    // Precise coordinate-based calculation
    console.log('Using coordinate-based distance calculation')
    
    // Distance from employee home to first order
    totalDistance += calculateHaversineDistance(
      employee.latitude, employee.longitude,
      orders[0].latitude!, orders[0].longitude!
    )
    
    // Distance between consecutive orders
    for (let i = 0; i < orders.length - 1; i++) {
      const currentOrder = orders[i]
      const nextOrder = orders[i + 1]
      
      const distance = calculateHaversineDistance(
        currentOrder.latitude!, currentOrder.longitude!,
        nextOrder.latitude!, nextOrder.longitude!
      )
      totalDistance += distance
    }
    
    // Return distance (assuming employee goes back home)
    totalDistance += calculateHaversineDistance(
      orders[orders.length - 1].latitude!, orders[orders.length - 1].longitude!,
      employee.latitude, employee.longitude
    )
  } else {
    // Fallback to address-based estimation
    console.log('Using address-based distance estimation')
    
    // Base distance from office to first location
    totalDistance += 5 // km
    
    // Distance between orders (simplified)
    for (let i = 0; i < orders.length - 1; i++) {
      const currentOrder = orders[i]
      const nextOrder = orders[i + 1]
      
      const distance = estimateDistance(currentOrder.address, nextOrder.address)
      totalDistance += distance
    }
    
    // Return distance
    totalDistance += 5 // km back to office
  }
  
  return Math.round(totalDistance * 10) / 10 // Round to 1 decimal
}

// Haversine formula to calculate distance between two coordinate points
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

async function calculateTravelTimesWithCoordinates(orders: Order[], employee: Employee): Promise<{totalTravelTime: number, segments: any[]}> {
  const segments = []
  let totalTravelTime = 0
  
  const hasCoordinates = orders.every(order => order.latitude && order.longitude)
  const hasEmployeeCoords = employee?.latitude && employee?.longitude
  
  for (let i = 0; i < orders.length; i++) {
    let travelTime = 0
    let distance = 0
    
    if (i === 0) {
      // Travel from employee home to first order
      if (hasEmployeeCoords && orders[0].latitude && orders[0].longitude) {
        distance = calculateHaversineDistance(
          employee.latitude, employee.longitude,
          orders[0].latitude, orders[0].longitude
        )
        travelTime = Math.round(distance * 2.5) // 2.5 minutes per km in city traffic
      } else {
        travelTime = 15 // Default minutes
        distance = 6 // Default km
      }
    } else {
      // Travel between orders
      const prevOrder = orders[i - 1]
      const currentOrder = orders[i]
      
      if (hasCoordinates && prevOrder.latitude && prevOrder.longitude && currentOrder.latitude && currentOrder.longitude) {
        distance = calculateHaversineDistance(
          prevOrder.latitude, prevOrder.longitude,
          currentOrder.latitude, currentOrder.longitude
        )
        travelTime = Math.round(distance * 2.5) // 2.5 minutes per km in city traffic
      } else {
        travelTime = estimateTravelTime(prevOrder.address, currentOrder.address)
        distance = travelTime * 0.4 // Rough km estimate
      }
    }
    
    segments.push({
      from: i === 0 ? 'employee_home' : orders[i - 1].id,
      to: orders[i].id,
      duration: travelTime,
      distance: distance,
      coordinate_based: hasCoordinates && (i === 0 ? hasEmployeeCoords : true)
    })
    
    totalTravelTime += travelTime
  }
  
  return { totalTravelTime, segments }
}

function calculateTotalDuration(orders: Order[]): number {
  const workTime = orders.reduce((sum, order) => sum + (order.estimated_duration || 120), 0) / 60
  const travelTime = orders.length * 0.4 // 24 minutes average travel between orders
  return Math.round((workTime + travelTime) * 10) / 10
}

function calculateOptimizationScore(originalOrders: Order[], optimizedOrders: Order[]): number {
  let score = 60 // Base score
  
  // Check if high priority orders are moved earlier
  const criticalOrders = optimizedOrders.filter(o => o.priority === 'Kritisk')
  const highPriorityOrders = optimizedOrders.filter(o => o.priority === 'Høj')
  
  // Bonus for having critical orders in first 3 positions
  criticalOrders.forEach((order, index) => {
    const position = optimizedOrders.findIndex(o => o.id === order.id)
    if (position < 3) {
      score += 15 - (position * 3) // More points for earlier positions
    }
  })
  
  // Bonus for having high priority orders early
  highPriorityOrders.forEach((order, index) => {
    const position = optimizedOrders.findIndex(o => o.id === order.id)
    if (position < 5) {
      score += 8 - (position * 1.5)
    }
  })
  
  // Bonus for geographical clustering
  const geographicalScore = calculateGeographicalScore(optimizedOrders)
  score += geographicalScore
  
  // Efficiency bonus based on duration distribution
  const efficiencyScore = calculateEfficiencyScore(optimizedOrders)
  score += efficiencyScore
  
  return Math.min(Math.max(score, 0), 100)
}

function calculateGeographicalScore(orders: Order[]): number {
  if (orders.length <= 1) return 0
  
  let score = 0
  const areas = orders.map(o => extractArea(o.address)).filter(Boolean)
  
  // Count consecutive orders in same area
  for (let i = 0; i < areas.length - 1; i++) {
    if (areas[i] === areas[i + 1]) {
      score += 5 // Bonus for consecutive orders in same area
    }
  }
  
  return Math.min(score, 20)
}

function calculateEfficiencyScore(orders: Order[]): number {
  if (orders.length === 0) return 0
  
  const durations = orders.map(o => o.estimated_duration || 120)
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
  
  // Bonus for balanced task distribution
  const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length
  const balanceScore = Math.max(0, 15 - (variance / 1000)) // Less variance = better balance
  
  return Math.min(balanceScore, 15)
}

function generateOptimalTime(sequenceIndex: number, duration: number, travelTime: number): string {
  const baseHour = 8 // Start at 8:00 AM
  const totalMinutes = baseHour * 60 + (sequenceIndex * (duration + travelTime))
  
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60
  
  // Ensure we don't go past working hours (17:00)
  const finalHour = Math.min(hour, 16)
  const finalMinute = finalHour === 16 ? Math.min(minute, 0) : minute
  
  return `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}:00`
}

function estimateDistance(address1?: string, address2?: string): number {
  if (!address1 || !address2) return 8 // Default 8km
  
  const area1 = extractArea(address1)
  const area2 = extractArea(address2)
  
  if (area1 === area2) return 3 // Same area
  
  // Simple distance matrix for Copenhagen areas
  const distances: Record<string, Record<string, number>> = {
    'København': { 'Frederiksberg': 4, 'Gentofte': 12, 'Gladsaxe': 15 },
    'Frederiksberg': { 'København': 4, 'Gentofte': 10, 'Gladsaxe': 12 },
    'Gentofte': { 'København': 12, 'Frederiksberg': 10, 'Gladsaxe': 8 },
    'Gladsaxe': { 'København': 15, 'Frederiksberg': 12, 'Gentofte': 8 }
  }
  
  return distances[area1]?.[area2] || 10 // Default 10km
}

function estimateTravelTime(address1?: string, address2?: string): number {
  const distance = estimateDistance(address1, address2)
  return Math.round(distance * 2.5) // Rough estimate: 2.5 minutes per km in city traffic
}

function extractArea(address: string): string {
  const areas = ['København', 'Frederiksberg', 'Gentofte', 'Gladsaxe', 'Herlev', 'Rødovre']
  return areas.find(area => address.toLowerCase().includes(area.toLowerCase())) || 'Unknown'
}

function calculateFuelCost(distanceKm: number): number {
  const fuelPricePerLiter = 12.5 // DKK
  const kmPerLiter = 15 // Average fuel efficiency
  return Math.round((distanceKm / kmPerLiter) * fuelPricePerLiter * 100) / 100
}
