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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🤖 PRP Daily Scheduler - Fenster-style automation starting...')

    // Step 1: KR-F01 - Scan subscriptions and create orders
    const { data: activeSubscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('auto_create_orders', true)
      .lte('next_due_date', new Date().toISOString().split('T')[0])

    if (subsError) {
      throw new Error(`Subscription scan failed: ${subsError.message}`)
    }

    console.log(`📋 Found ${activeSubscriptions?.length || 0} subscriptions ready for order creation`)

    let ordersCreated = 0
    const createdOrderIds: string[] = []

    // Create orders from subscriptions
    for (const subscription of activeSubscriptions || []) {
      try {
        // Create the order
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            order_type: subscription.service_type,
            customer: subscription.customer_name,
            customer_email: subscription.customer_email,
            price: subscription.price,
            scheduled_date: subscription.next_due_date,
            status: 'Ikke planlagt',
            comment: `Automatisk abonnement: ${subscription.description}`,
            address: subscription.customer_address,
            priority: 'Normal',
            estimated_duration: subscription.estimated_duration,
            edited_manually: false
          })
          .select()
          .single()

        if (!orderError && newOrder) {
          ordersCreated++
          createdOrderIds.push(newOrder.id)
          
          // Update subscription with new next_due_date
          const nextDueDate = new Date(subscription.next_due_date)
          nextDueDate.setDate(nextDueDate.getDate() + (subscription.interval_weeks * 7))
          
          await supabase
            .from('subscriptions')
            .update({
              next_due_date: nextDueDate.toISOString().split('T')[0],
              last_order_date: subscription.next_due_date,
              updated_at: new Date().toISOString()
            })
            .eq('id', subscription.id)

          console.log(`✅ Created order for ${subscription.customer_name}`)
        }
      } catch (error) {
        console.error(`❌ Failed to create order for subscription ${subscription.id}:`, error)
      }
    }

    // Step 2: Trigger intelligent planning for new orders
    if (createdOrderIds.length > 0) {
      console.log(`🧠 Triggering intelligent planning for ${createdOrderIds.length} new orders`)
      
      try {
        const { data: planningResult } = await supabase.functions.invoke('enhanced-intelligent-planner', {
          body: { 
            orderIds: createdOrderIds,
            triggerType: 'daily_scheduler',
            optimizationType: 'weekly'
          }
        })
        
        console.log('📊 Planning result:', planningResult)
      } catch (planningError) {
        console.error('⚠️ Planning failed, but orders were created:', planningError)
      }
    }

    // Step 3: Health check and statistics
    const today = new Date().toISOString().split('T')[0]
    
    const { data: todayStats } = await supabase
      .from('orders')
      .select('status, count(*)', { count: 'exact' })
      .eq('scheduled_date', today)

    const { data: unplannedCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Ikke planlagt')

    console.log(`📈 Daily Stats:`)
    console.log(`   - Orders created today: ${ordersCreated}`)
    console.log(`   - Orders scheduled for today: ${todayStats?.length || 0}`)
    console.log(`   - Unplanned orders total: ${unplannedCount?.count || 0}`)

    return new Response(JSON.stringify({
      success: true,
      message: `PRP Daily Scheduler completed successfully`,
      stats: {
        ordersCreated,
        subscriptionsProcessed: activeSubscriptions?.length || 0,
        orderIds: createdOrderIds,
        todayOrdersCount: todayStats?.length || 0,
        unplannedOrdersCount: unplannedCount?.count || 0
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ PRP Daily Scheduler error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})