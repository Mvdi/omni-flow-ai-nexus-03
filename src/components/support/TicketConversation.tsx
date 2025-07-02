import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from 'react';
import { SupportTicket, useUpdateTicket } from '@/hooks/useTickets';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { useOffice365EmailSender } from '@/hooks/useOffice365EmailSender';
import { AttachmentViewer } from './AttachmentViewer';
import { DuplicateMessageHandler } from './DuplicateMessageHandler';
import { AIResponseSuggestions } from './AIResponseSuggestions';
import { TicketReminders } from './TicketReminders';
import { formatDanishDistance, formatDanishDateTime, debugTimeConversion } from '@/utils/danishTime';
import { Send, Bot, User, Clock, Mail, Tag, Loader2, Download, Plus, X } from 'lucide-react';
import { useTicketTags, useAddTicketTag, useRemoveTicketTag } from '@/hooks/useTicketTags';
import { useAIResponseImprover } from '@/hooks/useAIResponseImprover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface TicketConversationProps {
  ticket: SupportTicket;
}

// CRITICAL FIX: Format messages with signature AND correct Danish time
const formatMessageWithSignature = (content: string, isFromSupport: boolean) => {
  if (!isFromSupport) {
    return content.replace(/\n/g, '<br>');
  }

  // For support messages: check for signature
  if (content.includes('---SIGNATUR---')) {
    const parts = content.split('---SIGNATUR---');
    const messageText = parts[0].trim();
    const signatureHtml = parts[1].trim();
    
    return `
      <div style="margin-bottom: 16px;">
        ${messageText.replace(/\n/g, '<br>')}
      </div>
      <div style="border-top: 1px solid #e5e7eb; margin-top: 16px; padding-top: 12px;">
        ${signatureHtml}
      </div>
    `;
  }
  
  return content.replace(/\n/g, '<br>');
};

export const TicketConversation = ({ ticket }: TicketConversationProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [signatureHtml, setSignatureHtml] = useState('');
  const [activeTab, setActiveTab] = useState('compose');
  const [isFetchingAttachments, setIsFetchingAttachments] = useState(false);
  const [ccEmails, setCcEmails] = useState('');
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: messages = [], isLoading, error, isError, refetch } = useTicketMessages(ticket.id);
  const { data: tags = [] } = useTicketTags(ticket.id);
  const updateTicket = useUpdateTicket();
  const { sendEmail, isSending } = useOffice365EmailSender();
  const addTicketTag = useAddTicketTag();
  const removeTicketTag = useRemoveTicketTag();
  const improveResponse = useAIResponseImprover();

  useEffect(() => {
    const loadSignature = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          const { data: userSignature } = await supabase
            .from('user_signatures')
            .select('html')
            .eq('user_id', user.id)
            .single();
          
          if (userSignature?.html) {
            setSignatureHtml(userSignature.html);
            console.log('Loaded signature for preview');
          }
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    };
    
    loadSignature();
  }, []);

  const handleStatusChange = (newStatus: string) => {
    updateTicket.mutate({ 
      id: ticket.id, 
      updates: { status: newStatus as any } 
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    if (newPriority && newPriority !== '') {
      updateTicket.mutate({ 
        id: ticket.id, 
        updates: { priority: newPriority as any } 
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      console.log('Sending email via Office 365...');
      
      await sendEmail({
        ticket_id: ticket.id,
        message_content: newMessage,
        sender_name: 'Support Team',
        cc_emails: ccEmails.trim() ? ccEmails.split(',').map(email => email.trim()).filter(Boolean) : undefined
      });
      
      console.log('Email sent successfully via Office 365');
      setNewMessage('');
      setCcEmails('');
      setActiveTab('compose');
      
      setTimeout(() => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        title: "Fejl ved afsendelse",
        description: "Kunne ikke sende email. Prøv igen senere.",
        variant: "destructive",
      });
    }
  };

  const handleUseSuggestion = (content: string) => {
    setNewMessage(content);
    setActiveTab('compose');
  };

  const handleImproveResponse = async () => {
    if (!newMessage.trim()) return;
    
    try {
      // Build proper context with ticket info and customer details (but not signature)
      const ticketContext = `
Support ticket: ${ticket.subject}
Customer: ${ticket.customer_name || ticket.customer_email}
Priority: ${ticket.priority || 'Normal'}
Status: ${ticket.status}
Original issue: ${ticket.content || 'No details'}

Recent messages context:
${messages.slice(-3).map(msg => 
  `${msg.sender_name}: ${msg.message_content.substring(0, 200)}...`
).join('\n')}
      `.trim();

      const improvedText = await improveResponse.mutateAsync({
        originalText: newMessage,
        context: ticketContext,
        tone: 'professional'
      });
      
      setNewMessage(improvedText);
      toast({
        title: "Svar forbedret",
        description: "Dit svar er blevet forbedret med AI baseret på ticket context.",
      });
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    await addTicketTag.mutateAsync({
      ticketId: ticket.id,
      tagName: newTag.trim()
    });
    
    setNewTag('');
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTicketTag.mutateAsync(tagId);
  };

  const handleFetchMissingAttachments = async () => {
    setIsFetchingAttachments(true);
    
    try {
      console.log('Fetching missing attachments for ticket:', ticket.id);
      console.log('Calling fetch-missing-attachments edge function...');
      
      const { data, error } = await supabase.functions.invoke('fetch-missing-attachments', {
        body: { ticketId: ticket.id }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data && data.success) {
        console.log('Success:', data.message);
        toast({
          title: "Vedhæftninger hentet",
          description: data.message,
        });
        
        // Refresh messages to show the attachments
        refetch();
        queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
      } else {
        console.error('Data error:', data);
        throw new Error(data?.message || 'Failed to fetch attachments');
      }
    } catch (error: any) {
      console.error('Failed to fetch missing attachments:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        details: error.details
      });
      
      toast({
        title: "Fejl",
        description: error.message || "Kunne ikke hente vedhæftninger. Prøv igen.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingAttachments(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Åben': return 'bg-red-100 text-red-800';
      case 'I gang': return 'bg-yellow-100 text-yellow-800';
      case 'Afventer kunde': return 'bg-blue-100 text-blue-800';
      case 'Løst': return 'bg-green-100 text-green-800';
      case 'Lukket': return 'bg-gray-100 text-gray-800';
      case 'Nyt svar': return 'bg-orange-100 text-orange-800 animate-pulse';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Høj': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Lav': return 'outline';
      default: return 'secondary';
    }
  };

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">Der opstod en fejl ved indlæsning af samtalen.</p>
        <Button onClick={() => window.location.reload()}>
          Genindlæs siden
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Indlæser conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Card className="mb-3">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  {getCustomerInitials(ticket.customer_name, ticket.customer_email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2 mb-1 text-lg">
                  <span>{ticket.ticket_number}</span>
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </CardTitle>
                <h2 className="text-base font-semibold text-gray-900 mb-2">
                  {ticket.subject}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{ticket.customer_name || 'Anonym'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{ticket.customer_email}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDanishDistance(ticket.created_at)}</span>
                  </div>
                  {ticket.assignee_name && (
                    <span className="text-blue-600 font-medium">
                      Tildelt: {ticket.assignee_name}
                    </span>
                  )}
                </div>
                {ticket.sla_deadline && (
                  <div className="text-sm text-gray-600 mt-1">
                    SLA deadline: {formatDanishDateTime(ticket.sla_deadline)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={ticket.priority || ""} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Vælg prioritet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Høj">Høj</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Lav">Lav</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Åben">Åben</SelectItem>
                  <SelectItem value="I gang">I gang</SelectItem>
                  <SelectItem value="Afventer kunde">Afventer kunde</SelectItem>
                  <SelectItem value="Nyt svar">Nyt svar</SelectItem>
                  <SelectItem value="Løst">Løst</SelectItem>
                  <SelectItem value="Lukket">Lukket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Fetch Missing Attachments Section */}
      {ticket.content && ticket.content.toLowerCase().includes('vedhæftet') && (
        <Card className="mb-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Manglende vedhæftninger?</span>
                <span className="text-xs text-gray-500">
                  Hvis du ikke kan se vedhæftninger fra denne email, klik her for at hente dem
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchMissingAttachments}
                disabled={isFetchingAttachments}
              >
                {isFetchingAttachments ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Hent vedhæftninger
              </Button>
            </div>
          </CardContent>
          </Card>
          )}


      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Initial ticket content */}
            {ticket.content && !messages.some(msg => 
              msg.sender_email === ticket.customer_email && 
              msg.message_content.includes(ticket.content?.substring(0, 50) || '')
            ) && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {getCustomerInitials(ticket.customer_name, ticket.customer_email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm">
                        {ticket.customer_name || ticket.customer_email}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDanishDistance(ticket.created_at)} - DANSK TID: {debugTimeConversion(ticket.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {ticket.content}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages with FIXED Danish time display */}
            <DuplicateMessageHandler messages={messages}>
              {(filteredMessages, duplicateCount) => (
                <>
                  {filteredMessages.map((message) => {
                    const isFromSupport = message.sender_email.includes('@mmmultipartner.dk');
                    
                    return (
                      <div key={message.id} className="flex gap-3">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className={
                            message.is_internal 
                              ? "bg-purple-100 text-purple-600" 
                              : isFromSupport
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                          }>
                            {message.sender_name 
                              ? message.sender_name.split(' ').map(n => n[0]).join('').toUpperCase()
                              : message.sender_email.substring(0, 2).toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className={`rounded-lg p-3 ${
                            message.is_internal 
                              ? "bg-purple-50 border border-purple-200" 
                              : isFromSupport
                              ? "bg-green-50 border border-green-200"
                              : "bg-gray-50"
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-sm">
                                {message.sender_name || message.sender_email}
                              </span>
                              {message.is_ai_generated && (
                                <Badge variant="outline" className="text-xs">
                                  <Bot className="h-3 w-3 mr-1" />
                                  AI
                                </Badge>
                              )}
                              {message.is_internal && (
                                <Badge variant="outline" className="text-xs bg-purple-100">
                                  Intern
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatDanishDistance(message.created_at)} - DANSK TID: {debugTimeConversion(message.created_at)}
                              </span>
                            </div>
                            <div 
                              className="text-sm text-gray-700"
                              dangerouslySetInnerHTML={{ 
                                __html: formatMessageWithSignature(message.message_content, isFromSupport)
                              }}
                            />
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3">
                                <AttachmentViewer attachments={message.attachments} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </DuplicateMessageHandler>
          </div>

          <Separator />

          {/* Enhanced Reply System with REVOLUTIONIZED AI */}
          <div className="p-3 border-t">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="compose">Skriv Svar</TabsTrigger>
                <TabsTrigger value="ai-suggestions">
                  <Bot className="h-4 w-4 mr-2" />
                  INTELLIGENT MM AI
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="compose" className="space-y-3">
                <div className="space-y-3">
                  <Input
                    placeholder="CC: emailadresser@gmail.com (komma-separeret)"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Skriv dit professionelle svar..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 min-h-[200px] resize-y"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSendMessage();
                        }
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={handleImproveResponse}
                        disabled={!newMessage.trim() || improveResponse.isPending}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {improveResponse.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                        <span className="ml-1">Forbedre</span>
                      </Button>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className="self-end"
                      >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="ai-suggestions" className="space-y-3">
                <AIResponseSuggestions
                  ticketId={ticket.id}
                  ticketContent={`${ticket.subject}\n\n${ticket.content}`}
                  customerHistory={`Kunde: ${ticket.customer_name || ticket.customer_email}\nStatus: ${ticket.status}\nPrioritet: ${ticket.priority || 'Ikke angivet'}`}
                  onUseSuggestion={handleUseSuggestion}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
