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
}

// Function to create content fingerprint for duplicate detection
function createContentFingerprint(subject: string, content: string): string {
  const cleanSubject = subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
  const cleanContent = content.replace(/\s+/g, ' ').trim().substring(0, 200);
  return `${cleanSubject}|${cleanContent}`.toLowerCase();
}

// Function to clean up duplicate messages in existing tickets
async function cleanupDuplicateMessages(supabase: any) {
  console.log('Starting cleanup of duplicate messages...');
  
  try {
    // Find all tickets with potential duplicate messages
    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id, ticket_number');
    
    if (ticketsError) {
      console.error('Error fetching tickets for cleanup:', ticketsError);
      return;
    }

    let totalDuplicatesRemoved = 0;

    for (const ticket of tickets || []) {
      // Get all messages for this ticket
      const { data: messages, error: messagesError } = await supabase
        .from('ticket_messages')
        .select('id, email_message_id, message_content, sender_email, created_at')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (messagesError || !messages) continue;

      const seenMessageIds = new Set();
      const seenContentFingerprints = new Set();
      const duplicateIds = [];

      for (const message of messages) {
        let isDuplicate = false;

        // Check by email_message_id first
        if (message.email_message_id) {
          if (seenMessageIds.has(message.email_message_id)) {
            isDuplicate = true;
          } else {
            seenMessageIds.add(message.email_message_id);
          }
        }

        // Check by content fingerprint if not already marked as duplicate
        if (!isDuplicate) {
          const fingerprint = createContentFingerprint('', message.message_content || '');
          if (seenContentFingerprints.has(fingerprint)) {
            isDuplicate = true;
          } else {
            seenContentFingerprints.add(fingerprint);
          }
        }

        if (isDuplicate) {
          duplicateIds.push(message.id);
        }
      }

      // Remove duplicates
      if (duplicateIds.length > 0) {
        console.log(`Removing ${duplicateIds.length} duplicate messages from ticket ${ticket.ticket_number}`);
        const { error: deleteError } = await supabase
          .from('ticket_messages')
          .delete()
          .in('id', duplicateIds);

        if (deleteError) {
          console.error(`Error removing duplicates from ticket ${ticket.ticket_number}:`, deleteError);
        } else {
          totalDuplicatesRemoved += duplicateIds.length;
        }
      }
    }

    console.log(`Cleanup completed. Removed ${totalDuplicatesRemoved} duplicate messages total.`);
    return totalDuplicatesRemoved;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return 0;
  }
}

// Function to find duplicate tickets with improved algorithm
async function findDuplicateTicket(supabase: any, message: GraphMessage) {
  console.log(`Looking for duplicates for message: ${message.id}`);
  
  // First check by exact email_message_id in support_tickets
  const { data: exactTicketMatch } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, email_message_id, subject')
    .eq('email_message_id', message.id)
    .single();

  if (exactTicketMatch) {
    console.log(`Found exact duplicate ticket by message ID: ${exactTicketMatch.ticket_number}`);
    return exactTicketMatch;
  }

  // Check by email_message_id in ticket_messages
  const { data: messageMatches } = await supabase
    .from('ticket_messages')
    .select('ticket_id, ticket:support_tickets(id, ticket_number, subject)')
    .eq('email_message_id', message.id)
    .limit(1);

  if (messageMatches && messageMatches.length > 0) {
    const ticket = messageMatches[0].ticket;
    console.log(`Found duplicate by message ID in ticket_messages: ${ticket.ticket_number}`);
    return ticket;
  }

  // Check by email thread ID
  const { data: threadMatch } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, email_thread_id, subject')
    .eq('email_thread_id', message.conversationId)
    .single();

  if (threadMatch) {
    console.log(`Found duplicate by thread ID: ${threadMatch.ticket_number}`);
    return threadMatch;
  }

  // Content-based duplicate detection with time proximity
  const contentFingerprint = createContentFingerprint(message.subject, message.body?.content || message.bodyPreview || '');
  const messageTime = new Date(message.receivedDateTime);
  const fiveMinutesAgo = new Date(messageTime.getTime() - 5 * 60 * 1000).toISOString();
  const fiveMinutesLater = new Date(messageTime.getTime() + 5 * 60 * 1000).toISOString();

  console.log(`Checking content-based duplicates with fingerprint: ${contentFingerprint.substring(0, 50)}...`);

  const { data: contentMatches } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, subject, content, created_at, customer_email')
    .eq('customer_email', message.from.emailAddress.address)
    .gte('created_at', fiveMinutesAgo)
    .lte('created_at', fiveMinutesLater)
    .limit(10);

  if (contentMatches && contentMatches.length > 0) {
    for (const ticket of contentMatches) {
      const ticketFingerprint = createContentFingerprint(ticket.subject, ticket.content || '');
      if (ticketFingerprint === contentFingerprint) {
        console.log(`Found content-based duplicate: ${ticket.ticket_number}`);
        return ticket;
      }
    }
  }

  console.log(`No duplicates found for message: ${message.id}`);
  return null;
}

// Function to merge ticket messages with STRICT duplicate check
async function mergeTicketMessage(supabase: any, existingTicket: any, message: GraphMessage, mailboxAddress: string) {
  console.log(`Attempting to merge message ${message.id} into existing ticket ${existingTicket.ticket_number}`);
  
  // CRITICAL: Check if this exact email_message_id already exists in this ticket
  if (message.id) {
    const { data: existingMessage } = await supabase
      .from('ticket_messages')
      .select('id, email_message_id')
      .eq('ticket_id', existingTicket.id)
      .eq('email_message_id', message.id)
      .single();

    if (existingMessage) {
      console.log(`DUPLICATE DETECTED: Message ${message.id} already exists in ticket ${existingTicket.ticket_number}, skipping...`);
      return existingTicket;
    }
  }

  // Content-based duplicate check for messages in this specific ticket
  const messageContent = message.body?.content || message.bodyPreview || '';
  const contentFingerprint = createContentFingerprint(message.subject, messageContent);
  
  const { data: ticketMessages } = await supabase
    .from('ticket_messages')
    .select('id, message_content, created_at, sender_email')
    .eq('ticket_id', existingTicket.id)
    .eq('sender_email', message.from.emailAddress.address);

  if (ticketMessages && ticketMessages.length > 0) {
    for (const msg of ticketMessages) {
      const msgFingerprint = createContentFingerprint(message.subject, msg.message_content);
      if (msgFingerprint === contentFingerprint) {
        console.log(`CONTENT DUPLICATE DETECTED: Similar message content already exists in ticket ${existingTicket.ticket_number}, skipping...`);
        return existingTicket;
      }
    }
  }

  // If we get here, the message is not a duplicate - add it
  const messageData = {
    ticket_id: existingTicket.id,
    sender_email: message.from.emailAddress.address,
    sender_name: message.from.emailAddress.name,
    message_content: messageContent,
    message_type: 'inbound_email',
    email_message_id: message.id,
    is_internal: false
  };

  console.log(`Adding NEW message to ticket ${existingTicket.ticket_number}`);

  const { error: messageError } = await supabase
    .from('ticket_messages')
    .insert(messageData);

  if (messageError) {
    console.error('Failed to merge ticket message:', messageError);
    throw messageError;
  }

  // Update the existing ticket with latest info
  const updateData: any = {
    last_response_at: message.receivedDateTime,
    updated_at: new Date().toISOString()
  };

  if (!existingTicket.email_thread_id) {
    updateData.email_thread_id = message.conversationId;
  }

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('id', existingTicket.id);

  if (updateError) {
    console.error('Failed to update existing ticket:', updateError);
  }

  console.log(`Successfully merged NEW message into ticket ${existingTicket.ticket_number}`);
  return existingTicket;
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
    console.log('Starting Office 365 email sync with STRICT duplicate prevention...');
    
    // First run cleanup to remove existing duplicates
    const duplicatesRemoved = await cleanupDuplicateMessages(supabase);
    console.log(`Cleanup removed ${duplicatesRemoved} duplicate messages`);

    // Hent Office 365 credentials fra databasen
    const { data: secrets, error: secretsError } = await supabase
      .from('integration_secrets')
      .select('key_name, key_value')
      .eq('provider', 'office365');

    if (secretsError || !secrets || secrets.length === 0) {
      console.error('Missing Office 365 credentials:', secretsError);
      return new Response(JSON.stringify({ 
        error: "Office 365 credentials not configured",
        details: "Please configure Office 365 integration in settings"
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
        error: "Incomplete Office 365 credentials",
        missing: [
          !client_id && 'client_id',
          !client_secret && 'client_secret', 
          !tenant_id && 'tenant_id'
        ].filter(Boolean)
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id,
      client_secret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    });

    console.log('Fetching access token from Microsoft Graph...');
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token request failed:', tokenError);
      return new Response(JSON.stringify({ 
        error: "Failed to authenticate with Microsoft Graph",
        details: tokenError
      }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const tokenData: GraphTokenResponse = await tokenResponse.json();
    console.log('Access token obtained successfully');

    const { data: mailboxes, error: mailboxError } = await supabase
      .from('monitored_mailboxes')
      .select('*')
      .eq('is_active', true);

    if (mailboxError || !mailboxes) {
      console.error('Failed to fetch monitored mailboxes:', mailboxError);
      return new Response(JSON.stringify({ error: "Failed to fetch monitored mailboxes" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`Processing ${mailboxes.length} monitored mailboxes with STRICT duplicate prevention`);
    let totalProcessed = 0;
    let totalErrors = 0;
    let totalMerged = 0;
    let totalSkipped = 0;

    for (const mailbox of mailboxes) {
      console.log(`Processing mailbox: ${mailbox.email_address}`);
      
      const { data: syncLog } = await supabase
        .from('email_sync_log')
        .insert({
          mailbox_address: mailbox.email_address,
          status: 'running'
        })
        .select()
        .single();

      try {
        // Use 15 minute window to avoid processing too much
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages`;
        const filter = `?$filter=receivedDateTime gt ${fifteenMinutesAgo}&$top=20&$orderby=receivedDateTime desc`;

        console.log(`Fetching messages from: ${messagesUrl}${filter}`);
        
        const messagesResponse = await fetch(`${messagesUrl}${filter}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!messagesResponse.ok) {
          const errorText = await messagesResponse.text();
          console.error(`Failed to fetch messages for ${mailbox.email_address}:`, errorText);
          
          if (syncLog) {
            await supabase
              .from('email_sync_log')
              .update({
                sync_completed_at: new Date().toISOString(),
                errors_count: 1,
                error_details: `Graph API error: ${errorText}`,
                status: 'failed'
              })
              .eq('id', syncLog.id);
          }
          
          totalErrors++;
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages: GraphMessage[] = messagesData.value || [];
        
        console.log(`Found ${messages.length} messages for ${mailbox.email_address}`);

        for (const message of messages) {
          try {
            console.log(`Processing message ${message.id} with subject: "${message.subject}"`);
            
            const duplicateTicket = await findDuplicateTicket(supabase, message);
            
            if (duplicateTicket) {
              console.log(`Found duplicate ticket ${duplicateTicket.ticket_number}, attempting to merge message...`);
              await mergeTicketMessage(supabase, duplicateTicket, message, mailbox.email_address);
              totalMerged++;
              continue;
            }

            console.log('No duplicate found, creating new ticket...');

            const { data: customerResult, error: customerError } = await supabase
              .from('customers')
              .upsert({
                email: message.from.emailAddress.address,
                navn: message.from.emailAddress.name || message.from.emailAddress.address
              }, { 
                onConflict: 'email',
                ignoreDuplicates: false 
              })
              .select();

            if (customerError) {
              console.error('Failed to upsert customer:', customerError);
            } else {
              console.log('Customer upserted successfully:', customerResult);
            }

            const { data: ticketNumber, error: ticketNumError } = await supabase.rpc('generate_ticket_number');
            
            if (ticketNumError) {
              console.error('Failed to generate ticket number:', ticketNumError);
              totalErrors++;
              continue;
            }

            console.log(`Generated ticket number: ${ticketNumber}`);

            const ticketData = {
              ticket_number: ticketNumber,
              subject: message.subject || 'Ingen emne',
              content: message.body?.content || message.bodyPreview || '',
              customer_email: message.from.emailAddress.address,
              customer_name: message.from.emailAddress.name,
              email_message_id: message.id,
              email_thread_id: message.conversationId,
              email_received_at: message.receivedDateTime,
              mailbox_address: mailbox.email_address,
              source: 'office365',
              status: 'Åben',
              priority: 'Medium'
            };

            console.log('Creating ticket with data:', JSON.stringify(ticketData, null, 2));

            const { data: newTicket, error: ticketError } = await supabase
              .from('support_tickets')
              .insert(ticketData)
              .select()
              .single();

            if (ticketError) {
              console.error('Failed to create ticket:', ticketError);
              console.error('Ticket data that failed:', JSON.stringify(ticketData, null, 2));
              totalErrors++;
              continue;
            }

            console.log(`Created new ticket ${newTicket.ticket_number} from email ${message.id}`);

            const messageData = {
              ticket_id: newTicket.id,
              sender_email: message.from.emailAddress.address,
              sender_name: message.from.emailAddress.name,
              message_content: message.body?.content || message.bodyPreview || '',
              message_type: 'inbound_email',
              email_message_id: message.id,
              is_internal: false
            };

            console.log('Creating ticket message with data:', JSON.stringify(messageData, null, 2));

            const { error: messageError } = await supabase
              .from('ticket_messages')
              .insert(messageData);

            if (messageError) {
              console.error('Failed to create ticket message:', messageError);
              console.error('Message data that failed:', JSON.stringify(messageData, null, 2));
              totalErrors++;
            } else {
              totalProcessed++;
              console.log(`Successfully processed message ${message.id} into ticket ${newTicket.ticket_number}`);
            }

          } catch (messageError) {
            console.error(`Error processing message ${message.id}:`, messageError);
            totalErrors++;
          }
        }

        await supabase
          .from('monitored_mailboxes')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', mailbox.id);

        if (syncLog) {
          await supabase
            .from('email_sync_log')
            .update({
              sync_completed_at: new Date().toISOString(),
              emails_processed: messages.length,
              errors_count: 0,
              status: 'completed'
            })
            .eq('id', syncLog.id);
        }

      } catch (mailboxError) {
        console.error(`Error processing mailbox ${mailbox.email_address}:`, mailboxError);
        totalErrors++;
        
        if (syncLog) {
          await supabase
            .from('email_sync_log')
            .update({
              sync_completed_at: new Date().toISOString(),
              errors_count: 1,
              error_details: String(mailboxError),
              status: 'failed'
            })
            .eq('id', syncLog.id);
        }
      }
    }

    console.log(`Email sync completed. Processed: ${totalProcessed}, Merged: ${totalMerged}, Skipped: ${totalSkipped}, Errors: ${totalErrors}, Duplicates cleaned: ${duplicatesRemoved}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: totalProcessed,
      merged: totalMerged,
      skipped: totalSkipped,
      errors: totalErrors,
      duplicatesRemoved: duplicatesRemoved,
      mailboxes: mailboxes.length,
      timestamp: new Date().toISOString(),
      details: `STRICT duplicate prevention - cleaned ${duplicatesRemoved} duplicates, merged ${totalMerged} messages, skipped ${totalSkipped} duplicates`
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Email sync error:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : 'No stack trace available'
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
