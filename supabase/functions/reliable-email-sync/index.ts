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

interface EmailSyncRequest {
  source?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  syncHours?: number;
  facebookLeadDetection?: boolean;
}

// BULLETPROOF: Enhanced configuration for maximum reliability + Facebook lead detection
let isSyncRunning = false;
let lastSyncTime: Date | null = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const SYNC_LOCK_TIMEOUT = 3 * 60 * 1000; // 3 minutes for faster recovery
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  operation: string = 'operation'
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error(`${operation} failed (${retries} retries left):`, error);
    
    if (retries <= 0) {
      throw new Error(`${operation} failed after ${MAX_RETRIES} attempts: ${error}`);
    }
    
    const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
    console.log(`Retrying ${operation} in ${delay}ms...`);
    await sleep(delay);
    return retryWithExponentialBackoff(fn, retries - 1, operation);
  }
};

// FACEBOOK LEAD DETECTION: Intelligent categorization
const isFacebookLead = (subject: string, content: string): boolean => {
  const text = `${subject} ${content}`.toLowerCase();
  const facebookIndicators = [
    'facebook lead',
    'facebook form',
    'lead from facebook',
    'facebook inquiry',
    'via facebook',
    'facebook contact',
    'facebook ad',
    'facebook campaign'
  ];
  
  return facebookIndicators.some(indicator => text.includes(indicator));
};

// INTELLIGENT SERVICE DETECTION: Extract service type from email content
const detectServiceFromContent = (content: string): string | null => {
  const text = content.toLowerCase();
  
  // Service patterns with priority
  const servicePatterns = [
    { service: 'Vinduespudsning', patterns: ['vindues', 'window', 'rude', 'glasrengøring', 'facade'], priority: 1 },
    { service: 'Rengøring', patterns: ['rengøring', 'cleaning', 'rens', 'gør rent', 'städning'], priority: 1 },
    { service: 'Havearbejde', patterns: ['have', 'garden', 'græs', 'plæne', 'beskæring', 'hæk'], priority: 2 },
    { service: 'Byggeri', patterns: ['byg', 'construction', 'renovering', 'ombygning', 'håndværk'], priority: 3 }
  ];
  
  for (const servicePattern of servicePatterns) {
    if (servicePattern.patterns.some(pattern => text.includes(pattern))) {
      return servicePattern.service;
    }
  }
  
  return null;
};

// INTELLIGENT CUSTOMER DATA EXTRACTION: Extract phone, address, etc.
const extractCustomerData = (content: string) => {
  const phoneRegex = /(\+45\s?)?[\d\s\-\(\)]{8,}/g;
  const addressRegex = /\d{1,4}\s+[A-Za-zæøåÆØÅ\s]+,?\s*\d{4}?\s*[A-Za-zæøåÆØÅ]*/g;
  
  const phones = content.match(phoneRegex) || [];
  const addresses = content.match(addressRegex) || [];
  
  return {
    phones: phones.slice(0, 2), // Max 2 phones
    addresses: addresses.slice(0, 1), // Max 1 address
    extractedAt: new Date().toISOString()
  };
};

// BULLETPROOF FACEBOOK LEAD CREATION: Create lead instead of ticket
const createFacebookLead = async (supabase: any, message: GraphMessage, mailboxAddress: string) => {
  console.log(`🎯 FACEBOOK LEAD DETECTED: Creating lead for ${message.subject}`);
  
  const messageContent = message.body?.content || message.bodyPreview || '';
  const senderEmail = message.from.emailAddress.address;
  const senderName = message.from.emailAddress.name || senderEmail.split('@')[0];
  
  // Intelligent service detection
  const detectedService = detectServiceFromContent(messageContent);
  
  // Extract customer data
  const customerData = extractCustomerData(messageContent);
  
  // Create enriched customer data object
  const enrichedData = {
    detected_service: detectedService,
    extracted_phone: customerData.phones[0] || null,
    extracted_address: customerData.addresses[0] || null,
    source_email: senderEmail,
    facebook_lead: true,
    original_email_id: message.id,
    processed_at: new Date().toISOString(),
    email_content: messageContent
  };
  
  // Create lead with email content as notes
  const leadNotes = `🎯 FACEBOOK LEAD - Automatisk oprettet fra email
  
📧 **Original Email:**
Emne: ${message.subject}
Fra: ${senderName} <${senderEmail}>
Modtaget: ${new Date(message.receivedDateTime).toLocaleString('da-DK')}

📝 **Besked:**
${messageContent}

🔍 **Detekteret Service:** ${detectedService || 'Ikke detekteret'}
📞 **Ekstraheret Telefon:** ${customerData.phones[0] || 'Ikke fundet'}
📍 **Ekstraheret Adresse:** ${customerData.addresses[0] || 'Ikke fundet'}

⚡ **Automatisk behandling:** ${new Date().toLocaleString('da-DK')}`;
  
  // Create lead
  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert({
      navn: senderName,
      email: senderEmail,
      telefon: customerData.phones[0] || null,
      adresse: customerData.addresses[0] || null,
      virksomhed: detectedService ? `${detectedService} kunde` : null,
      status: 'new',
      kilde: 'Facebook Lead',
      prioritet: detectedService ? 'Høj' : 'Medium',
      noter: leadNotes,
      ai_enriched_data: enrichedData,
      sidste_kontakt: `Facebook lead email: ${new Date(message.receivedDateTime).toLocaleString('da-DK')}`
    })
    .select()
    .single();
  
  if (leadError) {
    console.error('❌ Failed to create Facebook lead:', leadError);
    throw leadError;
  }
  
  // Track Facebook lead processing
  await supabase
    .from('facebook_leads_processed')
    .insert({
      email_message_id: message.id,
      lead_id: newLead.id,
      service_detected: detectedService,
      customer_data: enrichedData,
      original_email_content: messageContent,
      processing_notes: `Auto-created lead from ${mailboxAddress} - ${detectedService || 'General service'}`
    });
  
  console.log(`✅ FACEBOOK LEAD CREATED: ${newLead.id} for ${detectedService || 'General'} service`);
  return newLead;
};

// Acquire sync lock with bulletproof timeout handling
const acquireSyncLock = async (supabase: any): Promise<boolean> => {
  if (isSyncRunning) {
    const timeSinceLastSync = lastSyncTime ? Date.now() - lastSyncTime.getTime() : 0;
    if (timeSinceLastSync < SYNC_LOCK_TIMEOUT) {
      console.log('Sync already running, skipping...');
      return false;
    } else {
      console.log('Sync lock timeout reached, forcing new sync...');
      isSyncRunning = false;
    }
  }

  try {
    const { error } = await supabase
      .from('email_sync_log')
      .insert({
        mailbox_address: 'SYSTEM_LOCK',
        status: 'running',
        sync_started_at: new Date().toISOString(),
        emails_processed: 0,
        errors_count: 0
      });

    if (error && error.code === '23505') {
      console.log('Another sync process is already running');
      return false;
    }

    isSyncRunning = true;
    lastSyncTime = new Date();
    return true;
  } catch (error) {
    console.error('Failed to acquire sync lock:', error);
    return false;
  }
};

// Release sync lock
const releaseSyncLock = async (supabase: any) => {
  isSyncRunning = false;
  
  try {
    await supabase
      .from('email_sync_log')
      .delete()
      .eq('mailbox_address', 'SYSTEM_LOCK')
      .eq('status', 'running');
  } catch (error) {
    console.error('Failed to release sync lock:', error);
  }
};

// Enhanced token management with automatic refresh
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
      throw new Error(`Token request failed: ${response.status} ${errorText}`);
    }

    const tokenData: GraphTokenResponse = await response.json();
    console.log('✅ Access token obtained successfully');
    return tokenData.access_token;
  }, MAX_RETRIES, 'Token acquisition');
};

// ENHANCED EMAIL PROCESSING: Facebook lead detection + ticket creation
const processEmail = async (supabase: any, message: GraphMessage, mailboxAddress: string, facebookLeadDetection = false) => {
  const senderEmail = message.from.emailAddress.address.toLowerCase();
  
  console.log(`🔍 PROCESSING EMAIL: From=${senderEmail}, Subject=${message.subject}, Mailbox=${mailboxAddress}`);
  
  // CRITICAL: Special handling for Facebook lead emails from moba@mmmultipartner.dk
  if (senderEmail === 'moba@mmmultipartner.dk') {
    console.log(`🎯 FACEBOOK LEAD SOURCE DETECTED: ${senderEmail} - Processing as lead regardless of subject`);
    const newLead = await createFacebookLead(supabase, message, mailboxAddress);
    return { type: 'facebook_lead_created', leadId: newLead.id };
  }
  
  // Skip internal emails immediately - but NOT moba@ (handled above)
  const internalDomains = ['@mmmultipartner.dk'];
  if (internalDomains.some(domain => senderEmail.includes(domain))) {
    console.log(`⏭️ SKIPPED internal email from ${senderEmail}`);
    return { type: 'internal_skip' };
  }

  // ENHANCED duplicate check: Check by message ID AND content-based detection
  const { data: existingMessage } = await supabase
    .from('ticket_messages')
    .select('ticket_id, id')
    .eq('email_message_id', message.id)
    .single();

  if (existingMessage) {
    console.log(`⏭️ DUPLICATE MESSAGE ID: ${message.id} already exists`);
    return { type: 'duplicate_skip' };
  }

  // CRITICAL: Additional duplicate check for same content from same sender (cross-mailbox)
  const messageContent = message.body?.content || message.bodyPreview || '';
  const { data: contentDuplicate } = await supabase
    .from('support_tickets')
    .select('ticket_number, id')
    .eq('customer_email', senderEmail)
    .eq('subject', message.subject)
    .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
    .single();

  if (contentDuplicate) {
    console.log(`⏭️ CONTENT DUPLICATE: Same email from ${senderEmail} with subject "${message.subject}" found within 10 minutes - adding to existing ticket ${contentDuplicate.ticket_number}`);
    await addMessageToTicket(supabase, contentDuplicate, message);
    return { type: 'merged', ticketId: contentDuplicate.id };
  }

  // FACEBOOK LEAD DETECTION: Check if this should be a lead instead of ticket
  if (facebookLeadDetection) {
    const messageContent = message.body?.content || message.bodyPreview || '';
    if (isFacebookLead(message.subject, messageContent)) {
      const newLead = await createFacebookLead(supabase, message, mailboxAddress);
      return { type: 'facebook_lead_created', leadId: newLead.id };
    }
  }

  // Find existing ticket for this conversation
  const existingTicket = await findExistingTicket(supabase, message);
  
  if (existingTicket) {
    console.log(`🔗 Adding to existing ticket ${existingTicket.ticket_number}`);
    await addMessageToTicket(supabase, existingTicket, message);
    return { type: 'merged', ticketId: existingTicket.id };
  } else {
    console.log(`✨ Creating new ticket for ${message.subject}`);
    const newTicket = await createNewTicket(supabase, message, mailboxAddress);
    return { type: 'created', ticketId: newTicket.id };
  }
};

// Enhanced ticket finding logic
const findExistingTicket = async (supabase: any, message: GraphMessage) => {
  const senderEmail = message.from.emailAddress.address.toLowerCase();
  
  // Check for In-Reply-To header
  const inReplyTo = message.internetMessageHeaders?.find(h => h.name.toLowerCase() === 'in-reply-to')?.value;
  if (inReplyTo) {
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('*')
      .or(`email_message_id.eq.${inReplyTo},last_outgoing_message_id.eq.${inReplyTo}`)
      .eq('customer_email', senderEmail)
      .single();

    if (ticket) return ticket;
  }

  // Check for subject-based matching (replies)
  const cleanSubject = message.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
  if (cleanSubject !== message.subject && cleanSubject.length > 3) {
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('customer_email', senderEmail)
      .ilike('subject', `%${cleanSubject}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (tickets && tickets.length > 0) {
      for (const ticket of tickets) {
        const ticketCleanSubject = ticket.subject.replace(/^(Re:|Sv:|Ang\.:|AW:)/i, '').trim();
        if (ticketCleanSubject.toLowerCase() === cleanSubject.toLowerCase()) {
          return ticket;
        }
      }
    }
  }

  return null;
};

// CRITICAL FIX: Proper ticket status update for customer replies
const addMessageToTicket = async (supabase: any, ticket: any, message: GraphMessage) => {
  const messageContent = message.body?.content || message.bodyPreview || '';
  
  console.log(`📝 Adding customer reply to ticket ${ticket.ticket_number}`);
  
  // Add the message first
  const { error: messageError } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_email: message.from.emailAddress.address,
      sender_name: message.from.emailAddress.name,
      message_content: messageContent,
      message_type: 'inbound_email',
      email_message_id: message.id,
      is_internal: false,
      attachments: [],
      created_at: new Date(message.receivedDateTime).toISOString()
    });

  if (messageError) {
    console.error('Failed to add message:', messageError);
    throw messageError;
  }

  // Update ticket status to "Nyt svar" for customer emails
  console.log(`🚨 Setting ticket ${ticket.ticket_number} status to "Nyt svar"`);
  
  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      status: 'Nyt svar',
      last_response_at: new Date(message.receivedDateTime).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', ticket.id);

  if (updateError) {
    console.error('Failed to update ticket status:', updateError);
    throw updateError;
  } else {
    console.log(`✅ Ticket ${ticket.ticket_number} status set to "Nyt svar"`);
  }
};

// Create new ticket
const createNewTicket = async (supabase: any, message: GraphMessage, mailboxAddress: string) => {
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

  const messageContent = message.body?.content || message.bodyPreview || '';
  const basicCategory = autoDetectCategory(message.subject, messageContent);
  const slaDeadline = calculateSLADeadline(message.receivedDateTime);

  const ticketData = {
    subject: message.subject || 'Ingen emne',
    content: messageContent,
    customer_email: message.from.emailAddress.address,
    customer_name: message.from.emailAddress.name,
    email_message_id: message.id,
    email_thread_id: message.conversationId,
    email_received_at: new Date(message.receivedDateTime).toISOString(),
    mailbox_address: mailboxAddress,
    source: 'office365',
    status: 'Åben',
    priority: null, // No automatic priority
    category: basicCategory,
    sla_deadline: slaDeadline,
    auto_assigned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: newTicket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert(ticketData)
    .select()
    .single();

  if (ticketError) throw ticketError;

  // Add initial message
  const { error: messageError } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: newTicket.id,
      sender_email: message.from.emailAddress.address,
      sender_name: message.from.emailAddress.name,
      message_content: messageContent,
      message_type: 'inbound_email',
      email_message_id: message.id,
      is_internal: false,
      attachments: [],
      created_at: new Date(message.receivedDateTime).toISOString()
    });

  if (messageError) throw messageError;

  return newTicket;
};

// Simplified category detection
const autoDetectCategory = (subject: string, content: string): string => {
  const text = `${subject} ${content}`.toLowerCase();
  
  if (text.includes('faktura') || text.includes('betaling') || text.includes('regning')) {
    return 'Fakturering';
  } else if (text.includes('teknisk') || text.includes('fejl') || text.includes('bug')) {
    return 'Teknisk Support';
  } else if (text.includes('klage') || text.includes('utilfreds') || text.includes('complaint')) {
    return 'Klage';
  } else if (text.includes('ændring') || text.includes('opdater') || text.includes('skift')) {
    return 'Ændringer';
  }
  
  return 'Generel';
};

// Calculate SLA deadline
const calculateSLADeadline = (createdAt: string): string => {
  const created = new Date(createdAt);
  const hoursToAdd = 24; // Default 24 hours for ALL tickets
  
  return new Date(created.getTime() + hoursToAdd * 60 * 60 * 1000).toISOString();
};

// Real-time health monitoring
const recordSyncHealth = async (supabase: any, status: 'healthy' | 'warning' | 'critical', details: any) => {
  try {
    await supabase
      .from('email_sync_log')
      .insert({
        mailbox_address: 'HEALTH_CHECK',
        status: status === 'healthy' ? 'completed' : 'failed',
        emails_processed: details.processed || 0,
        errors_count: details.errors || 0,
        error_details: details.message || null,
        facebook_leads_created: details.facebookLeads || 0,
        sync_started_at: new Date().toISOString(),
        sync_completed_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to record sync health:', error);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    return new Response(JSON.stringify({ error: "Server configuration error" }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Parse request for enhanced options
    const requestBody = await req.json().catch(() => ({})) as EmailSyncRequest;
    const syncHours = requestBody.syncHours || 6; // Default 6 hours, 24 for nightly
    const facebookLeadDetection = requestBody.facebookLeadDetection || false;
    const priority = requestBody.priority || 'normal';
    
    console.log(`🚀 BULLETPROOF Email Sync starting: ${syncHours}h window, Facebook leads: ${facebookLeadDetection}, Priority: ${priority}`);
    
    // SINGLETON PATTERN - Acquire lock
    if (!(await acquireSyncLock(supabase))) {
      return new Response(JSON.stringify({ 
        message: "Sync already running or locked",
        timestamp: new Date().toISOString()
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
      console.error('❌ Missing Office 365 credentials');
      await recordSyncHealth(supabase, 'critical', { 
        message: 'Missing Office 365 credentials',
        errors: 1 
      });
      await releaseSyncLock(supabase);
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
      console.error('❌ Incomplete Office 365 credentials');
      await recordSyncHealth(supabase, 'critical', { 
        message: 'Incomplete Office 365 credentials',
        errors: 1 
      });
      await releaseSyncLock(supabase);
      return new Response(JSON.stringify({ 
        error: "Incomplete Office 365 credentials"
      }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get access token with retry logic
    const accessToken = await getAccessToken(client_id, client_secret, tenant_id);

    // Fetch monitored mailboxes
    const { data: mailboxes, error: mailboxError } = await supabase
      .from('monitored_mailboxes')
      .select('*')
      .eq('is_active', true);

    if (mailboxError || !mailboxes) {
      console.error('❌ Failed to fetch monitored mailboxes');
      await recordSyncHealth(supabase, 'critical', { 
        message: 'Failed to fetch monitored mailboxes',
        errors: 1 
      });
      await releaseSyncLock(supabase);
      return new Response(JSON.stringify({ error: "Failed to fetch monitored mailboxes" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log(`📧 BULLETPROOF: Processing ${mailboxes.length} mailboxes with ${syncHours}h window...`);
    
    let totalProcessed = 0;
    let totalErrors = 0;
    let totalMerged = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalFacebookLeads = 0;

    for (const mailbox of mailboxes) {
      console.log(`📮 Processing mailbox: ${mailbox.email_address}`);
      
      try {
        // Dynamic sync window based on request
        const syncWindowStart = new Date(Date.now() - syncHours * 60 * 60 * 1000).toISOString();
        
        const messagesUrl = `https://graph.microsoft.com/v1.0/users/${mailbox.email_address}/messages`;
        const maxMessages = priority === 'critical' ? 200 : 50;
        const filter = `?$filter=receivedDateTime gt ${syncWindowStart}&$top=${maxMessages}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,toRecipients,receivedDateTime,internetMessageId,conversationId,parentFolderId,hasAttachments,internetMessageHeaders`;

        const messagesResponse = await fetch(`${messagesUrl}${filter}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!messagesResponse.ok) {
          throw new Error(`HTTP ${messagesResponse.status}: ${await messagesResponse.text()}`);
        }

        const messagesData = await messagesResponse.json();
        const messages: any[] = messagesData.value || [];
        
        console.log(`📬 Found ${messages.length} messages for ${mailbox.email_address} (${syncHours}h window)`);

        for (const message of messages) {
          try {
            console.log(`📝 Processing message ${message.id} from: ${message.from.emailAddress.address}`);
            
            const result = await processEmail(supabase, message, mailbox.email_address, facebookLeadDetection);
            
            switch (result.type) {
              case 'created':
                totalCreated++;
                totalProcessed++;
                console.log(`✅ Created new ticket for ${message.id}`);
                break;
              case 'merged':
                totalMerged++;
                console.log(`🔗 Merged message ${message.id} to existing ticket with status "Nyt svar"`);
                break;
              case 'facebook_lead_created':
                totalFacebookLeads++;
                console.log(`🎯 Created Facebook lead ${result.leadId} for ${message.id}`);
                break;
              case 'internal_skip':
              case 'duplicate_skip':
                totalSkipped++;
                console.log(`⏭️ Skipped message ${message.id}`);
                break;
            }

          } catch (messageError) {
            console.error(`❌ Error processing message ${message.id}:`, messageError);
            totalErrors++;
          }
        }

        // Update mailbox sync timestamp
        await supabase
          .from('monitored_mailboxes')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', mailbox.id);

      } catch (mailboxError) {
        console.error(`❌ Error processing mailbox ${mailbox.email_address}:`, mailboxError);
        totalErrors++;
      }
    }

    const summary = {
      success: true,
      processed: totalProcessed,
      created: totalCreated,
      merged: totalMerged,
      facebookLeads: totalFacebookLeads,
      skipped: totalSkipped,
      errors: totalErrors,
      syncHours,
      priority,
      timestamp: new Date().toISOString(),
      details: `🎯 BULLETPROOF sync (${syncHours}h): ${totalCreated} tickets, ${totalMerged} merged, ${totalFacebookLeads} FB leads, ${totalSkipped} skipped, ${totalErrors} errors`
    };

    console.log('🎉 BULLETPROOF email sync completed:', summary.details);

    // Record health status with Facebook lead tracking
    await recordSyncHealth(supabase, totalErrors > 0 ? 'warning' : 'healthy', {
      processed: totalProcessed,
      errors: totalErrors,
      facebookLeads: totalFacebookLeads,
      message: summary.details
    });

    // Release lock
    await releaseSyncLock(supabase);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('💥 CRITICAL: Email sync system failure:', error);
    consecutiveFailures++;
    
    // Record critical failure
    await recordSyncHealth(supabase, 'critical', { 
      processed: 0, 
      errors: 1, 
      message: `CRITICAL FAILURE: ${String(error)}` 
    });

    // Release lock
    await releaseSyncLock(supabase);

    return new Response(JSON.stringify({ 
      error: String(error),
      consecutiveFailures,
      timestamp: new Date().toISOString(),
      critical: true
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});