import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    return new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Running subscription order creation check...');

    // Find subscriptions that need orders created (1 week before due date)
    const { data: subscriptionsToProcess, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('auto_create_orders', true)
      .lte('next_due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gt('next_due_date', new Date().toISOString().split('T')[0]);

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`📋 Found ${subscriptionsToProcess?.length || 0} subscriptions to process`);

    let ordersCreated = 0;
    const processedSubscriptions = [];

    for (const subscription of subscriptionsToProcess || []) {
      try {
        console.log(`🏗️ Processing subscription ${subscription.id} for ${subscription.customer_name}`);

        // Check if order already exists for this due date
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('subscription_id', subscription.id)
          .eq('scheduled_date', subscription.next_due_date);

        if (existingOrders && existingOrders.length > 0) {
          console.log(`⚠️ Order already exists for subscription ${subscription.id} on ${subscription.next_due_date}`);
          continue;
        }

        // Create the main order for the due date
        const mainOrderData = {
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          order_type: subscription.service_type,
          customer: subscription.customer_name,
          customer_email: subscription.customer_email,
          price: subscription.price,
          scheduled_date: subscription.next_due_date,
          status: 'Ikke planlagt',
          comment: `Abonnement: ${subscription.description || subscription.service_type}${subscription.notes ? '\nNoter: ' + subscription.notes : ''}`,
          address: subscription.customer_address,
          priority: 'Normal',
          estimated_duration: subscription.estimated_duration
        };

        const { error: mainOrderError } = await supabase
          .from('orders')
          .insert([mainOrderData]);

        if (mainOrderError) {
          console.error(`Error creating main order for subscription ${subscription.id}:`, mainOrderError);
          continue;
        }

        ordersCreated++;
        console.log(`✅ Created main order for subscription ${subscription.id}`);

        // Create the next 3 orders for planning
        const futureOrders = [];
        for (let i = 1; i <= 3; i++) {
          const futureDate = new Date(subscription.next_due_date);
          futureDate.setDate(futureDate.getDate() + (subscription.interval_weeks * 7 * i));
          
          futureOrders.push({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            order_type: subscription.service_type,
            customer: subscription.customer_name,
            customer_email: subscription.customer_email,
            price: subscription.price,
            scheduled_date: futureDate.toISOString().split('T')[0],
            status: 'Ikke planlagt',
            comment: `Abonnement (fremtidig): ${subscription.description || subscription.service_type}${subscription.notes ? '\nNoter: ' + subscription.notes : ''}`,
            address: subscription.customer_address,
            priority: 'Normal',
            estimated_duration: subscription.estimated_duration
          });
        }

        if (futureOrders.length > 0) {
          const { error: futureOrdersError } = await supabase
            .from('orders')
            .insert(futureOrders);

          if (futureOrdersError) {
            console.error(`Error creating future orders for subscription ${subscription.id}:`, futureOrdersError);
          } else {
            ordersCreated += futureOrders.length;
            console.log(`✅ Created ${futureOrders.length} future orders for subscription ${subscription.id}`);
          }
        }

        // Update subscription with new next due date
        const nextDueDate = new Date(subscription.next_due_date);
        nextDueDate.setDate(nextDueDate.getDate() + (subscription.interval_weeks * 7));

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            next_due_date: nextDueDate.toISOString().split('T')[0],
            last_order_date: subscription.next_due_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          console.error(`Error updating subscription ${subscription.id}:`, updateError);
        } else {
          console.log(`✅ Updated subscription ${subscription.id} next due date to ${nextDueDate.toISOString().split('T')[0]}`);
        }

        processedSubscriptions.push({
          id: subscription.id,
          customer_name: subscription.customer_name,
          service_type: subscription.service_type,
          orders_created: 4 // 1 main + 3 future
        });

      } catch (subscriptionError) {
        console.error(`Error processing subscription ${subscription.id}:`, subscriptionError);
        continue;
      }
    }

    console.log(`🎉 Subscription order creation completed! Created ${ordersCreated} orders for ${processedSubscriptions.length} subscriptions`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Created ${ordersCreated} orders for ${processedSubscriptions.length} subscriptions`,
      orders_created: ordersCreated,
      subscriptions_processed: processedSubscriptions.length,
      processed_subscriptions: processedSubscriptions
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Subscription order creation error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});