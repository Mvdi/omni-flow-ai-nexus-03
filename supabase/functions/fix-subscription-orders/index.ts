import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts';

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
    const { subscriptionId } = await req.json();
    
    console.log('🔧 Fixing orders for subscription:', subscriptionId);

    // Get the subscription details
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      console.error('Error fetching subscription:', subError);
      return new Response(JSON.stringify({ error: "Subscription not found" }), { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Delete existing orders for this subscription
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('subscription_id', subscriptionId);

    if (deleteError) {
      console.error('Error deleting existing orders:', deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete existing orders" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('✅ Deleted existing orders');

    // Create the start order
    const startOrderData = {
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      order_type: subscription.service_type,
      customer: subscription.customer_name,
      customer_email: subscription.customer_email,
      price: subscription.price,
      scheduled_date: subscription.start_date,
      status: 'Ikke planlagt',
      comment: `Abonnement (start): ${subscription.description || subscription.service_type}${subscription.notes ? '\nNoter: ' + subscription.notes : ''}`,
      address: subscription.customer_address,
      priority: 'Normal',
      estimated_duration: subscription.estimated_duration
    };

    const { error: startOrderError } = await supabase
      .from('orders')
      .insert([startOrderData]);

    if (startOrderError) {
      console.error('Error creating start order:', startOrderError);
      return new Response(JSON.stringify({ error: "Failed to create start order" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('✅ Created start order');

    // Create future orders with correct intervals (8 weeks apart)
    const futureOrders = [];
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(subscription.start_date);
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
        console.error('Error creating future orders:', futureOrdersError);
        return new Response(JSON.stringify({ error: "Failed to create future orders" }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      console.log(`✅ Created ${futureOrders.length} future orders with correct intervals`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Fixed orders for subscription ${subscriptionId}`,
      orders_created: futureOrders.length + 1
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fix subscription orders error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});