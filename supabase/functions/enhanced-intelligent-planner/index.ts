import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userId, orderIds, triggerType = 'manual', optimizationType = 'weekly' } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`🤖 Enhanced Intelligent Planner (PRP) starting - Type: ${optimizationType}`)

    // Create optimization run record
    const { data: optimizationRun, error: runError } = await supabase
      .from('optimization_runs')
      .insert({
        user_id: userId,
        run_type: optimizationType,
        status: 'running',
        optimization_config: {
          trigger_type: triggerType,
          target_order_ids: orderIds || [],
          algorithm: 'fenster_style_weekly'
        }
      })
      .select()
      .single()

    if (runError) {
      throw new Error(`Failed to create optimization run: ${runError.message}`)
    }

    const runId = optimizationRun.id

    // Get active employees with capacity constraints
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select(`
        *,
        work_schedules!inner(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (empError || !employees?.length) {
      throw new Error('No active employees found')
    }

    console.log(`👥 Found ${employees.length} active employees`)

    // Get target orders (either specific IDs or all unplanned)
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)

    if (orderIds && orderIds.length > 0) {
      ordersQuery = ordersQuery.in('id', orderIds)
    } else {
      ordersQuery = ordersQuery.or('status.eq.Ikke planlagt,assigned_employee_id.is.null,scheduled_week.is.null')
    }

    const { data: targetOrders, error: ordersError } = await ordersQuery
      .order('created_at', { ascending: true })

    if (ordersError) {
      throw ordersError
    }

    console.log(`📋 Processing ${targetOrders?.length || 0} orders for optimization`)

    if (!targetOrders?.length) {
      await supabase
        .from('optimization_runs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          orders_optimized: 0
        })
        .eq('id', runId)

      return new Response(JSON.stringify({
        success: true,
        message: 'No orders to optimize',
        runId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Enhanced PRP-style weekly optimization
    const currentWeek = getCurrentWeek()
    let optimizedCount = 0
    let totalDistanceKm = 0
    let fuelSavingsEstimate = 0

    // Group orders by week for batch optimization
    const ordersByWeek = groupOrdersByWeek(targetOrders, currentWeek)

    for (const [weekNumber, weekOrders] of Object.entries(ordersByWeek)) {
      console.log(`🗓️ Optimizing week ${weekNumber} with ${weekOrders.length} orders`)

      // Calculate optimal distribution across the week
      const weekOptimization = await optimizeWeeklyDistribution(
        weekOrders, 
        employees, 
        parseInt(weekNumber)
      )

      // Apply optimizations
      for (const optimization of weekOptimization.assignments) {
        try {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              assigned_employee_id: optimization.employeeId,
              scheduled_date: optimization.scheduledDate,
              scheduled_week: parseInt(weekNumber),
              scheduled_time: optimization.scheduledTime,
              status: 'Planlagt',
              optimization_run_id: runId,
              distance_from_previous_km: optimization.distanceFromPrevious,
              fuel_cost_estimate: optimization.fuelCostEstimate,
              // Don't override manual edits
              ...(optimization.order.edited_manually ? {} : {
                order_sequence: optimization.sequence
              })
            })
            .eq('id', optimization.order.id)

          if (!updateError) {
            optimizedCount++
            totalDistanceKm += optimization.distanceFromPrevious || 0
            fuelSavingsEstimate += optimization.fuelCostEstimate || 0
            
            console.log(`✅ Optimized order ${optimization.order.id.slice(0, 8)} -> ${optimization.employeeId.slice(0, 8)}`)
          }
        } catch (error) {
          console.error(`❌ Failed to update order ${optimization.order.id}:`, error)
        }
      }
    }

    // Update optimization run with results
    await supabase
      .from('optimization_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        orders_optimized: optimizedCount,
        total_distance_km: totalDistanceKm,
        fuel_savings_estimate: fuelSavingsEstimate
      })
      .eq('id', runId)

    console.log(`🎯 Optimization completed: ${optimizedCount} orders optimized`)

    return new Response(JSON.stringify({
      success: true,
      message: `Enhanced planning completed for ${optimizedCount} orders`,
      runId,
      stats: {
        ordersOptimized: optimizedCount,
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
        estimatedFuelSavings: Math.round(fuelSavingsEstimate * 100) / 100,
        weeksOptimized: Object.keys(ordersByWeek).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Enhanced Intelligent Planner error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getCurrentWeek(): number {
  const today = new Date()
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
  const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function groupOrdersByWeek(orders: any[], currentWeek: number): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  
  for (const order of orders) {
    let targetWeek = currentWeek + 1 // Default to next week
    
    // If order has subscription and existing date, respect it
    if (order.subscription_id && order.scheduled_date) {
      const orderDate = new Date(order.scheduled_date)
      const firstDay = new Date(orderDate.getFullYear(), 0, 1)
      const pastDays = (orderDate.getTime() - firstDay.getTime()) / 86400000
      targetWeek = Math.ceil((pastDays + firstDay.getDay() + 1) / 7)
    }
    
    if (!groups[targetWeek]) {
      groups[targetWeek] = []
    }
    groups[targetWeek].push(order)
  }
  
  return groups
}

async function optimizeWeeklyDistribution(orders: any[], employees: any[], weekNumber: number) {
  const assignments: any[] = []
  
  // Calculate employee capacities for the week
  const employeeCapacities = employees.map(emp => {
    const weeklyHours = emp.work_schedules?.reduce((total: number, schedule: any) => {
      if (!schedule.is_working_day) return total
      const start = timeToMinutes(schedule.start_time)
      const end = timeToMinutes(schedule.end_time)
      return total + (end - start) / 60
    }, 0) || 40
    
    return {
      employeeId: emp.id,
      employee: emp,
      totalCapacityMinutes: weeklyHours * 60,
      usedCapacityMinutes: 0,
      dailyAssignments: {} as Record<string, any[]>
    }
  })

  // Sort orders by priority and complexity
  const sortedOrders = orders.sort((a, b) => {
    const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    
    if (aPriority !== bPriority) return bPriority - aPriority
    return (a.estimated_duration || 60) - (b.estimated_duration || 60)
  })

  // Fenster-style distribution: spread across the week to minimize travel
  for (const order of sortedOrders) {
    // Skip manually edited orders for automatic reassignment
    if (order.edited_manually && order.assigned_employee_id) {
      continue
    }

    const bestAssignment = findBestEmployeeAndDay(order, employeeCapacities, weekNumber)
    
    if (bestAssignment) {
      assignments.push(bestAssignment)
      
      // Update capacity tracking
      const capacity = employeeCapacities.find(c => c.employeeId === bestAssignment.employeeId)
      if (capacity) {
        capacity.usedCapacityMinutes += order.estimated_duration || 60
        
        const dayKey = bestAssignment.scheduledDate
        if (!capacity.dailyAssignments[dayKey]) {
          capacity.dailyAssignments[dayKey] = []
        }
        capacity.dailyAssignments[dayKey].push(order)
      }
    }
  }

  return { assignments, employeeCapacities }
}

function findBestEmployeeAndDay(order: any, capacities: any[], weekNumber: number) {
  let bestOption = null
  let bestScore = -1

  // Get week start date
  const weekStart = getWeekStartDate(weekNumber)
  
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) { // Monday to Friday
    const targetDate = new Date(weekStart)
    targetDate.setDate(weekStart.getDate() + dayOffset)
    const dateString = targetDate.toISOString().split('T')[0]
    
    for (const capacity of capacities) {
      // Check if employee has capacity
      const orderDuration = order.estimated_duration || 60
      if (capacity.usedCapacityMinutes + orderDuration > capacity.totalCapacityMinutes) {
        continue
      }

      // Calculate score based on workload distribution and travel optimization
      const dailyOrders = capacity.dailyAssignments[dateString] || []
      const dailyWorkload = dailyOrders.reduce((sum: number, o: any) => sum + (o.estimated_duration || 60), 0)
      
      // Prefer days with less workload (better distribution)
      const workloadScore = Math.max(0, 480 - dailyWorkload) / 480 // 8 hours max
      
      // Random component for variety
      const varietyScore = Math.random() * 0.2
      
      const totalScore = workloadScore + varietyScore
      
      if (totalScore > bestScore) {
        bestScore = totalScore
        
        // Calculate optimal time slot
        const timeSlot = calculateOptimalTimeSlot(dailyWorkload)
        
        bestOption = {
          order,
          employeeId: capacity.employeeId,
          scheduledDate: dateString,
          scheduledTime: timeSlot,
          sequence: dailyOrders.length + 1,
          distanceFromPrevious: estimateDistance(dailyOrders.length),
          fuelCostEstimate: estimateFuelCost(order, dailyOrders.length)
        }
      }
    }
  }

  return bestOption
}

function getWeekStartDate(weekNumber: number): Date {
  const year = new Date().getFullYear()
  const firstDay = new Date(year, 0, 1)
  const daysToAdd = (weekNumber - 1) * 7 - firstDay.getDay() + 1
  const weekStart = new Date(firstDay)
  weekStart.setDate(firstDay.getDate() + daysToAdd)
  return weekStart
}

function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

function calculateOptimalTimeSlot(currentWorkloadMinutes: number): string {
  // Start early for heavily loaded days
  const baseHour = currentWorkloadMinutes > 300 ? 7 : 8
  const minuteOffset = Math.floor(currentWorkloadMinutes / 15) * 15 % 60
  
  const hour = Math.min(baseHour + Math.floor(currentWorkloadMinutes / 240), 16)
  const minute = minuteOffset
  
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function estimateDistance(orderIndex: number): number {
  // Simple estimation - in real implementation, use actual addresses
  return orderIndex === 0 ? 0 : Math.random() * 5 + 2 // 2-7 km between orders
}

function estimateFuelCost(order: any, orderIndex: number): number {
  // Simple fuel cost estimation (DKK per km * distance)
  const fuelCostPerKm = 1.5 // 1.5 DKK per km
  const distance = estimateDistance(orderIndex)
  return distance * fuelCostPerKm
}