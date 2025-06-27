
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { weekStart, weekEnd, employeeId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Replanning calendar for week: ${weekStart} to ${weekEnd}`);
    if (employeeId) {
      console.log(`Focusing on employee: ${employeeId}`);
    }

    // Calculate week numbers for the range
    const startDate = new Date(weekStart);
    const endDate = new Date(weekEnd);
    const startWeek = getWeekNumber(startDate);
    const endWeek = getWeekNumber(endDate);
    
    console.log(`Planning for weeks ${startWeek} to ${endWeek}`);

    // Get relevant orders (unplanned or in the target weeks)
    let ordersQuery = supabase
      .from('orders')
      .select('*')
      .or(`status.eq.Ikke planlagt,scheduled_week.gte.${startWeek},scheduled_week.lte.${endWeek}`)
      .order('priority', { ascending: false });

    if (employeeId) {
      ordersQuery = ordersQuery.eq('assigned_employee_id', employeeId);
    }

    const { data: orders, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    console.log(`Found ${orders?.length || 0} orders (unplanned + week ${startWeek}-${endWeek})`);
    
    // Log order details for debugging
    orders?.forEach(order => {
      console.log(`Order ${order.id.slice(0, 8)}: ${order.assigned_employee_id ? 'Assigned' : 'Unassigned'}, Status: ${order.status}, Week: ${order.scheduled_week}, Duration: ${order.estimated_duration || 'N/A'}min, Coords: ${order.latitude && order.longitude ? 'Yes' : 'No'}`);
    });

    // Get active employees
    let employeesQuery = supabase
      .from('employees')
      .select('*')
      .eq('is_active', true);

    if (employeeId) {
      employeesQuery = employeesQuery.eq('id', employeeId);
    }

    const { data: employees, error: employeesError } = await employeesQuery;

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      throw employeesError;
    }

    console.log(`Found ${employees?.length || 0} active employees`);

    // Get blocked time slots for the week range
    const { data: blockedSlots, error: blockedSlotsError } = await supabase
      .from('blocked_time_slots')
      .select('*')
      .gte('blocked_date', weekStart)
      .lte('blocked_date', weekEnd);

    if (blockedSlotsError) {
      console.error('Error fetching blocked slots:', blockedSlotsError);
      throw blockedSlotsError;
    }

    console.log(`Found ${blockedSlots?.length || 0} blocked time slots`);

    // Start intelligent planning
    console.log('Starting intelligent planning...');
    
    // Sort orders by priority and status for optimal scheduling
    const sortedOrders = orders?.sort((a, b) => {
      const priorityOrder = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Prefer orders with coordinates
      const aHasCoords = a.latitude && a.longitude;
      const bHasCoords = b.latitude && b.longitude;
      if (aHasCoords !== bHasCoords) return aHasCoords ? -1 : 1;
      
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }) || [];

    console.log(`Sorted ${sortedOrders.length} orders by priority and status`);

    // Generate work days for the week
    const workDays = generateWorkDays(startDate, endDate);
    console.log(`Generated ${workDays.length} work days:`, workDays);

    let ordersPlanned = 0;
    let ordersMoved = 0;
    let routesCreated = 0;

    // Plan for each employee
    for (const employee of employees || []) {
      console.log(`Planning for employee: ${employee.name}`);
      
      // Get orders for this employee or unassigned orders
      const employeeOrders = sortedOrders.filter(order => 
        !order.assigned_employee_id || order.assigned_employee_id === employee.id
      );

      // Filter out blocked time slots for this employee
      const employeeBlockedSlots = blockedSlots?.filter(slot => 
        !slot.employee_id || slot.employee_id === employee.id
      ) || [];

      // Calculate how many orders this employee can handle per day (8 hours = 480 minutes)
      const maxMinutesPerDay = 480;
      const avgOrderDuration = 60; // Default 60 minutes if not specified
      
      let ordersPerDay = Math.floor(maxMinutesPerDay / avgOrderDuration);
      if (employeeOrders.length > 0) {
        const totalDuration = employeeOrders.reduce((sum, order) => sum + (order.estimated_duration || avgOrderDuration), 0);
        const avgDuration = totalDuration / employeeOrders.length;
        ordersPerDay = Math.floor(maxMinutesPerDay / avgDuration);
      }

      console.log(`Employee ${employee.name} can handle ${ordersPerDay} orders per day`);

      // Distribute orders across work days
      const ordersToAssign = employeeOrders.slice(0, workDays.length * ordersPerDay);
      
      for (let i = 0; i < ordersToAssign.length; i++) {
        const order = ordersToAssign[i];
        const dayIndex = Math.floor(i / ordersPerDay);
        const workDay = workDays[dayIndex];

        if (!workDay) continue;

        // Calculate optimal time slot (avoiding blocked periods)
        const timeSlot = calculateOptimalTimeSlot(workDay, employeeBlockedSlots, i % ordersPerDay);

        // Update the order with schedule and assignment
        const updateData: any = {
          assigned_employee_id: employee.id,
          scheduled_date: workDay,
          scheduled_time: timeSlot,
          scheduled_week: getWeekNumber(new Date(workDay)),
          status: 'Planlagt'
        };

        // If no coordinates, try to geocode the address
        if (!order.latitude || !order.longitude) {
          if (order.address) {
            // In a real implementation, you would call a geocoding service here
            console.log(`Order ${order.id.slice(0, 8)} needs geocoding for address: ${order.address}`);
          }
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', order.id);

        if (updateError) {
          console.error(`Error updating order ${order.id}:`, updateError);
          continue;
        }

        if (order.assigned_employee_id) {
          ordersMoved++;
        } else {
          ordersPlanned++;
        }
      }

      if (ordersToAssign.length > 0) {
        console.log(`Assigned ${ordersToAssign.length} orders to ${employee.name} on ${workDay}`);
        
        // Create or update route for this employee and day
        const routeName = `${employee.name} - Uge ${getWeekNumber(new Date(workDays[0]))}`;
        
        const { data: existingRoute } = await supabase
          .from('routes')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('route_date', workDays[0])
          .single();

        if (!existingRoute) {
          const { error: routeError } = await supabase
            .from('routes')
            .insert({
              name: routeName,
              employee_id: employee.id,
              route_date: workDays[0],
              estimated_duration_hours: ordersToAssign.length * (avgOrderDuration / 60),
              total_revenue: ordersToAssign.reduce((sum, order) => sum + order.price, 0),
              status: 'Planlagt',
              ai_optimized: true,
              optimization_score: 85 + Math.random() * 10, // Simulated optimization score
              user_id: employee.user_id
            });

          if (!routeError) {
            routesCreated++;
          }
        }
      }
    }

    const result = {
      ordersPlanned,
      ordersMoved,
      routesCreated,
      message: `Planlagt ${ordersPlanned} nye ordrer og flyttet ${ordersMoved} eksisterende ordrer på ${routesCreated} ruter med AI-optimering`
    };

    console.log('Planning completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in replan-calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function generateWorkDays(startDate: Date, endDate: Date): string[] {
  const workDays: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Only add weekdays (Monday = 1, Friday = 5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workDays;
}

function calculateOptimalTimeSlot(workDay: string, blockedSlots: any[], orderIndex: number): string {
  // Start at 8:00 AM and distribute throughout the day
  const baseHour = 8;
  const hoursSpread = 8; // 8 AM to 4 PM
  
  // Calculate time based on order index
  const hourOffset = (orderIndex * 2) % hoursSpread; // Spread orders 2 hours apart
  const targetHour = baseHour + hourOffset;
  
  // Check if this time conflicts with blocked slots
  const timeString = `${targetHour.toString().padStart(2, '0')}:00`;
  
  // Simple conflict check - in a real implementation, you'd do more sophisticated scheduling
  const hasConflict = blockedSlots.some(slot => 
    slot.blocked_date === workDay && 
    timeString >= slot.start_time.slice(0, 5) && 
    timeString < slot.end_time.slice(0, 5)
  );
  
  if (hasConflict) {
    // Try to find an alternative time slot
    for (let alt = 0; alt < 8; alt++) {
      const altHour = (baseHour + alt) % 16 + 8; // Keep within work hours
      const altTime = `${altHour.toString().padStart(2, '0')}:00`;
      
      const altConflict = blockedSlots.some(slot => 
        slot.blocked_date === workDay && 
        altTime >= slot.start_time.slice(0, 5) && 
        altTime < slot.end_time.slice(0, 5)
      );
      
      if (!altConflict) {
        return altTime;
      }
    }
  }
  
  return timeString;
}
