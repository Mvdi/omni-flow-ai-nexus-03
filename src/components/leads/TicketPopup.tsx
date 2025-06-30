import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportTicket, TicketMessage, useUpdateTicket, useAddTicketMessage } from '@/hooks/useTickets';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { Send, Bot, User, Clock, Mail, Tag, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TicketPopupProps {
  ticket: SupportTicket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to format text for display (convert markdown-like formatting to HTML)
const formatTextForDisplay = (text: string) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
    .replace(/\n/g, '<br>'); // Preserve newlines
};

export const TicketPopup = ({ ticket, open, onOpenChange }: TicketPopupProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState('');
  const { toast } = useToast();
  
  const { data: messages = [], isLoading } = useTicketMessages(ticket.id);
  const updateTicket = useUpdateTicket();
  const addMessage = useAddTicketMessage();

  // Load signature on component mount
  useEffect(() => {
    const savedSignatureHtml = localStorage.getItem('signature-html');
    if (savedSignatureHtml) {
      setSignatureHtml(savedSignatureHtml);
    } else {
      const savedSignature = localStorage.getItem('support-signature');
      if (savedSignature) {
        setSignatureHtml(savedSignature.replace(/\n/g, '<br>'));
      }
    }
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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    let messageWithSignature = newMessage;
    
    // Always add signature if it exists
    if (signatureHtml) {
      messageWithSignature = `${newMessage}\n\n${signatureHtml}`;
    }
    
    addMessage.mutate({
      ticket_id: ticket.id,
      sender_email: 'support@company.com',
      sender_name: 'Support Team',
      message_content: messageWithSignature,
      is_internal: false,
      is_ai_generated: false,
      attachments: []
    });
    
    setNewMessage('');
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

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 text-center">Indlæser conversation...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span>Support Ticket #{ticket.ticket_number}</span>
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status}
              </Badge>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ticket Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                      {getCustomerInitials(ticket.customer_name, ticket.customer_email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
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
                        <span>
                          {formatDistanceToNow(new Date(ticket.created_at), { 
                            addSuffix: true, 
                            locale: da 
                          })}
                        </span>
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
                      <SelectItem value="Lav">Lav</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Høj">Høj</SelectItem>
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
                      <SelectItem value="Løst">Løst</SelectItem>
                      <SelectItem value="Lukket">Lukket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Fjernet ticket.content herfra */}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Første besked fra kunden - nu som boble */}
              {ticket.content && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
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
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: da })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {ticket.content}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Resten af beskederne */}
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.is_internal ? 'opacity-75' : ''}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={`text-xs ${message.is_internal ? 'bg-gray-500' : 'bg-blue-500'}`}>
                      {message.is_internal ? 'I' : 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {message.sender_name}
                        {message.is_internal && <span className="text-gray-500"> (Intern)</span>}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: da })}
                      </span>
                      {message.is_ai_generated && (
                        <Badge variant="outline" className="text-xs">
                          <Bot className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: formatTextForDisplay(message.message_content) 
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reply Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Svar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiSuggestion && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm text-blue-800">AI Forslag</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3 whitespace-pre-wrap">{aiSuggestion}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={useAiSuggestion}>
                      Brug forslag
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAiSuggestion('')}>
                      Afvis
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={generateAiResponse}
                  disabled={isGeneratingAI}
                  variant="outline"
                  size="sm"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  {isGeneratingAI ? 'Genererer...' : 'AI Forslag'}
                </Button>
              </div>
              
              <div className="space-y-2">
                <Textarea
                  placeholder="Skriv dit svar..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Send svar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
