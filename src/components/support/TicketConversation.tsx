import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Bot, User, Mail, Phone, Building, Tag, Clock, Star, Send } from 'lucide-react';
import { useTickets, useTicketMessages, useAddTicketMessage, useUpdateTicket } from '@/hooks/useTickets';
import { useCustomers } from '@/hooks/useCustomers';
import { useToast } from '@/hooks/use-toast';
import { useSendEmail } from '@/hooks/useSendEmail';

const formatText = (text: string | null): string => {
  if (!text) return '';
  // Basic formatting: replace newlines with <br /> tags
  return text.replace(/\n/g, '<br />');
};

const formatMessage = (text: string): string => {
  // Basic formatting: replace newlines with <br /> tags
  return text.replace(/\n/g, '<br />');
};

export const TicketConversation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [signature, setSignature] = useState('');

  const { data: tickets } = useTickets();
  const { data: messages, isLoading: messagesLoading } = useTicketMessages(id || '');
  const { data: customers } = useCustomers();
  const addMessage = useAddTicketMessage();
  const updateTicket = useUpdateTicket();
  const { sendEmail, status: emailStatus } = useSendEmail();

  const ticket = tickets?.find(t => t.id === id);
  const customer = customers?.find(c => c.email === ticket?.customer_email);

  useEffect(() => {
    const storedSignature = localStorage.getItem('signature');
    if (storedSignature) {
      setSignature(storedSignature);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return;

    const messageWithSignature = `${newMessage}\n\n${signature}`;
    
    try {
      // Add message to ticket
      await addMessage.mutateAsync({
        ticket_id: ticket.id,
        sender_email: 'support@company.com', // This should be the logged in user's email
        sender_name: 'Support Team',
        message_content: messageWithSignature,
        is_internal: false,
        is_ai_generated: false,
        attachments: [],
      });

      // Send email to customer
      const emailSent = await sendEmail(
        ticket.customer_email,
        `Re: ${ticket.subject}`,
        formatMessage(messageWithSignature),
        ticket.id
      );

      if (emailSent) {
        // Update ticket status if it was resolved
        if (ticket.status === 'Åben') {
          await updateTicket.mutateAsync({
            id: ticket.id,
            updates: { status: 'I gang' }
          });
        }

        toast({
          title: "Besked sendt",
          description: "Besked er sendt til kunden via email.",
        });
      } else {
        toast({
          title: "Besked gemt",
          description: "Besked er gemt i ticketen, men email kunne ikke sendes.",
          variant: "destructive",
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke sende besked.",
        variant: "destructive",
      });
    }
  };

  const handleAiSuggestion = () => {
    toast({
      title: "AI Forslag",
      description: "Denne funktion er ikke implementeret endnu.",
    });
  };

  if (!id) {
    return <div>Ticket ID er påkrævet.</div>;
  }

  if (!ticket) {
    return <div>Ticket ikke fundet.</div>;
  }

  if (messagesLoading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/support')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbage til Support
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Customer Information Panel */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Kunde Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>{customer?.navn?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{customer?.navn}</h3>
                    <p className="text-sm text-gray-500">{customer?.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Kontakt Info</div>
                  <div className="text-sm text-gray-600">
                    {customer?.telefon && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {customer.telefon}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {customer?.email}
                    </p>
                    {customer?.virksomhedsnavn && (
                      <p className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {customer.virksomhedsnavn}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Adresse</div>
                  <div className="text-sm text-gray-600">
                    <p>{customer?.adresse}</p>
                    <p>
                      {customer?.postnummer} {customer?.by}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Kundetype</div>
                  <div className="text-sm text-gray-600">
                    {customer?.kundetype || 'Ikke angivet'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Score</div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    {customer?.score || 0}
                  </div>
                </div>
                {customer?.noter && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Noter</div>
                    <div className="text-sm text-gray-600">{customer.noter}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Conversation Panel */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{ticket.subject}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Badge variant={ticket.priority === 'Høj' ? 'destructive' : ticket.priority === 'Medium' ? 'default' : 'secondary'}>
                        {ticket.priority}
                      </Badge>
                      <Badge variant={ticket.status === 'Åben' ? 'destructive' : ticket.status === 'I gang' ? 'default' : 'secondary'}>
                        {ticket.status}
                      </Badge>
                      <span>#{ticket.ticket_number}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Messages */}
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {messages?.map((message) => (
                    <div key={message.id} className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <div className="font-semibold">{message.sender_name || message.sender_email}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="prose prose-sm w-full">
                        <p dangerouslySetInnerHTML={{ __html: formatText(message.message_content) }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Section */}
                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Skriv dit svar her..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[200px] resize-none"
                    />
                    
                    {signature && (
                      <div className="text-xs text-gray-500 border-t pt-2">
                        <div dangerouslySetInnerHTML={{ __html: signature }} />
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <Button 
                        variant="outline" 
                        onClick={handleAiSuggestion}
                        disabled={!newMessage.trim()}
                        className="flex items-center gap-2"
                      >
                        <Bot className="h-4 w-4" />
                        AI Forslag
                      </Button>
                      
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || emailStatus === 'sending'}
                        className="flex items-center gap-2"
                      >
                        {emailStatus === 'sending' ? (
                          <>Sender...</>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Email
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Panel */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Ticket Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Oprettet</div>
                  <div className="text-sm text-gray-600">
                    {new Date(ticket.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Sidst Opdateret</div>
                  <div className="text-sm text-gray-600">
                    {new Date(ticket.updated_at).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Assignee</div>
                  <div className="text-sm text-gray-600">
                    {ticket.assignee_id || 'Ingen'}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Response Time</div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {ticket.response_time_hours || 0} timer
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
