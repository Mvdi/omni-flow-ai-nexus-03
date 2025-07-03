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
    return new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔧 Recreating orders with correct 8-week intervals...');

    // Get subscription details
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', '67fbf528-3096-4700-8729-39efafa07fcb')
      .single();

    if (!subscription) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Delete all existing orders for this subscription
    await supabase
      .from('orders')
      .delete()
      .eq('subscription_id', subscription.id);

    console.log('✅ Deleted existing orders');

    // Create orders with correct 8-week intervals
    const orders = [];
    const startDate = new Date(subscription.start_date); // 2025-07-03

    // Start order
    orders.push({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      order_type: subscription.service_type,
      customer: subscription.customer_name,
      customer_email: subscription.customer_email,
      price: subscription.price,
      scheduled_date: startDate.toISOString().split('T')[0],
      status: 'Ikke planlagt',
      comment: `Abonnement (start): ${subscription.description}`,
      address: subscription.customer_address,
      priority: 'Normal',
      estimated_duration: subscription.estimated_duration
    });

    // Future orders - each 8 weeks (56 days) apart
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(startDate);
      futureDate.setDate(startDate.getDate() + (8 * 7 * i)); // 8 weeks * 7 days * interval number
      
      orders.push({
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        order_type: subscription.service_type,
        customer: subscription.customer_name,
        customer_email: subscription.customer_email,
        price: subscription.price,
        scheduled_date: futureDate.toISOString().split('T')[0],
        status: 'Ikke planlagt',
        comment: `Abonnement (fremtidig): ${subscription.description}`,
        address: subscription.customer_address,
        priority: 'Normal',
        estimated_duration: subscription.estimated_duration
      });
    }

    // Insert all orders
    const { error: insertError } = await supabase
      .from('orders')
      .insert(orders);

    if (insertError) {
      console.error('Error inserting orders:', insertError);
      return new Response(JSON.stringify({ error: "Failed to insert orders" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`✅ Created ${orders.length} orders with correct 8-week intervals`);

    // Return the created order dates for verification
    const orderDates = orders.map(order => order.scheduled_date);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `Created ${orders.length} orders with 8-week intervals`,
      order_dates: orderDates
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});