import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🧪 TEST EMAIL SEND FUNCTION STARTED');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔍 Testing email send by calling office365-send-email function...');
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Find a test ticket
    const { data: testTicket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .limit(1)
      .single();

    if (ticketError || !testTicket) {
      throw new Error("No test ticket found");
    }

    console.log('📧 Found test ticket:', testTicket.ticket_number);

    // Call the office365-send-email function
    const { data, error } = await supabase.functions.invoke('office365-send-email', {
      body: {
        ticket_id: testTicket.id,
        message_content: 'Test email fra system - klokken ' + new Date().toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' }),
        sender_name: 'Test System'
      }
    });

    if (error) {
      console.error('❌ Error calling office365-send-email:', error);
      throw error;
    }

    console.log('✅ Email function called successfully:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Test email sent successfully',
      ticket: testTicket.ticket_number,
      result: data
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Test email failed:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Test email failed', 
      details: error.message,
      stack: error.stack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});