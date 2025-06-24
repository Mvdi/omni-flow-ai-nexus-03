
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
  
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const emailData = await req.json();
    console.log('Received email data:', emailData);

    // Extract email information (format depends on your email provider)
    const { 
      from, 
      subject, 
      text, 
      html, 
      messageId,
      inReplyTo,
      references 
    } = emailData;

    if (!from || !subject) {
      return new Response(JSON.stringify({ error: "Missing required email fields" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Parse sender email and name
    const senderMatch = from.match(/^(.*?)\s*<(.+)>$/) || [null, from, from];
    const senderName = senderMatch[1]?.trim() || null;
    const senderEmail = senderMatch[2]?.trim() || from;

    // Check if this is a reply to an existing ticket
    let existingTicketId = null;
    if (inReplyTo || references) {
      const { data: existingMessages } = await supabase
        .from('ticket_messages')
        .select('ticket_id')
        .or(`message_id.eq.${inReplyTo},message_id.in.(${references?.split(' ').join(',') || ''})`)
        .limit(1);
      
      if (existingMessages && existingMessages.length > 0) {
        existingTicketId = existingMessages[0].ticket_id;
      }
    }

    if (existingTicketId) {
      // Add message to existing ticket
      const { error: messageError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: existingTicketId,
          sender_email: senderEmail,
          sender_name: senderName,
          message_content: html || text || '',
          is_internal: false,
          is_ai_generated: false,
        });

      if (messageError) throw messageError;

      // Update ticket status and timestamp
      await supabase
        .from('support_tickets')
        .update({ 
          status: 'Åben',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTicketId);

    } else {
      // Create new ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          subject: subject,
          content: html || text || '',
          customer_email: senderEmail,
          customer_name: senderName,
          priority: 'Medium',
          status: 'Åben',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upsert customer
      await supabase
        .from('customers')
        .upsert({
          email: senderEmail,
          navn: senderName
        }, { onConflict: 'email', ignoreDuplicates: true });

      // Add initial message
      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: newTicket.id,
          sender_email: senderEmail,
          sender_name: senderName,
          message_content: html || text || '',
          is_internal: false,
          is_ai_generated: false,
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in email-to-ticket function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
