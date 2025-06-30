
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from 'react';
import { SupportTicket, useUpdateTicket } from '@/hooks/useTickets';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { useOffice365EmailSender } from '@/hooks/useOffice365EmailSender';
import { AttachmentViewer } from './AttachmentViewer';
import { formatDanishDistance } from '@/utils/danishTime';
import { Send, Bot, User, Clock, Mail, Tag, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface TicketConversationProps {
  ticket: SupportTicket;
}

// Funktion til at formatere beskeder MED signatur korrekt
const formatMessageWithSignature = (content: string, isFromSupport: boolean) => {
  if (!isFromSupport) {
    return content.replace(/\n/g, '<br>');
  }

  // For support beskeder: tjek om der er en signatur
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
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: messages = [], isLoading, error, isError, refetch } = useTicketMessages(ticket.id);
  const updateTicket = useUpdateTicket();
  const { sendEmail, isSending } = useOffice365EmailSender();

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
    updateTicket.mutate({ 
      id: ticket.id, 
      updates: { priority: newPriority as any } 
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      console.log('Sending email via Office 365...');
      
      await sendEmail({
        ticket_id: ticket.id,
        message_content: newMessage,
        sender_name: 'Support Team'
      });
      
      console.log('Email sent successfully via Office 365');
      setNewMessage('');
      
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

  const generateAiResponse = async () => {
    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-ticket-response', {
        body: {
          ticketContent: `${ticket.subject}\n\n${ticket.content}`,
          customerHistory: `Kunde: ${ticket.customer_name || ticket.customer_email}\nPrioritet: ${ticket.priority}\nStatus: ${ticket.status}`,
          priority: ticket.priority
        }
      });

      if (error) throw error;

      if (data.success) {
        setAiSuggestion(data.response);
        toast({
          title: "AI forslag genereret",
          description: "Et forslag til svar er nu tilgængeligt.",
        });
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke generere AI forslag. Prøv igen.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const useAiSuggestion = () => {
    setNewMessage(aiSuggestion);
    setAiSuggestion('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Åben': return 'bg-red-100 text-red-800';
      case 'I gang': return 'bg-yellow-100 text-yellow-800';
      case 'Afventer kunde': return 'bg-blue-100 text-blue-800';
      case 'Løst': return 'bg-green-100 text-green-800';
      case 'Lukket': return 'bg-gray-100 text-gray-800';
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

  // Show error state if there's an error
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

  // Show loading state
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
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Høj">Høj</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Lav">Lav</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Åben">Åben</SelectItem>
                  <SelectItem value="I gang">I gang</SelectItem>
                  <SelectItem value="Afventer kunde">Afventer kunde</SelectItem>
                  <SelectItem value="Løst">Løst</SelectItem>
                  <SelectItem value="Lukket">Lukket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Initial ticket content - only show if not duplicated in messages */}
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
                        {formatDanishDistance(ticket.created_at)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {ticket.content}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages - NU MED KORREKT DANSK TID */}
            {messages.map((message) => {
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
                          {formatDanishDistance(message.created_at)}
                        </span>
                      </div>
                      <div 
                        className="text-sm text-gray-700"
                        dangerouslySetInnerHTML={{ 
                          __html: formatMessageWithSignature(message.message_content, isFromSupport)
                        }}
                      />
                      {/* Add AttachmentViewer for message attachments */}
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
          </div>

          <Separator />

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="p-3 bg-blue-50 border-t border-blue-200">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-2">AI Foreslår:</p>
                  <div 
                    className="text-sm text-blue-800 mb-3 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: aiSuggestion.replace(/\n/g, '<br>') }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={useAiSuggestion}>
                      Brug forslag
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAiSuggestion('')}>
                      Afvis
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reply Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2 mb-3">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={generateAiResponse}
                disabled={isGeneratingAI}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGeneratingAI ? 'Genererer...' : 'AI Forslag'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Skriv dit svar..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 min-h-[200px] resize-y"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className="self-end"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
