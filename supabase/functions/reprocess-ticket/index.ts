
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    content: string;
    contentType: string;
  };
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  receivedDateTime: string;
  internetMessageId: string;
  conversationId: string;
  parentFolderId: string;
  hasAttachments: boolean;
}

interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string;
  contentId?: string;
  isInline: boolean;
}

// Function to process attachments
async function processAttachments(supabase: any, accessToken: string, mailboxAddress: string, messageId: string): Promise<any[]> {
  console.log(`Processing attachments for message: ${messageId}`);
  
  try {
    const attachmentsUrl = `https://graph.microsoft.com/v1.0/users/${mailboxAddress}/messages/${messageId}/attachments`;
    console.log(`Fetching attachments from: ${attachmentsUrl}`);
    
    const attachmentsResponse = await fetch(attachmentsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!attachmentsResponse.ok) {
      const errorText = await attachmentsResponse.text();
      console.error(`Failed to fetch attachments for message ${messageId}:`, errorText);
      return [];
    }

    const attachmentsData = await attachmentsResponse.json();
    const attachments: GraphAttachment[] = attachmentsData.value || [];
    
    console.log(`Found ${attachments.length} attachments for message: ${messageId}`);
    
    if (attachments.length === 0) {
      return [];
    }

    const processedAttachments = [];

    for (const attachment of attachments) {
      try {
        if (attachment.isInline) {
          console.log(`Skipping inline attachment: ${attachment.name}`);
          continue;
        }

        if (attachment.size > 25 * 1024 * 1024) {
          console.log(`Skipping large attachment: ${attachment.name} (${attachment.size} bytes)`);
          continue;
        }

        console.log(`Processing attachment: ${attachment.name} (${attachment.size} bytes)`);

        const attachmentUrl = `https://graph.microsoft.com/v1.0/users/${mailboxAddress}/messages/${messageId}/attachments/${attachment.id}`;
        const attachmentResponse = await fetch(attachmentUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!attachmentResponse.ok) {
          console.error(`Failed to fetch attachment ${attachment.name}`);
          continue;
        }

        const attachmentData = await attachmentResponse.json();
        
        if (!attachmentData.contentBytes) {
          console.error(`No content bytes for attachment: ${attachment.name}`);
          continue;
        }

        const contentBytes = Uint8Array.from(atob(attachmentData.contentBytes), c => c.charCodeAt(0));
        
        const timestamp = new Date().getTime();
        const fileName = `${messageId}_${timestamp}_${attachment.name}`;
        const filePath = `attachments/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, contentBytes, {
            contentType: attachment.contentType,
            upsert: false
          });

        if (uploadError) {
          console.error(`Failed to upload attachment ${attachment.name}:`, uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);

        const processedAttachment = {
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          contentType: attachment.contentType,
          url: publicUrl,
          path: filePath,
          uploaded_at: new Date().toISOString()
        };

        processedAttachments.push(processedAttachment);
        console.log(`Successfully processed attachment: ${attachment.name}`);

      } catch (attachmentError) {
        console.error(`Error processing attachment ${attachment.name}:`, attachmentError);
      }
    }

    console.log(`Successfully processed ${processedAttachments.length} attachments for message: ${messageId}`);
    return processedAttachments;

  } catch (error) {
    console.error(`Error processing attachments for message ${messageId}:`, error);
    return [];
  }
}

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
    const { ticket_number } = await req.json();
    
    if (!ticket_number) {
      return new Response(JSON.stringify({ error: "ticket_number is required" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Re-processing ticket: ${ticket_number}`);

    // Find the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('ticket_number', ticket_number)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket not found:', ticketError);
      return new Response(JSON.stringify({ error: "Ticket not found" }), { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    if (!ticket.email_message_id) {
      return new Response(JSON.stringify({ error: "No email_message_id found for this ticket" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get Office 365 credentials
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError || !secrets || secrets.length === 0) {
      console.error('Missing Office 365 credentials:', secretsError);
      return new Response(JSON.stringify({ error: "Office 365 credentials not configured" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const credentialsMap = secrets.reduce((acc, secret) => {
      acc[secret.key_name] = secret.key_value;
      return acc;
    }, {} as Record<string, string>);

    const { client_id, client_secret, tenant_id } = credentialsMap;

    // Get access token
    const tokenUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id,
      client_secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token request failed:', tokenError);
      return new Response(JSON.stringify({ error: "Failed to authenticate with Microsoft Graph" }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const tokenData: GraphTokenResponse = await tokenResponse.json();

    // Process attachments for this specific message
    const attachments = await processAttachments(
      supabase, 
      tokenData.access_token, 
      ticket.mailbox_address || 'info@mmmultipartner.dk', 
      ticket.email_message_id
    );

    // Update the ticket message with attachments
    if (attachments.length > 0) {
      console.log(`Updating ticket message with ${attachments.length} attachments`);
      
      // Find the original message for this ticket
      const { data: messages, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .eq('email_message_id', ticket.email_message_id);

      if (messages && messages.length > 0) {
        const { error: updateError } = await supabase
          .from('ticket_messages')
          .update({ attachments: attachments })
          .eq('id', messages[0].id);

        if (updateError) {
          console.error('Failed to update message with attachments:', updateError);
        } else {
          console.log(`Successfully updated message with ${attachments.length} attachments`);
        }
      }
    }

    console.log(`Re-processing completed for ticket ${ticket_number}. Found ${attachments.length} attachments.`);

    return new Response(JSON.stringify({ 
      success: true, 
      ticket_number,
      attachments_found: attachments.length,
      attachments: attachments,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Re-process error:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      timestamp: new Date().toISOString()
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
