
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
  priority: string;
  estimated_duration: number;
  price: number;
  user_id: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  preferred_areas: string[];
  max_hours_per_day: number;
  start_location?: string;
  work_radius_km: number;
  is_active: boolean;
}

interface MapboxRoute {
  distance: number;
  duration: number;
  geometry: any;
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

    // Fetch unplanned orders
    const { data: unplannedOrders, error: ordersError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'Ikke planlagt')

    if (ordersError) {
      throw new Error(`Orders fetch error: ${ordersError.message}`)
    }

    // Fetch active employees
    const { data: employees, error: employeesError } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (employeesError) {
      throw new Error(`Employees fetch error: ${employeesError.message}`)
    }

    console.log(`Found ${unplannedOrders?.length || 0} unplanned orders and ${employees?.length || 0} employees`)

    if (!unplannedOrders?.length || !employees?.length) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No orders to plan or no active employees',
          ordersPlanned: 0,
          routesCreated: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Plan orders intelligently
    const planningResult = await planOrdersIntelligently(
      unplannedOrders,
      employees,
      weekStart,
      weekEnd,
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
  supabase: any
): Promise<any> {
  const routesCreated: string[] = []
  const ordersPlanned: string[] = []

  // Group orders by priority and type
  const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
  const sortedOrders = orders.sort((a, b) => {
    const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    return priorityB - priorityA
  })

  // Create work schedule for the week
  const workDays = generateWorkDays(weekStart, weekEnd)
  
  for (const employee of employees) {
    const employeeOrders = assignOrdersToEmployee(sortedOrders, employee)
    
    if (employeeOrders.length === 0) continue

    // Create routes for each work day
    for (const workDay of workDays) {
      const dayOrders = distributeOrdersToDay(employeeOrders, employee.max_hours_per_day)
      
      if (dayOrders.length === 0) continue

      // Create route for this day
      const routeId = await createRoute(employee, workDay, dayOrders, supabase)
      if (routeId) {
        routesCreated.push(routeId)
        
        // Optimize order sequence and assign times
        const optimizedOrders = await optimizeOrderSequence(dayOrders, employee)
        
        // Update orders with schedule
        for (let i = 0; i < optimizedOrders.length; i++) {
          const order = optimizedOrders[i]
          const scheduledTime = calculateScheduledTime(i, order.estimated_duration)
          
          await supabase
            .from('orders')
            .update({
              status: 'Planlagt',
              assigned_employee_id: employee.id,
              route_id: routeId,
              scheduled_date: workDay,
              scheduled_time: scheduledTime,
              order_sequence: i + 1,
              scheduled_week: getWeekNumber(workDay)
            })
            .eq('id', order.id)
          
          ordersPlanned.push(order.id)
        }
      }
    }
  }

  return {
    ordersPlanned: ordersPlanned.length,
    routesCreated: routesCreated.length,
    message: `Planlagde ${ordersPlanned.length} ordrer på ${routesCreated.length} ruter`
  }
}

function assignOrdersToEmployee(orders: Order[], employee: Employee): Order[] {
  return orders.filter(order => {
    // Check if employee has matching specialty
    const hasMatchingSpecialty = employee.specialties.some(specialty => 
      order.order_type.toLowerCase().includes(specialty.toLowerCase())
    )
    
    // Check if order is in employee's preferred area
    const isInPreferredArea = !order.address || employee.preferred_areas.length === 0 || 
      employee.preferred_areas.some(area => 
        order.address?.toLowerCase().includes(area.toLowerCase())
      )
    
    return hasMatchingSpecialty || isInPreferredArea
  })
}

function distributeOrdersToDay(orders: Order[], maxHours: number): Order[] {
  const maxMinutes = maxHours * 60
  let totalMinutes = 0
  const dayOrders: Order[] = []
  
  for (const order of orders) {
    const orderDuration = order.estimated_duration || 120 // Default 2 hours
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
    
    const { data, error } = await supabase
      .from('routes')
      .insert([{
        name: routeName,
        employee_id: employee.id,
        route_date: date,
        estimated_duration_hours: totalDuration,
        total_revenue: totalRevenue,
        status: 'Planlagt',
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

async function optimizeOrderSequence(orders: Order[], employee: Employee): Promise<Order[]> {
  // Simple geographical optimization - in production, use Mapbox API
  // For now, group by area and prioritize by urgency
  return orders.sort((a, b) => {
    const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 }
    const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 2
    const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 2
    return priorityB - priorityA
  })
}

function calculateScheduledTime(orderIndex: number, duration: number): string {
  const startHour = 8 // Start at 8:00 AM
  const totalMinutes = startHour * 60 + (orderIndex * 150) // 2.5 hours between orders average
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
}

function generateWorkDays(weekStart: string, weekEnd: string): string[] {
  const days: string[] = []
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  
  // Only include weekdays (Monday to Friday)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
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
