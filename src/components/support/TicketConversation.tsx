
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useState } from 'react';
import { SupportTicket, TicketMessage, useTicketMessages, useUpdateTicket, useAddTicketMessage } from '@/hooks/useTickets';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';
import { Send, Bot, User, Clock, Mail, Tag } from 'lucide-react';

interface TicketConversationProps {
  ticket: SupportTicket;
}

export const TicketConversation = ({ ticket }: TicketConversationProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  
  const { data: messages = [], isLoading } = useTicketMessages(ticket.id);
  const updateTicket = useUpdateTicket();
  const addMessage = useAddTicketMessage();

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
    
    addMessage.mutate({
      ticket_id: ticket.id,
      sender_email: 'support@company.com',
      sender_name: 'Support Team',
      message_content: newMessage,
      is_internal: false,
      is_ai_generated: false,
      attachments: []
    });
    
    setNewMessage('');
  };

  const generateAiResponse = () => {
    // Simulated AI response - in production this would call an AI service
    const suggestions = [
      "Tak for din henvendelse. Jeg kan hjælpe dig med dette problem. Kan du prøve at køre programmet som administrator?",
      "Det lyder som et almindeligt installationsproblem. Prøv venligst at følge disse trin: 1) Højreklik på installationsfilen 2) Vælg 'Kør som administrator'",
      "Denne fejl opstår ofte på grund af manglende rettigheder. Jeg anbefaler at kontakte din IT-administrator for at få de nødvendige rettigheder."
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    setAiSuggestion(randomSuggestion);
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

  if (isLoading) {
    return <div className="p-8 text-center">Indlæser conversation...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Card className="mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  {getCustomerInitials(ticket.customer_name, ticket.customer_email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2 mb-1">
                  <span>{ticket.ticket_number}</span>
                  <Badge className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </CardTitle>
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
            
            <div className="flex items-center gap-2">
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
                <SelectTrigger className="w-36">
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Initial ticket content */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {getCustomerInitials(ticket.customer_name, ticket.customer_email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-4">
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
                  <p className="text-sm text-gray-700">
                    {ticket.content}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional messages */}
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className={
                    message.is_internal 
                      ? "bg-purple-100 text-purple-600" 
                      : message.sender_email.includes('@company.com')
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
                  <div className={`rounded-lg p-4 ${
                    message.is_internal 
                      ? "bg-purple-50 border border-purple-200" 
                      : message.sender_email.includes('@company.com')
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
                    <p className="text-sm text-gray-700">
                      {message.message_content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="p-4 bg-blue-50 border-t border-blue-200">
              <div className="flex items-start gap-2 mb-3">
                <Bot className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-2">AI Foreslår:</p>
                  <p className="text-sm text-blue-800 mb-3">{aiSuggestion}</p>
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
          <div className="p-4 border-t">
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={generateAiResponse}>
                <Bot className="h-4 w-4 mr-2" />
                AI Forslag
              </Button>
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Skriv dit svar..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || addMessage.isPending}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
