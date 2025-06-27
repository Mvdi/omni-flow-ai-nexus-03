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
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { Send, Bot, User, Clock, Mail, Tag, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface TicketConversationProps {
  ticket: SupportTicket;
}

// Helper function to convert HTML signature to plain text
const convertSignatureToPlainText = (htmlSignature: string): string => {
  // Remove all HTML tags and base64 image data
  let plainText = htmlSignature
    .replace(/<img[^>]*>/gi, '') // Remove all img tags
    .replace(/data:image\/[^;]+;base64,[^"]+/gi, '') // Remove base64 data
    .replace(/<br\s*\/?>/gi, '\n') // Convert br tags to newlines
    .replace(/<div[^>]*>/gi, '\n') // Convert divs to newlines
    .replace(/<\/div>/gi, '') // Remove closing divs
    .replace(/<[^>]+>/gi, '') // Remove all other HTML tags
    .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
    .trim();

  // Decode HTML entities
  plainText = plainText
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"');

  return plainText;
};

// Helper function to format text for display (convert markdown-like formatting to HTML)
const formatTextForDisplay = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
    .replace(/\n/g, '<br>'); // Preserve newlines
};

export const TicketConversation = ({ ticket }: TicketConversationProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState('');
  const [signaturePlainText, setSignaturePlainText] = useState('');
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
            // Konverter til ren tekst til forhåndsvisning
            const plainTextSignature = convertSignatureToPlainText(userSignature.html);
            setSignaturePlainText(plainTextSignature);
            console.log('Loaded and converted signature to plain text');
          }
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      }
      
      // Fallback to localStorage
      if (!signatureHtml) {
        const savedSignatureHtml = localStorage.getItem('signature-html');
        if (savedSignatureHtml) {
          setSignatureHtml(savedSignatureHtml);
          const plainTextSignature = convertSignatureToPlainText(savedSignatureHtml);
          setSignaturePlainText(plainTextSignature);
          console.log('Loaded signature HTML from localStorage and converted to plain text');
        }
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

  // ... keep existing code (getStatusColor, getCustomerInitials, getPriorityColor functions)
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
                        {formatDistanceToNow(new Date(ticket.created_at), { 
                          addSuffix: true, 
                          locale: da 
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">
                      {ticket.content}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Additional messages */}
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className={
                    message.is_internal 
                      ? "bg-purple-100 text-purple-600" 
                      : message.sender_email.includes('@mmmultipartner.dk')
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
                      : message.sender_email.includes('@mmmultipartner.dk')
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
                        {formatDistanceToNow(new Date(message.created_at), { 
                          addSuffix: true, 
                          locale: da 
                        })}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-gray-700 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: formatTextForDisplay(message.message_content) }}
                    />
                  </div>
                </div>
              </div>
            ))}
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
                    dangerouslySetInnerHTML={{ __html: formatTextForDisplay(aiSuggestion) }}
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
            {signaturePlainText && (
              <div className="mt-3 p-3 bg-gray-50 rounded border">
                <p className="text-xs text-gray-600 mb-2">Forhåndsvisning af emailen som den vil blive sendt:</p>
                <div className="border rounded bg-white p-3 font-mono text-sm">
                  <div className="mb-3">
                    {newMessage || 'Din besked her...'}
                  </div>
                  <div className="pt-2 border-t border-gray-200 text-gray-600">
                    {signaturePlainText}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
