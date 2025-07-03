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
    const { userId } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`🤖 Intelligent auto-planner starting for user ${userId}`)

    // Get active employees with their locations
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (empError || !employees?.length) {
      throw new Error('No active employees found')
    }

    console.log(`👥 Found ${employees.length} active employees`)

    // Get unplanned orders and orders missing critical data
    const { data: unplannedOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .or('status.eq.Ikke planlagt,assigned_employee_id.is.null,scheduled_date.is.null,scheduled_week.is.null')
      .order('created_at', { ascending: true })

    if (ordersError) {
      throw ordersError
    }

    if (!unplannedOrders?.length) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No unplanned orders found',
        planned: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found ${unplannedOrders.length} unplanned orders`)

    // Get current week number
    const today = new Date()
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
    const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000
    const currentWeek = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)

    let plannedCount = 0

    // Process each unplanned order
    for (const order of unplannedOrders) {
      console.log(`🔄 Processing order ${order.id.slice(0, 8)} for ${order.customer}`)

      // Geocode address if missing coordinates
      if (!order.latitude || !order.longitude) {
        console.log(`📍 Geocoding address: ${order.address}`)
        try {
          const geocodeResult = await geocodeAddress(order.address)
          if (geocodeResult) {
            await supabase
              .from('orders')
              .update({
                latitude: geocodeResult.lat,
                longitude: geocodeResult.lng,
                geocoded_at: new Date().toISOString()
              })
              .eq('id', order.id)
            
            order.latitude = geocodeResult.lat
            order.longitude = geocodeResult.lng
            console.log(`✅ Geocoded: ${geocodeResult.lat}, ${geocodeResult.lng}`)
          }
        } catch (error) {
          console.error(`❌ Geocoding failed for ${order.address}:`, error)
        }
      }

      // Calculate optimal week and date
      let targetWeek = currentWeek
      let targetDate = new Date()
      
      // If order has subscription_id, try to keep original date
      if (order.subscription_id && order.scheduled_date) {
        targetDate = new Date(order.scheduled_date)
        const orderFirstDay = new Date(targetDate.getFullYear(), 0, 1)
        const orderPastDays = (targetDate.getTime() - orderFirstDay.getTime()) / 86400000
        targetWeek = Math.ceil((orderPastDays + orderFirstDay.getDay() + 1) / 7)
      } else {
        // For new orders, schedule for current week
        targetWeek = currentWeek
        targetDate = new Date()
      }

      // Find best employee based on workload and location
      let bestEmployee = employees[0]
      let lowestWorkload = Infinity
      let bestDistance = Infinity

      for (const employee of employees) {
        // Get current workload for target week
        const { data: employeeOrders } = await supabase
          .from('orders')
          .select('estimated_duration, scheduled_date')
          .eq('assigned_employee_id', employee.id)
          .eq('scheduled_week', targetWeek)

        const totalMinutes = employeeOrders?.reduce((sum, o) => sum + (o.estimated_duration || 60), 0) || 0
        
        // Calculate distance if both have coordinates
        let distance = 0
        if (employee.latitude && employee.longitude && order.latitude && order.longitude) {
          distance = calculateDistance(
            employee.latitude, employee.longitude,
            order.latitude, order.longitude
          )
        }
        
        // Score based on workload (70%) and distance (30%)
        const workloadScore = totalMinutes
        const distanceScore = distance * 1000 // Convert km to comparable scale
        const totalScore = workloadScore * 0.7 + distanceScore * 0.3
        
        if (totalScore < (lowestWorkload * 0.7 + bestDistance * 1000 * 0.3)) {
          lowestWorkload = totalMinutes
          bestDistance = distance
          bestEmployee = employee
        }
      }

      // Find best day in the target week for this employee
      const weekDays = getWeekDays(targetDate)
      let bestDay = weekDays[0]
      let lowestDayWorkload = Infinity

      for (const day of weekDays) {
        const { data: dayOrders } = await supabase
          .from('orders')
          .select('estimated_duration')
          .eq('assigned_employee_id', bestEmployee.id)
          .eq('scheduled_date', day.toISOString().split('T')[0])

        const dayMinutes = dayOrders?.reduce((sum, o) => sum + (o.estimated_duration || 60), 0) || 0
        
        if (dayMinutes < lowestDayWorkload) {
          lowestDayWorkload = dayMinutes
          bestDay = day
        }
      }

      // Calculate optimal time slot based on existing orders for that day
      const timeSlot = await calculateDayTimeSlot(supabase, bestEmployee.id, bestDay.toISOString().split('T')[0])

      // Update the order
      const updateData = {
        assigned_employee_id: bestEmployee.id,
        scheduled_date: bestDay.toISOString().split('T')[0],
        scheduled_week: targetWeek,
        scheduled_time: timeSlot,
        status: 'Planlagt'
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (!updateError) {
        plannedCount++
        console.log(`✅ Assigned order ${order.id.slice(0, 8)} to ${bestEmployee.name} on ${bestDay.toISOString().split('T')[0]} at ${timeSlot}`)
      } else {
        console.error(`❌ Failed to assign order ${order.id}:`, updateError)
      }
    }

    // Optimize routes for affected weeks
    await optimizeRoutesForWeeks(supabase, userId, [currentWeek, currentWeek + 1, currentWeek + 2])

    return new Response(JSON.stringify({
      success: true,
      message: `Intelligently planned ${plannedCount} orders`,
      planned: plannedCount,
      employees: employees.map(e => e.name)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Intelligent auto-planner error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function calculateOptimalTimeSlot(currentWorkload: number): string {
  // Start early for heavily loaded days, later for light days
  const baseHour = currentWorkload > 300 ? 7 : 8 // If >5 hours of work, start at 7am
  const minuteOffset = Math.floor(currentWorkload / 60) % 60 // Spread throughout day
  
  const hour = Math.min(baseHour + Math.floor(minuteOffset / 60), 16)
  const minute = minuteOffset % 60
  
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

async function optimizeRoutesForWeeks(supabase: any, userId: string, weeks: number[]) {
  console.log(`🛣️ Optimizing routes for weeks: ${weeks.join(', ')}`)
  
  for (const week of weeks) {
    // Get all orders for this week
    const { data: weekOrders } = await supabase
      .from('orders')
      .select('*, employees!orders_assigned_employee_id_fkey(name, latitude, longitude)')
      .eq('user_id', userId)
      .eq('scheduled_week', week)
      .not('assigned_employee_id', 'is', null)

    if (!weekOrders?.length) continue

    // Group by employee
    const ordersByEmployee = weekOrders.reduce((acc: any, order: any) => {
      const empId = order.assigned_employee_id
      if (!acc[empId]) acc[empId] = []
      acc[empId].push(order)
      return acc
    }, {})

    // Optimize each employee's route
    for (const [employeeId, orders] of Object.entries(ordersByEmployee)) {
      await optimizeEmployeeRoute(supabase, employeeId, orders as any[], week)
    }
  }
}

async function optimizeEmployeeRoute(supabase: any, employeeId: string, orders: any[], week: number) {
  if (orders.length <= 1) return

  console.log(`🎯 Optimizing route for employee ${employeeId}, ${orders.length} orders`)

  // Sort orders by priority and estimated duration for simple optimization
  orders.sort((a, b) => {
    const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    
    if (aPriority !== bPriority) return bPriority - aPriority
    return (a.estimated_duration || 60) - (b.estimated_duration || 60)
  })

  // Assign optimized time slots
  let currentTime = 8 * 60 // Start at 8:00 AM
  
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i]
    const duration = order.estimated_duration || 60
    
    const hour = Math.floor(currentTime / 60)
    const minute = currentTime % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    
    // Update order with optimized time
    await supabase
      .from('orders')
      .update({
        scheduled_time: timeString,
        order_sequence: i + 1
      })
      .eq('id', order.id)

    // Add duration + travel time for next order
    currentTime += duration + 15 // 15 minutes travel time between orders
    
    // Don't go past 16:00
    if (currentTime > 16 * 60) {
      currentTime = 16 * 60
    }
  }

  console.log(`✅ Optimized ${orders.length} orders for employee ${employeeId}`)
}

// Geocoding function using Danish Address Web API (DAWA)
async function geocodeAddress(address: string) {
  if (!address) return null
  
  try {
    const encodedAddress = encodeURIComponent(address)
    const response = await fetch(`https://api.dataforsyningen.dk/adresser?q=${encodedAddress}&format=json&struktur=mini`)
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      const result = data[0]
      return {
        lat: result.y,
        lng: result.x
      }
    }
    
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

// Get weekdays for a given week
function getWeekDays(date: Date): Date[] {
  const monday = new Date(date)
  const dayOfWeek = monday.getDay()
  const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  monday.setDate(diff)
  
  const weekDays = []
  for (let i = 0; i < 5; i++) { // Monday to Friday
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    weekDays.push(day)
  }
  return weekDays
}

// Calculate optimal time slot for a specific day
async function calculateDayTimeSlot(supabase: any, employeeId: string, date: string): Promise<string> {
  // Get existing orders for this employee on this date
  const { data: dayOrders } = await supabase
    .from('orders')
    .select('scheduled_time, estimated_duration')
    .eq('assigned_employee_id', employeeId)
    .eq('scheduled_date', date)
    .not('scheduled_time', 'is', null)
    .order('scheduled_time', { ascending: true })

  if (!dayOrders || dayOrders.length === 0) {
    return '08:00'
  }

  // Find the next available time slot
  let currentTime = 8 * 60 // Start at 8:00 AM

  for (const order of dayOrders) {
    const orderTime = timeStringToMinutes(order.scheduled_time)
    const orderDuration = order.estimated_duration || 60
    const orderEnd = orderTime + orderDuration + 15 // Add 15 min travel time

    if (currentTime < orderTime) {
      // We found a gap
      break
    }
    
    currentTime = Math.max(currentTime, orderEnd)
  }

  // Don't schedule past 16:00
  if (currentTime >= 16 * 60) {
    currentTime = 16 * 60 - 60 // Last hour of the day
  }

  const hour = Math.floor(currentTime / 60)
  const minute = currentTime % 60
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

// Convert time string to minutes
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}
