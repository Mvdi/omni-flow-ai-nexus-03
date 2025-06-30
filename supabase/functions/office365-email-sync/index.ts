
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
  internetMessageHeaders?: Array<{
    name: string;
    value: string;
  }>;
}

// Enhanced error handling and retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

// KRITISK FIX: Korrekt dansk tid konvertering
const toDanishTime = (utcDate: string | Date): Date => {
  const date = new Date(utcDate);
  
  // Brug browser's Intl API til at konvertere til Copenhagen timezone
  const danishTime = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
  
  return danishTime;
};

// Enhanced token management with refresh capability
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

// AI-powered priority detection
const autoDetectPriority = (subject: string, content: string): 'Høj' | 'Medium' | 'Lav' => {
  const text = `${subject} ${content}`.toLowerCase();
  
  const highPriorityKeywords = [
    'urgent', 'kritisk', 'nødsituation', 'ned', 'virker ikke', 'kan ikke', 
    'fejl', 'problem', 'hjælp hurtigst', 'asap', 'øjeblikkeligt'
  ];
  
  const mediumPriorityKeywords = [
    'spørgsmål', 'hjælp', 'hvordan', 'support', 'assistance', 'information'
  ];
  
  if (highPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'Høj';
  } else if (mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }
  
  return 'Lav';
};

// AI-powered category detection
const autoDetectCategory = (subject: string, content: string): string => {
  const text = `${subject} ${content}`.toLowerCase();
  
  if (text.includes('faktura') || text.includes('betaling') || text.includes('regning') || text.includes('billing')) {
    return 'Fakturering';
  } else if (text.includes('teknisk') || text.includes('fejl') || text.includes('bug') || text.includes('virker ikke')) {
    return 'Teknisk Support';
  } else if (text.includes('klage') || text.includes('utilfreds') || text.includes('complaint') || text.includes('problem med service')) {
    return 'Klage';
  } else if (text.includes('ændring') || text.includes('opdater') || text.includes('skift') || text.includes('modify')) {
    return 'Ændringer';
  }
  
  return 'Generel';
};

// Calculate SLA deadline based on priority
const calculateSLADeadline = (createdAt: string, priority: string): string => {
  const created = toDanishTime(createdAt);
  let hoursToAdd = 24; // Default 24 hours
  
  switch (priority) {
    case 'Høj':
      hoursToAdd = 4; // 4 hours for high priority
      break;
    case 'Medium':
      hoursToAdd = 12; // 12 hours for medium priority
      break;
    case 'Lav':
      hoursToAdd = 48; // 48 hours for low priority
      break;
  }
  
  return new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000).toISOString();
};

// FORBEDRET duplicate detection med internal sender filtering
const findDuplicateTicket = async (supabase: any, message: GraphMessage) => {
  console.log(`Looking for existing ticket for message: ${message.id} with subject: "${message.subject}" from: ${message.from.emailAddress.address}`);
  
  // KRITISK: Skip processing if sender is from internal domains
  const internalDomains = ['@mmmultipartner.dk', 'mmmultipartner.dk'];
  const senderEmail = message.from.emailAddress.address.toLowerCase();
  
  if (internalDomains.some(domain => senderEmail.includes(domain))) {
    console.log(`SKIPPING internal sender: ${senderEmail} - this is an outgoing email from our system`);
    return null;
  }
  
  // FORBEDRET: Tjek for eksisterende beskeder med samme email_message_id
  const { data: existingMessage } = await supabase
    .from('ticket_messages')
    .select('ticket_id, id')
    .eq('email_message_id', message.id)
    .single();

  if (existingMessage) {
    console.log(`DUPLICATE MESSAGE: Message ${message.id} already exists in database`);
    return { isDuplicate: true, ticketId: existingMessage.ticket_id };
  }
  
  // Enhanced header-based matching
  const inReplyTo = message.internetMessageHeaders?.find(h => h.name.toLowerCase() === 'in-reply-to')?.value;
  const references = message.internetMessageHeaders?.find(h => h.name.toLowerCase() === 'references')?.value;
  
  // 1. Check for In-Reply-To matches
  if (inReplyTo) {
    const { data: ticketByInReplyTo } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, customer_email, status')
      .or(`email_message_id.eq.${inReplyTo},last_outgoing_message_id.eq.${inReplyTo}`)
      .eq('customer_email', senderEmail)
      .single();

    if (ticketByInReplyTo) {
      console.log(`Found ticket by In-Reply-To: ${ticketByInReplyTo.ticket_number}`);
      return ticketByInReplyTo;
    }
  }
  
  // 2. Cross-mailbox duplicate detection within time window (DANSK TID)
  const messageTime = toDanishTime(message.receivedDateTime);
  const timeWindow = new Date(messageTime.getTime() - 5 * 60 * 1000); // 5 minutes before

  const { data: recentTickets } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, subject, customer_email, created_at, mailbox_address, status')
    .eq('customer_email', senderEmail)
    .gte('created_at', timeWindow.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentTickets && recentTickets.length > 0) {
    const cleanSubject = message.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
    
    for (const ticket of recentTickets) {
      const ticketCleanSubject = ticket.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
      
      if (cleanSubject.toLowerCase() === ticketCleanSubject.toLowerCase()) {
        console.log(`CROSS-MAILBOX DUPLICATE DETECTED: Found ticket ${ticket.ticket_number} with same subject from same customer within time window`);
        return ticket;
      }
    }
  }
  
  // 3. Subject-based matching for reply threads
  const cleanSubject = message.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
  if (cleanSubject !== message.subject && cleanSubject.length > 3) {
    const { data: subjectMatches } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, customer_email, created_at, status')
      .eq('customer_email', senderEmail)
      .ilike('subject', `%${cleanSubject}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (subjectMatches && subjectMatches.length > 0) {
      for (const ticket of subjectMatches) {
        const ticketCleanSubject = ticket.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
        if (ticketCleanSubject.toLowerCase() === cleanSubject.toLowerCase()) {
          console.log(`Found ticket by exact subject match: ${ticket.ticket_number}`);
          return ticket;
        }
      }
    }
  }
  
  console.log(`No existing ticket found for message: ${message.id}`);
  return null;
};

// FORBEDRET message merging med automatiske status updates TIL DANSK TID
const mergeTicketMessage = async (supabase: any, existingTicket: any, message: GraphMessage, mailboxAddress: string, accessToken: string) => {
  console.log(`Merging message ${message.id} into existing ticket ${existingTicket.ticket_number} (current status: ${existingTicket.status})`);
  
  // Check for exact duplicate again to prevent race conditions
  if (message.id) {
    const { data: existingMessage } = await supabase
      .from('ticket_messages')
      .select('id')
      .eq('ticket_id', existingTicket.id)
      .eq('email_message_id', message.id)
      .single();

    if (existingMessage) {
      console.log(`DUPLICATE: Message ${message.id} already exists in ticket ${existingTicket.ticket_number}`);
      return existingTicket;
    }
  }
  
  // Process attachments if present
  let attachments = [];
  if (message.hasAttachments) {
    console.log(`Processing attachments for message ${message.id}...`);
    // Note: Attachment processing would be implemented here
  }
  
  const messageContent = message.body?.content || message.bodyPreview || '';
  
  // Add the message med DANSK TID
  const messageData = {
    ticket_id: existingTicket.id,
    sender_email: message.from.emailAddress.address,
    sender_name: message.from.emailAddress.name,
    message_content: messageContent,
    message_type: 'inbound_email',
    email_message_id: message.id,
    is_internal: false,
    attachments: attachments,
    created_at: toDanishTime(message.receivedDateTime).toISOString()
  };

  const { error: messageError } = await supabase
    .from('ticket_messages')
    .insert(messageData);

  if (messageError) {
    console.error('Failed to add message:', messageError);
    throw messageError;
  }
  
  // KRITISK: Auto-update ticket status to "Nyt svar" for customer replies
  const updateData: any = {
    status: 'Nyt svar', // Always set to "Nyt svar" when customer replies
    last_response_at: toDanishTime(message.receivedDateTime).toISOString(),
    updated_at: toDanishTime(new Date()).toISOString()
  };

  // Reopen closed/solved tickets
  if (existingTicket.status === 'Lukket' || existingTicket.status === 'Løst') {
    console.log(`REOPENING ticket ${existingTicket.ticket_number} due to customer reply`);
  }

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('id', existingTicket.id);

  if (updateError) {
    console.error('Failed to update ticket status:', updateError);
  } else {
    console.log(`Successfully updated ticket ${existingTicket.ticket_number} status to "Nyt svar"`);
  }

  return { ...existingTicket, ...updateData };
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
    console.log('Starting enhanced Office 365 email sync with Danish timezone and AI features...');
    
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

    // Fetch monitored mailboxes
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

    console.log(`Processing ${mailboxes.length} monitored mailboxes with enhanced AI features...`);
    
    let totalProcessed = 0;
    let totalErrors = 0;
    let totalMerged = 0;
    let totalInternalSkipped = 0;
    let totalReopened = 0;
    let totalDuplicatesSkipped = 0;

    for (const mailbox of mailboxes) {
      console.log(`Processing mailbox: ${mailbox.email_address}`);
      
      try {
        // Enhanced time window - last 10 minutes for better real-time processing
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages`;
        const filter = `?$filter=receivedDateTime gt ${tenMinutesAgo}&$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,internetMessageId,conversationId,parentFolderId,hasAttachments,internetMessageHeaders`;

        const messagesResponse = await retryWithExponentialBackoff(() => 
          fetch(`${messagesUrl}${filter}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          })
        );

        if (!messagesResponse.ok) {
          const errorText = await messagesResponse.text();
          console.error(`Failed to fetch messages for ${mailbox.email_address}:`, errorText);
          totalErrors++;
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages: GraphMessage[] = messagesData.value || [];
        
        console.log(`Found ${messages.length} messages for ${mailbox.email_address}`);

        for (const message of messages) {
          try {
            console.log(`Processing message ${message.id} from: ${message.from.emailAddress.address}`);
            
            const duplicateResult = await findDuplicateTicket(supabase, message);
            
            // Skip internal emails
            if (duplicateResult === null) {
              const internalDomains = ['@mmmultipartner.dk', 'mmmultipartner.dk'];
              const senderEmail = message.from.emailAddress.address.toLowerCase();
              
              if (internalDomains.some(domain => senderEmail.includes(domain))) {
                console.log(`SKIPPED internal email from ${senderEmail}`);
                totalInternalSkipped++;
                continue;
              }
            }
            
            // Handle duplicate messages
            if (duplicateResult && duplicateResult.isDuplicate) {
              console.log(`SKIPPED duplicate message ${message.id}`);
              totalDuplicatesSkipped++;
              continue;
            }
            
            if (duplicateResult && !duplicateResult.isDuplicate) {
              console.log(`Merging into existing ticket ${duplicateResult.ticket_number}...`);
              const wasClosedOrSolved = duplicateResult.status === 'Lukket' || duplicateResult.status === 'Løst';
              
              await mergeTicketMessage(supabase, duplicateResult, message, mailbox.email_address, accessToken);
              
              if (wasClosedOrSolved) {
                totalReopened++;
              }
              
              totalMerged++;
              continue;
            }

            // Create new ticket with AI enhancements og DANSK TID
            console.log('Creating new AI-enhanced ticket...');

            // Upsert customer
            await supabase
              .from('customers')
              .upsert({
                email: message.from.emailAddress.address,
                navn: message.from.emailAddress.name || message.from.emailAddress.address
              }, { 
                onConflict: 'email',
                ignoreDuplicates: false 
              });

            // Generate ticket number
            const { data: ticketNumber, error: ticketNumError } = await supabase.rpc('generate_ticket_number');
            
            if (ticketNumError) {
              console.error('Failed to generate ticket number:', ticketNumError);
              totalErrors++;
              continue;
            }

            // AI-powered enhancements
            const messageContent = message.body?.content || message.bodyPreview || '';
            const detectedPriority = autoDetectPriority(message.subject, messageContent);
            const detectedCategory = autoDetectCategory(message.subject, messageContent);
            const slaDeadline = calculateSLADeadline(message.receivedDateTime, detectedPriority);

            const ticketData = {
              ticket_number: ticketNumber,
              subject: message.subject || 'Ingen emne',
              content: messageContent,
              customer_email: message.from.emailAddress.address,
              customer_name: message.from.emailAddress.name,
              email_message_id: message.id,
              email_thread_id: message.conversationId,
              email_received_at: toDanishTime(message.receivedDateTime).toISOString(),
              mailbox_address: mailbox.email_address,
              source: 'office365',
              status: 'Åben',
              priority: detectedPriority,
              category: detectedCategory,
              sla_deadline: slaDeadline,
              auto_assigned: false,
              created_at: toDanishTime(new Date()).toISOString(),
              updated_at: toDanishTime(new Date()).toISOString()
            };

            console.log(`Creating AI-enhanced ticket with priority: ${detectedPriority}, category: ${detectedCategory}`);

            const { data: newTicket, error: ticketError } = await supabase
              .from('support_tickets')
              .insert(ticketData)
              .select()
              .single();

            if (ticketError) {
              console.error('Failed to create ticket:', ticketError);
              totalErrors++;
              continue;
            }

            // Add initial message med DANSK TID
            const messageData = {
              ticket_id: newTicket.id,
              sender_email: message.from.emailAddress.address,
              sender_name: message.from.emailAddress.name,
              message_content: messageContent,
              message_type: 'inbound_email',
              email_message_id: message.id,
              is_internal: false,
              attachments: [],
              created_at: toDanishTime(message.receivedDateTime).toISOString()
            };

            const { error: messageError } = await supabase
              .from('ticket_messages')
              .insert(messageData);

            if (messageError) {
              console.error('Failed to create ticket message:', messageError);
              totalErrors++;
            } else {
              totalProcessed++;
              console.log(`Successfully created AI-enhanced ticket ${newTicket.ticket_number} with priority ${detectedPriority}`);
            }

          } catch (messageError) {
            console.error(`Error processing message ${message.id}:`, messageError);
            totalErrors++;
          }
        }

        // Update mailbox sync timestamp MED DANSK TID
        await supabase
          .from('monitored_mailboxes')
          .update({ 
            last_sync_at: toDanishTime(new Date()).toISOString(),
            updated_at: toDanishTime(new Date()).toISOString()
          })
          .eq('id', mailbox.id);

      } catch (mailboxError) {
        console.error(`Error processing mailbox ${mailbox.email_address}:`, mailboxError);
        totalErrors++;
      }
    }

    const summary = {
      success: true,
      processed: totalProcessed,
      merged: totalMerged,
      reopened: totalReopened,
      internalSkipped: totalInternalSkipped,
      duplicatesSkipped: totalDuplicatesSkipped,
      errors: totalErrors,
      mailboxes: mailboxes.length,
      timestamp: toDanishTime(new Date()).toISOString(),
      danishTime: toDanishTime(new Date()).toLocaleString('da-DK'),
      details: `AI-Enhanced sync completed: ${totalProcessed} new tickets, ${totalMerged} merged messages, ${totalReopened} reopened tickets, ${totalInternalSkipped} internal emails skipped, ${totalDuplicatesSkipped} duplicates skipped`
    };

    console.log('Enhanced email sync completed:', summary.details);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Enhanced email sync error:', error);
    return new Response(JSON.stringify({ 
      error: String(error),
      timestamp: toDanishTime(new Date()).toISOString(),
      danishTime: toDanishTime(new Date()).toLocaleString('da-DK')
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
