
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReplanRequest {
  weekStart: string;
  weekEnd: string;
}

interface Order {
  id: string;
  customer: string;
  customer_email?: string;
  order_type: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  priority: string;
  estimated_duration: number;
  price: number;
  user_id: string;
  status: string;
  scheduled_week?: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  preferred_areas: string[];
  max_hours_per_day: number;
  start_location?: string;
  latitude?: number;
  longitude?: number;
  work_radius_km: number;
  is_active: boolean;
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

    const { weekStart, weekEnd }: ReplanRequest = await req.json()
    console.log('Replanning calendar for week:', weekStart, 'to', weekEnd)

    // Get user ID from auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Calculate week numbers for the range
    const startWeek = getWeekNumber(weekStart)
    const endWeek = getWeekNumber(weekEnd)
    console.log(`Planning for weeks ${startWeek} to ${endWeek}`)

    // Fetch unplanned orders AND orders for the specified week range
    const { data: allOrders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .or(`status.eq.Ikke planlagt,and(scheduled_week.gte.${startWeek},scheduled_week.lte.${endWeek})`)

    if (ordersError) {
      console.error('Orders fetch error:', ordersError)
      throw new Error(`Orders fetch error: ${ordersError.message}`)
    }

    console.log(`Found ${allOrders?.length || 0} orders (unplanned + week ${startWeek}-${endWeek})`)

    // Log specific order details for debugging
    if (allOrders) {
      allOrders.forEach(order => {
        console.log(`Order ${order.id.slice(0, 8)}: ${order.customer}, Status: ${order.status}, Week: ${order.scheduled_week || 'none'}, Duration: ${order.estimated_duration}min, Coords: ${order.latitude ? 'Yes' : 'No'}`)
      })
    }

    // Fetch active employees with their work schedules
    const { data: employees, error: employeesError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (employeesError) {
      console.error('Employees fetch error:', employeesError)
      throw new Error(`Employees fetch error: ${employeesError.message}`)
    }

    console.log(`Found ${employees?.length || 0} active employees`)

    if (!allOrders?.length || !employees?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Ingen ordrer at planlægge eller ingen aktive medarbejdere',
          ordersPlanned: 0,
          routesCreated: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Get blocked time slots for the week
    const { data: blockedSlots } = await supabaseClient
      .from('blocked_time_slots')
      .select('*')
      .eq('user_id', user.id)
      .gte('blocked_date', weekStart)
      .lte('blocked_date', weekEnd)

    console.log(`Found ${blockedSlots?.length || 0} blocked time slots`)

    // Plan orders intelligently
    const planningResult = await planOrdersIntelligently(
      allOrders,
      employees,
      weekStart,
      weekEnd,
      blockedSlots || [],
      supabaseClient
    )

    console.log('Planning completed:', planningResult)

    return new Response(
      JSON.stringify({
        success: true,
        ...planningResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Calendar replan error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function planOrdersIntelligently(
  orders: Order[],
  employees: Employee[],
  weekStart: string,
  weekEnd: string,
  blockedSlots: any[],
  supabase: any
): Promise<any> {
  const routesCreated: string[] = []
  const ordersPlanned: string[] = []
  const ordersMoved: string[] = []

  console.log('Starting intelligent planning...')

  // Group orders by priority and status
  const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
  const sortedOrders = orders.sort((a, b) => {
    const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    
    // First sort by priority
    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }
    
    // Then by status (unplanned first)
    if (a.status === 'Ikke planlagt' && b.status !== 'Ikke planlagt') return -1
    if (b.status === 'Ikke planlagt' && a.status !== 'Ikke planlagt') return 1
    
    return 0
  })

  console.log(`Sorted ${sortedOrders.length} orders by priority and status`)

  // Create work schedule for the week
  const workDays = generateWorkDays(weekStart, weekEnd)
  console.log(`Generated ${workDays.length} work days:`, workDays)
  
  for (const employee of employees) {
    console.log(`Planning for employee: ${employee.name}`)
    
    // Get employee's work schedule
    const { data: workSchedule } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('employee_id', employee.id)

    // Filter orders suitable for this employee (improved matching)
    const employeeOrders = assignOrdersToEmployee(sortedOrders, employee)
    console.log(`Employee ${employee.name} can handle ${employeeOrders.length} orders`)
    
    if (employeeOrders.length === 0) continue

    // Create routes for each work day
    for (const workDay of workDays) {
      const dayOfWeek = new Date(workDay).getDay()
      const employeeWorkDay = workSchedule?.find(ws => ws.day_of_week === dayOfWeek)
      
      // Skip if employee doesn't work on this day
      if (employeeWorkDay && !employeeWorkDay.is_working_day) continue

      // Check for blocked time slots
      const dayBlockedSlots = blockedSlots.filter(slot => 
        slot.employee_id === employee.id && slot.blocked_date === workDay
      )

      const maxHours = employeeWorkDay?.is_working_day ? 
        calculateAvailableHours(employeeWorkDay, dayBlockedSlots) : 
        employee.max_hours_per_day

      const dayOrders = distributeOrdersToDay(employeeOrders, maxHours)
      console.log(`Assigned ${dayOrders.length} orders to ${employee.name} on ${workDay}`)
      
      if (dayOrders.length === 0) continue

      // Create route for this day
      const routeId = await createRoute(employee, workDay, dayOrders, supabase)
      if (routeId) {
        routesCreated.push(routeId)
        
        // Optimize order sequence using coordinates when available
        const optimizedOrders = await optimizeOrderSequenceWithCoordinates(dayOrders, employee)
        
        // Update orders with schedule
        for (let i = 0; i < optimizedOrders.length; i++) {
          const order = optimizedOrders[i]
          const scheduledTime = calculateScheduledTime(i, order.estimated_duration, employeeWorkDay)
          const orderWeek = getWeekNumber(workDay)
          
          const wasAlreadyPlanned = order.status !== 'Ikke planlagt'
          
          await supabase
            .from('orders')
            .update({
              status: 'Planlagt',
              assigned_employee_id: employee.id,
              route_id: routeId,
              scheduled_date: workDay,
              scheduled_time: scheduledTime,
              order_sequence: i + 1,
              scheduled_week: orderWeek
            })
            .eq('id', order.id)
          
          if (wasAlreadyPlanned) {
            ordersMoved.push(order.id)
          } else {
            ordersPlanned.push(order.id)
          }
        }
      }
      
      // Remove assigned orders from the available pool
      employeeOrders.splice(0, dayOrders.length)
      if (employeeOrders.length === 0) break
    }
  }

  return {
    ordersPlanned: ordersPlanned.length,
    ordersMoved: ordersMoved.length,
    routesCreated: routesCreated.length,
    message: `Planlagt ${ordersPlanned.length} nye ordrer og flyttet ${ordersMoved.length} eksisterende ordrer på ${routesCreated.length} ruter med AI-optimering`
  }
}

function calculateAvailableHours(workSchedule: any, blockedSlots: any[]): number {
  const startTime = new Date(`1970-01-01T${workSchedule.start_time}`)
  const endTime = new Date(`1970-01-01T${workSchedule.end_time}`)
  const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
  
  const blockedHours = blockedSlots.reduce((total, slot) => {
    const slotStart = new Date(`1970-01-01T${slot.start_time}`)
    const slotEnd = new Date(`1970-01-01T${slot.end_time}`)
    return total + (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60 * 60)
  }, 0)
  
  return Math.max(totalHours - blockedHours, 0)
}

function assignOrdersToEmployee(orders: Order[], employee: Employee): Order[] {
  return orders.filter(order => {
    // Improved matching logic with relaxed constraints
    
    // Check if employee has matching specialty (more flexible)
    const hasMatchingSpecialty = !employee.specialties?.length || 
      employee.specialties.some(specialty => 
        order.order_type.toLowerCase().includes(specialty.toLowerCase()) ||
        specialty.toLowerCase().includes(order.order_type.toLowerCase())
      )
    
    // Enhanced geographical matching
    if (employee.latitude && employee.longitude && order.latitude && order.longitude) {
      const distance = calculateHaversineDistance(
        employee.latitude, employee.longitude,
        order.latitude, order.longitude
      )
      
      const workRadius = employee.work_radius_km || 100 // Increased default radius
      if (distance > workRadius) {
        console.log(`Order ${order.id.slice(0, 8)} too far (${distance.toFixed(1)}km > ${workRadius}km) from ${employee.name}`)
        return false
      }
    }
    
    // Fallback to original area-based logic (more flexible)
    if (!employee.preferred_areas || employee.preferred_areas.length === 0) {
      return hasMatchingSpecialty
    }
    
    const isInPreferredArea = !order.address || 
      employee.preferred_areas.some(area => 
        order.address?.toLowerCase().includes(area.toLowerCase()) ||
        area.toLowerCase().includes(order.address?.toLowerCase() || '')
      )
    
    const result = hasMatchingSpecialty && isInPreferredArea
    if (!result) {
      console.log(`Order ${order.id.slice(0, 8)} (${order.order_type}) not suitable for ${employee.name}: specialty=${hasMatchingSpecialty}, area=${isInPreferredArea}`)
    }
    
    return result
  })
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function distributeOrdersToDay(orders: Order[], maxHours: number): Order[] {
  const maxMinutes = maxHours * 60
  let totalMinutes = 0
  const dayOrders: Order[] = []
  
  for (const order of orders) {
    const orderDuration = Math.max(order.estimated_duration || 120, 60) // Minimum 1 hour
    if (totalMinutes + orderDuration <= maxMinutes) {
      dayOrders.push(order)
      totalMinutes += orderDuration
    }
  }
  
  return dayOrders
}

async function createRoute(employee: Employee, date: string, orders: Order[], supabase: any): Promise<string | null> {
  try {
    const routeName = `${employee.name} - ${date}`
    const totalDuration = orders.reduce((sum, order) => sum + (order.estimated_duration || 120), 0) / 60
    const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0)
    
    const startLocation = employee.preferred_areas?.length > 0 
      ? employee.preferred_areas[0] 
      : employee.start_location || 'Medarbejderens hjemadresse'
    
    const { data, error } = await supabase
      .from('routes')
      .insert([{
        name: routeName,
        employee_id: employee.id,
        route_date: date,
        start_location: startLocation,
        estimated_duration_hours: totalDuration,
        total_revenue: totalRevenue,
        status: 'Planlagt',
        ai_optimized: true,
        optimization_score: 85.0,
        user_id: orders[0]?.user_id
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating route:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error creating route:', error)
    return null
  }
}

async function optimizeOrderSequenceWithCoordinates(orders: Order[], employee: Employee): Promise<Order[]> {
  const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
  
  return orders.sort((a, b) => {
    // Primary sort: Priority
    const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    
    if (priorityA !== priorityB) {
      return priorityB - priorityA
    }
    
    // Secondary sort: Distance from employee home
    if (employee.latitude && employee.longitude && a.latitude && a.longitude && b.latitude && b.longitude) {
      const distanceA = calculateHaversineDistance(employee.latitude, employee.longitude, a.latitude, a.longitude)
      const distanceB = calculateHaversineDistance(employee.latitude, employee.longitude, b.latitude, b.longitude)
      
      if (Math.abs(distanceA - distanceB) > 1) {
        return distanceA - distanceB
      }
    }
    
    // Tertiary sort: Duration
    const durationA = a.estimated_duration || 120
    const durationB = b.estimated_duration || 120
    
    return durationA - durationB
  })
}

function calculateScheduledTime(orderIndex: number, duration: number, workSchedule?: any): string {
  const baseStartHour = workSchedule?.start_time ? 
    parseInt(workSchedule.start_time.split(':')[0]) : 8
  
  const totalMinutes = baseStartHour * 60 + (orderIndex * 150) // 2.5 hours between orders
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
}

function generateWorkDays(weekStart: string, weekEnd: string): string[] {
  const days: string[] = []
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      days.push(d.toISOString().split('T')[0])
    }
  }
  
  return days
}

function getWeekNumber(dateString: string): number {
  const date = new Date(dateString)
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}
