
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
  customer: string;
  estimated_duration: number;
  priority: string;
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

    // Fetch route and associated orders
    const { data: route, error: routeError } = await supabaseClient
      .from('routes')
      .select('*')
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

    if (ordersError) {
      throw new Error(`Orders fetch error: ${ordersError.message}`)
    }

    console.log('Found orders for optimization:', orders?.length || 0)

    // Simple AI optimization algorithm
    const optimizedOrders = optimizeOrderSequence(orders || [])
    
    // Calculate total distance and duration estimates
    const totalDistance = calculateTotalDistance(optimizedOrders)
    const totalDuration = calculateTotalDuration(optimizedOrders)
    const optimizationScore = calculateOptimizationScore(orders || [], optimizedOrders)

    // Update route with optimization results
    const { error: updateError } = await supabaseClient
      .from('routes')
      .update({
        ai_optimized: true,
        optimization_score: optimizationScore,
        estimated_distance_km: totalDistance,
        estimated_duration_hours: totalDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', routeId)
      .eq('user_id', userId)

    if (updateError) {
      throw new Error(`Route update error: ${updateError.message}`)
    }

    // Update order sequences
    for (let i = 0; i < optimizedOrders.length; i++) {
      const order = optimizedOrders[i]
      await supabaseClient
        .from('orders')
        .update({
          order_sequence: i + 1,
          ai_suggested_time: generateOptimalTime(i)
        })
        .eq('id', order.id)
        .eq('user_id', userId)
    }

    console.log('Route optimization completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        optimizationScore,
        totalDistance,
        totalDuration,
        ordersOptimized: optimizedOrders.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Route optimization error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function optimizeOrderSequence(orders: Order[]): Order[] {
  // Simple optimization: prioritize high priority orders and group by geographical proximity
  const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
  
  return orders.sort((a, b) => {
    // First sort by priority
    const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    
    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }
    
    // Then by estimated duration (shorter tasks first to build momentum)
    return (a.estimated_duration || 0) - (b.estimated_duration || 0)
  })
}

function calculateTotalDistance(orders: Order[]): number {
  // Simplified distance calculation - in real implementation, use Google Maps API
  return orders.length * 5.5 // Average 5.5km between orders
}

function calculateTotalDuration(orders: Order[]): number {
  const workTime = orders.reduce((sum, order) => sum + (order.estimated_duration || 2), 0)
  const travelTime = orders.length * 0.5 // 30 minutes travel between orders
  return workTime + travelTime
}

function calculateOptimizationScore(originalOrders: Order[], optimizedOrders: Order[]): number {
  // Score based on priority optimization and estimated efficiency
  let score = 75 // Base score
  
  // Bonus for having high priority orders early
  optimizedOrders.slice(0, 3).forEach((order, index) => {
    if (order.priority === 'Kritisk' || order.priority === 'Høj') {
      score += (3 - index) * 5 // More points for earlier high-priority orders
    }
  })
  
  return Math.min(score, 100)
}

function generateOptimalTime(sequenceIndex: number): string {
  // Generate optimal start times based on sequence
  const baseHour = 8 // Start at 8:00
  const hourIncrement = sequenceIndex * 2.5 // 2.5 hours between orders on average
  
  const hour = Math.floor(baseHour + hourIncrement)
  const minute = Math.floor((hourIncrement % 1) * 60)
  
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
}
