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

    console.log(`🎯 Auto-assigning unassigned orders for user ${userId}`)

    // Get active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (empError || !employees?.length) {
      throw new Error('No active employees found')
    }

    // Get unassigned orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .is('assigned_employee_id', null)
      .neq('status', 'Afsluttet')
      .neq('status', 'Færdig')

    if (ordersError) {
      throw ordersError
    }

    if (!orders?.length) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No unassigned orders found',
        assigned: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📋 Found ${orders.length} unassigned orders`)
    
    let assignedCount = 0
    
    // Auto-assign orders to available employees
    for (const order of orders) {
      // If only one employee, assign to them
      const targetEmployee = employees.length === 1 ? employees[0] : employees[assignedCount % employees.length]
      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          assigned_employee_id: targetEmployee.id,
          status: 'Planlagt'
        })
        .eq('id', order.id)

      if (!updateError) {
        assignedCount++
        console.log(`✅ Assigned ${order.customer} to ${targetEmployee.name}`)
      } else {
        console.error(`❌ Failed to assign order ${order.id}:`, updateError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully assigned ${assignedCount} orders`,
      assigned: assignedCount,
      employees: employees.map(e => e.name)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Auto-assignment error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})