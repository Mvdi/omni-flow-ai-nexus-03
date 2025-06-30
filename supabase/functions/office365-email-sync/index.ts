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

interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  contentBytes?: string;
  contentId?: string;
  isInline: boolean;
}

// Function to sanitize filename for Supabase Storage
function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace invalid chars with underscore
    .replace(/_{2,}/g, '_')           // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '')         // Remove leading/trailing underscores
    .toLowerCase();                   // Convert to lowercase
}

// Function to create content fingerprint for duplicate detection
function createContentFingerprint(subject: string, content: string): string {
  const cleanSubject = subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
  const cleanContent = content.replace(/\s+/g, ' ').trim().substring(0, 200);
  return `${cleanSubject}|${cleanContent}`.toLowerCase();
}

// KRITISK: Check if sender is from our own domain
function isInternalSender(emailAddress: string): boolean {
  const internalDomains = [
    '@mmmultipartner.dk',
    'mmmultipartner.dk'
  ];
  
  const normalizedEmail = emailAddress.toLowerCase();
  return internalDomains.some(domain => normalizedEmail.includes(domain));
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

// FORBEDRET: Function to find duplicate ticket med INTERNAL SENDER FILTERING og bedre threading
async function findDuplicateTicket(supabase: any, message: GraphMessage) {
  console.log(`Looking for existing ticket for message: ${message.id} with subject: "${message.subject}" from: ${message.from.emailAddress.address}`);
  
  // KRITISK: Skip processing hvis afsender er fra vores egne domæner
  if (isInternalSender(message.from.emailAddress.address)) {
    console.log(`SKIPPING internal sender: ${message.from.emailAddress.address} - this is an outgoing email from our system`);
    return null; // Return null så email bliver sprunget over
  }
  
  // Extract headers for better matching
  const inReplyTo = message.internetMessageHeaders?.find(h => h.name.toLowerCase() === 'in-reply-to')?.value;
  const references = message.internetMessageHeaders?.find(h => h.name.toLowerCase() === 'references')?.value;
  const ticketNumber = message.internetMessageHeaders?.find(h => h.name.toLowerCase() === 'x-ticket-number')?.value;
  
  console.log('Message headers:', { inReplyTo, references, ticketNumber });

  // 1. Check hvis dette er et svar baseret på In-Reply-To header
  if (inReplyTo) {
    console.log('Checking for ticket by In-Reply-To header:', inReplyTo);
    
    // Søg i både support_tickets og ticket_messages for In-Reply-To
    const { data: ticketByInReplyTo } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, customer_email')
      .or(`email_message_id.eq.${inReplyTo},last_outgoing_message_id.eq.${inReplyTo}`)
      .eq('customer_email', message.from.emailAddress.address)
      .single();

    if (ticketByInReplyTo) {
      console.log(`Found ticket by In-Reply-To: ${ticketByInReplyTo.ticket_number}`);
      return ticketByInReplyTo;
    }

    // Søg også i ticket_messages for In-Reply-To
    const { data: messagesByInReplyTo } = await supabase
      .from('ticket_messages')
      .select('ticket_id, ticket:support_tickets(id, ticket_number, subject, customer_email)')
      .eq('email_message_id', inReplyTo)
      .limit(1);

    if (messagesByInReplyTo && messagesByInReplyTo.length > 0) {
      const ticket = messagesByInReplyTo[0].ticket;
      if (ticket && ticket.customer_email === message.from.emailAddress.address) {
        console.log(`Found ticket by In-Reply-To in messages: ${ticket.ticket_number}`);
        return ticket;
      }
    }
  }

  // 2. Check hvis dette er et svar baseret på References header
  if (references) {
    console.log('Checking for ticket by References header:', references);
    const referenceIds = references.split(' ').filter(id => id.trim());
    
    for (const refId of referenceIds) {
      const { data: ticketByRef } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, customer_email')
        .or(`email_message_id.eq.${refId.trim()},last_outgoing_message_id.eq.${refId.trim()}`)
        .eq('customer_email', message.from.emailAddress.address)
        .single();

      if (ticketByRef) {
        console.log(`Found ticket by References: ${ticketByRef.ticket_number}`);
        return ticketByRef;
      }
    }
  }

  // 3. KRITISK: Cross-mailbox duplicate detection - tjek for recent tickets fra samme kunde med samme subject
  const messageTime = new Date(message.receivedDateTime);
  const timeWindow = new Date(messageTime.getTime() - 5 * 60 * 1000); // 5 minutter før

  console.log(`Checking for cross-mailbox duplicates from ${message.from.emailAddress.address} with subject "${message.subject}" within 5 minutes`);
  
  const { data: recentTickets } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, subject, customer_email, email_received_at, mailbox_address')
    .eq('customer_email', message.from.emailAddress.address)
    .gte('email_received_at', timeWindow.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  if (recentTickets && recentTickets.length > 0) {
    // Find exact eller near-exact subject match
    for (const ticket of recentTickets) {
      const cleanSubject = message.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
      const ticketCleanSubject = ticket.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
      
      if (cleanSubject.toLowerCase() === ticketCleanSubject.toLowerCase()) {
        console.log(`CROSS-MAILBOX DUPLICATE DETECTED: Found ticket ${ticket.ticket_number} from ${ticket.mailbox_address} with same subject from same customer within time window`);
        return ticket;
      }
    }
  }

  // 4. Check for exact message ID match (sikkerhedsnet)
  const { data: exactTicketMatch } = await supabase
    .from('support_tickets')
    .select('id, ticket_number, subject, customer_email')
    .eq('email_message_id', message.id)
    .single();

  if (exactTicketMatch) {
    console.log(`Found exact duplicate ticket by message ID: ${exactTicketMatch.ticket_number}`);
    return exactTicketMatch;
  }

  // 5. Check i ticket_messages for exact message ID
  const { data: messageMatches } = await supabase
    .from('ticket_messages')
    .select('ticket_id, ticket:support_tickets(id, ticket_number, subject, customer_email)')
    .eq('email_message_id', message.id)
    .limit(1);

  if (messageMatches && messageMatches.length > 0) {
    const ticket = messageMatches[0].ticket;
    console.log(`Found duplicate by message ID in ticket_messages: ${ticket.ticket_number}`);
    return ticket;
  }

  // 6. Subject-based matching for "Re:" replies med samme kunde
  const cleanSubject = message.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
  if (cleanSubject !== message.subject && cleanSubject.length > 3) {
    console.log(`Checking for ticket by cleaned subject: "${cleanSubject}" for customer: ${message.from.emailAddress.address}`);
    
    const { data: subjectMatches } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, subject, customer_email, created_at, status')
      .eq('customer_email', message.from.emailAddress.address)
      .ilike('subject', `%${cleanSubject}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (subjectMatches && subjectMatches.length > 0) {
      // Find det bedste match baseret på subject lighed
      for (const ticket of subjectMatches) {
        const ticketCleanSubject = ticket.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
        if (ticketCleanSubject.toLowerCase() === cleanSubject.toLowerCase()) {
          console.log(`Found ticket by exact subject match: ${ticket.ticket_number} (status: ${ticket.status})`);
          return ticket;
        }
      }
      
      // Hvis intet eksakt match, tag det første (nyeste)
      console.log(`Found ticket by partial subject match: ${subjectMatches[0].ticket_number} (status: ${subjectMatches[0].status})`);
      return subjectMatches[0];
    }
  }

  // 7. Check by conversation/thread ID
  if (message.conversationId) {
    const { data: threadMatch } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, email_thread_id, subject, customer_email')
      .eq('email_thread_id', message.conversationId)
      .eq('customer_email', message.from.emailAddress.address)
      .single();

    if (threadMatch) {
      console.log(`Found ticket by thread ID: ${threadMatch.ticket_number}`);
      return threadMatch;
    }
  }

  console.log(`No existing ticket found for message: ${message.id} with subject: "${message.subject}"`);
  return null;
}

// Function to download and store attachments with improved filename handling
async function processAttachments(supabase: any, accessToken: string, mailboxAddress: string, messageId: string): Promise<any[]> {
  console.log(`Processing attachments for message: ${messageId}`);
  
  try {
    // Get attachments list from Microsoft Graph
    const attachmentsUrl = `https://graph.microsoft.com/v1.0/users/${mailboxAddress}/messages/${messageId}/attachments`;
    const attachmentsResponse = await fetch(attachmentsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!attachmentsResponse.ok) {
      console.error(`Failed to fetch attachments for message ${messageId}:`, await attachmentsResponse.text());
      return [];
    }

    const attachmentsData = await attachmentsResponse.json();
    const attachments: GraphAttachment[] = attachmentsData.value || [];
    
    if (attachments.length === 0) {
      console.log(`No attachments found for message: ${messageId}`);
      return [];
    }

    console.log(`Found ${attachments.length} attachments for message: ${messageId}`);
    
    const processedAttachments = [];

    for (const attachment of attachments) {
      try {
        // Skip inline attachments (embedded images)
        if (attachment.isInline) {
          console.log(`Skipping inline attachment: ${attachment.name}`);
          continue;
        }

        // Get attachment content
        const attachmentUrl = `https://graph.microsoft.com/v1.0/users/${mailboxAddress}/messages/${messageId}/attachments/${attachment.id}`;
        const attachmentResponse = await fetch(attachmentUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!attachmentResponse.ok) {
          console.error(`Failed to fetch attachment ${attachment.name}:`, await attachmentResponse.text());
          continue;
        }

        const attachmentData = await attachmentResponse.json();
        
        if (!attachmentData.contentBytes) {
          console.error(`No content bytes for attachment: ${attachment.name}`);
          continue;
        }

        // Convert base64 to binary
        const contentBytes = Uint8Array.from(atob(attachmentData.contentBytes), c => c.charCodeAt(0));
        
        // Generate unique filename with sanitization
        const timestamp = new Date().getTime();
        const sanitizedOriginalName = sanitizeFilename(attachment.name);
        const fileName = `${timestamp}_${sanitizedOriginalName}`;
        const filePath = `attachments/${fileName}`;

        console.log(`Uploading attachment: ${attachment.name} -> ${fileName}`);

        // Upload to Supabase Storage
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

        console.log(`Successfully uploaded attachment: ${fileName}`);

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);

        const processedAttachment = {
          id: attachment.id,
          name: attachment.name, // Keep original name for display
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

// FORBEDRET: Function to merge ticket messages med LUKKET ticket genåbning
async function mergeTicketMessage(supabase: any, existingTicket: any, message: GraphMessage, mailboxAddress: string, accessToken: string) {
  console.log(`Merging message ${message.id} into existing ticket ${existingTicket.ticket_number} (status: ${existingTicket.status})`);
  
  // KRITISK: Check if this exact email_message_id already exists in this ticket
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

  // Process attachments if present
  let attachments = [];
  if (message.hasAttachments) {
    console.log(`Message has attachments, processing...`);
    attachments = await processAttachments(supabase, accessToken, mailboxAddress, message.id);
  }

  // If we get here, the message is not a duplicate - add it
  const messageData = {
    ticket_id: existingTicket.id,
    sender_email: message.from.emailAddress.address,
    sender_name: message.from.emailAddress.name,
    message_content: messageContent,
    message_type: 'inbound_email',
    email_message_id: message.id,
    is_internal: false,
    attachments: attachments
  };

  console.log(`Adding NEW message to ticket ${existingTicket.ticket_number} with ${attachments.length} attachments`);

  const { error: messageError } = await supabase
    .from('ticket_messages')
    .insert(messageData);

  if (messageError) {
    console.error('Failed to merge ticket message:', messageError);
    throw messageError;
  }

  // KRITISK: Opdater ticket status - genåbn lukket ticket hvis nødvendigt og set status til "Nyt svar"
  const updateData: any = {
    last_response_at: message.receivedDateTime,
    updated_at: new Date().toISOString()
  };

  // Genåbn ticket hvis det er lukket og kunden svarer - sæt status til "Nyt svar"
  if (existingTicket.status === 'Lukket' || existingTicket.status === 'Løst') {
    updateData.status = 'Nyt svar';
    console.log(`REOPENING closed ticket ${existingTicket.ticket_number} due to customer reply - setting status to "Nyt svar"`);
  } else {
    // Hvis ticket ikke er lukket, sæt det stadig til "Nyt svar" når kunden svarer
    updateData.status = 'Nyt svar';
    console.log(`Setting ticket ${existingTicket.ticket_number} status to "Nyt svar" due to customer reply`);
  }

  if (!existingTicket.email_thread_id) {
    updateData.email_thread_id = message.conversationId;
  }

  const { error: updateError } = await supabase
    .from('support_tickets')
    .update(updateData)
    .eq('id', existingTicket.id);

  if (updateError) {
    console.error('Failed to update existing ticket:', updateError);
  } else {
    console.log(`Successfully updated ticket ${existingTicket.ticket_number} with new message and status: ${updateData.status}`);
  }

  console.log(`Successfully merged NEW message into ticket ${existingTicket.ticket_number} with ${attachments.length} attachments`);
  return { ...existingTicket, ...updateData };
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
    console.log('Starting Office 365 email sync with INTERNAL SENDER FILTERING and enhanced duplicate detection...');
    
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

    console.log(`Processing ${mailboxes.length} monitored mailboxes with INTERNAL SENDER FILTERING...`);
    let totalProcessed = 0;
    let totalErrors = 0;
    let totalMerged = 0;
    let totalSkipped = 0;
    let totalAttachmentsProcessed = 0;
    let totalReopened = 0;
    let totalInternalSkipped = 0;

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
        // Use 5 minute window for real-time performance
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        // FIXED: Use correct Microsoft Graph API syntax
        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages`;
        const filter = `?$filter=receivedDateTime gt ${fiveMinutesAgo}&$top=20&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,internetMessageId,conversationId,parentFolderId,hasAttachments,internetMessageHeaders`;

        console.log(`Fetching messages with INTERNAL SENDER FILTERING from: ${messagesUrl}${filter}`);
        
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
        
        console.log(`Found ${messages.length} messages for ${mailbox.email_address} with INTERNAL SENDER FILTERING`);

        for (const message of messages) {
          try {
            console.log(`Processing message ${message.id} with subject: "${message.subject}" from: ${message.from.emailAddress.address} (hasAttachments: ${message.hasAttachments})`);
            
            const duplicateTicket = await findDuplicateTicket(supabase, message);
            
            // KRITISK: Hvis findDuplicateTicket returnerer null for internal sender, skip helt
            if (duplicateTicket === null && isInternalSender(message.from.emailAddress.address)) {
              console.log(`SKIPPED internal sender email from ${message.from.emailAddress.address}`);
              totalInternalSkipped++;
              continue;
            }
            
            if (duplicateTicket) {
              console.log(`Found existing ticket ${duplicateTicket.ticket_number} for message, merging...`);
              const updatedTicket = await mergeTicketMessage(supabase, duplicateTicket, message, mailbox.email_address, tokenData.access_token);
              
              // Track if we reopened a ticket
              if (duplicateTicket.status === 'Lukket' || duplicateTicket.status === 'Løst') {
                totalReopened++;
              }
              
              totalMerged++;
              continue;
            }

            console.log('No existing ticket found, creating new ticket...');

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
              priority: null // FIXED: Fjern hårdkodet Medium prioritet
            };

            console.log('Creating NEW ticket with data:', JSON.stringify(ticketData, null, 2));

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

            // Process attachments for new ticket
            let attachments = [];
            if (message.hasAttachments) {
              console.log(`Processing attachments for new ticket...`);
              attachments = await processAttachments(supabase, tokenData.access_token, mailbox.email_address, message.id);
              totalAttachmentsProcessed += attachments.length;
            }

            const messageData = {
              ticket_id: newTicket.id,
              sender_email: message.from.emailAddress.address,
              sender_name: message.from.emailAddress.name,
              message_content: message.body?.content || message.bodyPreview || '',
              message_type: 'inbound_email',
              email_message_id: message.id,
              is_internal: false,
              attachments: attachments
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
              console.log(`Successfully processed message ${message.id} into NEW ticket ${newTicket.ticket_number} with ${attachments.length} attachments`);
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

    console.log(`Email sync completed with INTERNAL SENDER FILTERING. Processed: ${totalProcessed}, Merged: ${totalMerged}, Reopened: ${totalReopened}, Internal Skipped: ${totalInternalSkipped}, Errors: ${totalErrors}, Duplicates cleaned: ${duplicatesRemoved}, Attachments: ${totalAttachmentsProcessed}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: totalProcessed,
      merged: totalMerged,
      reopened: totalReopened,
      internalSkipped: totalInternalSkipped,
      errors: totalErrors,
      duplicatesRemoved: duplicatesRemoved,
      attachmentsProcessed: totalAttachmentsProcessed,
      mailboxes: mailboxes.length,
      timestamp: new Date().toISOString(),
      details: `INTERNAL SENDER FILTERING - processed ${totalProcessed} new tickets, merged ${totalMerged} messages, reopened ${totalReopened} tickets, skipped ${totalInternalSkipped} internal emails, cleaned ${duplicatesRemoved} duplicates, processed ${totalAttachmentsProcessed} attachments`
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
