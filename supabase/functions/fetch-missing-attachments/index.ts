import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
    console.log(`Retrying in ${delay}ms... (${retries} retries left)`);
    await sleep(delay);
    return retryWithExponentialBackoff(fn, retries - 1);
  }
};

const getAccessToken = async (clientId: string, clientSecret: string, tenantId: string): Promise<string> => {
  return retryWithExponentialBackoff(async () => {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token request failed:', errorText);
      throw new Error(`Token request failed: ${response.status} ${errorText}`);
    }

    const tokenData: GraphTokenResponse = await response.json();
    console.log('Access token obtained successfully');
    return tokenData.access_token;
  });
};

const processMessageAttachments = async (messageId: string, mailboxAddress: string, accessToken: string, supabase: any): Promise<any[]> => {
  try {
    console.log(`Fetching attachments for message ${messageId} from mailbox ${mailboxAddress}`);
    
    const attachmentsUrl = `https://graph.microsoft.com/v1.0/users/${mailboxAddress}/messages/${messageId}/attachments`;
    
    const attachmentsResponse = await retryWithExponentialBackoff(() =>
      fetch(attachmentsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
    );

    if (!attachmentsResponse.ok) {
      console.error(`Failed to fetch attachments for message ${messageId}: ${attachmentsResponse.status}`);
      return [];
    }

    const attachmentsData = await attachmentsResponse.json();
    const attachments = attachmentsData.value || [];
    
    console.log(`Found ${attachments.length} attachments for message ${messageId}`);

    const processedAttachments = [];

    for (const attachment of attachments) {
      try {
        console.log(`Processing attachment: ${attachment.name} (type: ${attachment['@odata.type']})`);
        
        // Only process file attachments (not inline/embedded ones)
        if (attachment['@odata.type'] === '#microsoft.graph.fileAttachment') {
          const fileName = attachment.name;
          const contentType = attachment.contentType;
          const size = attachment.size;
          const contentBytes = attachment.contentBytes;

          console.log(`Processing file attachment: ${fileName}, size: ${size}, type: ${contentType}`);

          // Generate unique file name
          const timestamp = new Date().getTime();
          const uniqueFileName = `${timestamp}_${fileName}`;
          const filePath = `attachments/${uniqueFileName}`;

          // Convert base64 to bytes
          const fileData = Uint8Array.from(atob(contentBytes), c => c.charCodeAt(0));

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, fileData, {
              contentType: contentType,
              upsert: false
            });

          if (uploadError) {
            console.error(`Failed to upload attachment ${fileName}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);

          processedAttachments.push({
            id: `attachment_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            name: fileName,
            size: size,
            contentType: contentType,
            url: publicUrl,
            path: filePath,
            uploaded_at: new Date().toISOString()
          });

          console.log(`Successfully processed attachment: ${fileName} -> ${publicUrl}`);
        } else {
          console.log(`Skipping attachment ${attachment.name} (type: ${attachment['@odata.type']})`);
        }
      } catch (attachmentError) {
        console.error(`Error processing attachment ${attachment.name}:`, attachmentError);
      }
    }

    return processedAttachments;
  } catch (error) {
    console.error(`Error processing attachments for message ${messageId}:`, error);
    return [];
  }
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('📎 Starting fetch-missing-attachments function');
    
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { ticketId } = requestBody;
    console.log('Request body:', requestBody);
    
    if (!ticketId) {
      console.error('Missing ticketId in request');
      return new Response(JSON.stringify({ error: "ticketId is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Fetching missing attachments for ticket: ${ticketId}`);

    // Get ticket and message information
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('email_message_id, mailbox_address, subject, customer_email, customer_name, content')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error('Failed to fetch ticket:', ticketError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Get the original message for this ticket - try ticket_messages first, then fall back to ticket data
    const { data: originalMessage, error: messageError } = await supabase
      .from('ticket_messages')
      .select('email_message_id, attachments')
      .eq('ticket_id', ticketId)
      .eq('message_type', 'inbound_email')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    console.log('Found ticket message:', originalMessage);

    let emailMessageId = null;
    let existingAttachments = null;

    if (originalMessage) {
      // Found a ticket message
      emailMessageId = originalMessage.email_message_id;
      existingAttachments = originalMessage.attachments;
    } else {
      // No ticket message found, use ticket's email_message_id directly
      console.log('No ticket message found, using ticket email_message_id');
      emailMessageId = ticket.email_message_id;
      existingAttachments = null;
    }

    if (!emailMessageId) {
      console.error('No email message ID found for ticket');
      return new Response(JSON.stringify({ error: "No email message ID found for this ticket" }), {
        status: 404,
        headers: corsHeaders
      });
    }

    // Check if attachments already exist
    if (existingAttachments && existingAttachments.length > 0) {
      console.log('Attachments already exist for this message');
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Attachments already exist",
        attachments: existingAttachments
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    // Fetch Office 365 credentials
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError || !secrets || secrets.length === 0) {
      console.error('Missing Office 365 credentials:', secretsError);
      return new Response(JSON.stringify({ 
        error: "Office 365 credentials not configured"
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const credentialsMap = secrets.reduce((acc, secret) => {
      acc[secret.key_name] = secret.key_value;
      return acc;
    }, {} as Record<string, string>);

    const { client_id, client_secret, tenant_id } = credentialsMap;

    if (!client_id || !client_secret || !tenant_id) {
      console.error('Incomplete Office 365 credentials');
      return new Response(JSON.stringify({ 
        error: "Incomplete Office 365 credentials"
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const accessToken = await getAccessToken(client_id, client_secret, tenant_id);

    // Process attachments for the original message
    const attachments = await processMessageAttachments(
      emailMessageId, 
      ticket.mailbox_address, 
      accessToken, 
      supabase
    );

    if (attachments.length > 0) {
      // Update the message with the attachments (if a message exists) or create one
      if (originalMessage) {
        const { error: updateError } = await supabase
          .from('ticket_messages')
          .update({ attachments: attachments })
          .eq('email_message_id', emailMessageId);

        if (updateError) {
          console.error('Failed to update message with attachments:', updateError);
          return new Response(JSON.stringify({ error: "Failed to update message" }), {
            status: 500,
            headers: corsHeaders
          });
        }
      } else {
        // Create a new ticket message for this ticket
        const { error: insertError } = await supabase
          .from('ticket_messages')
          .insert({
            ticket_id: ticketId,
            sender_email: ticket.customer_email,
            sender_name: ticket.customer_name,
            message_content: ticket.content,
            message_type: 'inbound_email',
            is_internal: false,
            email_message_id: emailMessageId,
            attachments: attachments
          });

        if (insertError) {
          console.error('Failed to create message with attachments:', insertError);
          return new Response(JSON.stringify({ error: "Failed to create message" }), {
            status: 500,
            headers: corsHeaders
          });
        }
      }

      console.log(`✅ Successfully processed ${attachments.length} attachments for ticket ${ticketId}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${attachments.length} attachments`,
        attachments: attachments
      }), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      console.log(`No attachments found for ticket ${ticketId}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No attachments found for this message"
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('❌ Error in fetch-missing-attachments function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      details: error.stack
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});