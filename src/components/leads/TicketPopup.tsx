
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportTicket, TicketMessage, useUpdateTicket, useAddTicketMessage } from '@/hooks/useTickets';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { formatDanishDistance, formatDanishDateTime } from '@/utils/danishTime';
import { Send, Bot, User, Clock, Mail, Sparkles, X, Paperclip, Bell, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AttachmentViewer } from '../support/AttachmentViewer';
import DOMPurify from 'dompurify';

interface TicketPopupProps {
  ticket: SupportTicket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// SECURE: Sanitize HTML content to prevent XSS while allowing formatting
const createSafeHtml = (text: string) => {
  // First, clean the HTML with DOMPurify to remove any malicious content
  const cleanHtml = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'div', 'span', 'img', 'a', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['style', 'src', 'alt', 'href', 'target', 'class', 'width', 'height'],
    ALLOW_DATA_ATTR: false
  });
  
  return { __html: cleanHtml };
};

export const TicketPopup = ({ ticket, open, onOpenChange }: TicketPopupProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [signatureHtml, setSignatureHtml] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const { data: messages = [], isLoading } = useTicketMessages(ticket.id);
  const updateTicket = useUpdateTicket();
  const addMessage = useAddTicketMessage();

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const validFiles = fileArray.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Fil for stor",
            description: `${file.name} er større end 10MB og bliver sprunget over.`,
            variant: "destructive",
          });
          return false;
        }
        return true;
      });
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (): Promise<any[]> => {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    const uploadedAttachments = [];

    try {
      for (const file of selectedFiles) {
        const timestamp = new Date().getTime();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `attachments/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          console.error(`Failed to upload ${file.name}:`, uploadError);
          toast({
            title: "Upload fejl",
            description: `Kunne ikke uploade ${file.name}`,
            variant: "destructive",
          });
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath);

        uploadedAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          contentType: file.type,
          url: publicUrl,
          path: filePath,
          uploaded_at: new Date().toISOString()
        });
      }

      return uploadedAttachments;
    } catch (error) {
      console.error('Error uploading attachments:', error);
      toast({
        title: "Upload fejl",
        description: "Der opstod en fejl under upload af vedhæftninger.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0) return;
    
    let messageWithSignature = newMessage;
    
    if (signatureHtml && newMessage.trim()) {
      messageWithSignature = `${newMessage}\n\n${signatureHtml}`;
    }

    const attachments = await uploadAttachments();
    
    addMessage.mutate({
      ticket_id: ticket.id,
      sender_email: 'support@company.com',
      sender_name: 'Support Team',
      message_content: messageWithSignature,
      is_internal: false,
      is_ai_generated: false,
      attachments: attachments
    });
    
    setNewMessage('');
    setSelectedFiles([]);
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
      case 'Nyt svar': return 'bg-orange-100 text-orange-800 animate-pulse';
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

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'Høj': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Lav': return 'outline';
      default: return 'secondary';
    }
  };

  const getSLAStatus = () => {
    if (!ticket.sla_deadline) return null;
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'expired';
    if (hoursLeft < 2) return 'critical';
    if (hoursLeft < 4) return 'warning';
    return 'good';
  };

  const slaStatus = getSLAStatus();

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
              {ticket.status === 'Nyt svar' && (
                <Bell className="h-5 w-5 text-orange-600 animate-bounce" />
              )}
              <span>Support Ticket #{ticket.ticket_number}</span>
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status}
              </Badge>
              {ticket.category && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  {ticket.category}
                </Badge>
              )}
              {slaStatus === 'expired' && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  SLA BRUDT
                </Badge>
              )}
              {slaStatus === 'critical' && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  KRITISK
                </Badge>
              )}
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
          {/* Enhanced Ticket Header */}
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
                        <span>{formatDanishDistance(ticket.created_at)}</span>
                      </div>
                      {ticket.assignee_name && (
                        <span className="text-blue-600 font-medium">
                          Tildelt: {ticket.assignee_name}
                        </span>
                      )}
                    </div>
                    {ticket.sla_deadline && (
                      <div className={`text-sm mt-1 font-medium ${
                        slaStatus === 'expired' ? 'text-red-600' :
                        slaStatus === 'critical' ? 'text-red-500' :
                        slaStatus === 'warning' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        SLA deadline: {formatDanishDateTime(ticket.sla_deadline)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {ticket.priority && (
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
                  )}
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
              {/* Removed ticket.content display here */}
            </CardContent>
          </Card>

          {/* Messages with Danish time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversation (Dansk tid)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          {formatDanishDistance(ticket.created_at)}
                        </span>
                      </div>
                      <div 
                        className="text-sm text-gray-700"
                        dangerouslySetInnerHTML={createSafeHtml(ticket.content)}
                      />
                    </div>
                  </div>
                </div>
              )}
              
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
                        {formatDanishDistance(message.created_at)}
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
                      dangerouslySetInnerHTML={createSafeHtml(message.message_content)}
                    />
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-3">
                        <AttachmentViewer attachments={message.attachments} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Enhanced Reply Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Svar
                {ticket.status === 'Nyt svar' && (
                  <Badge className="bg-orange-500 text-white">
                    Nyt kundesvar - Kræver handling
                  </Badge>
                )}
              </CardTitle>
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
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="*/*"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Vedhæft filer
                    </Button>
                  </div>
                  
                  {selectedFiles.length > 0 && (
                    <div className="space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploader...' : 'Send svar'}
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
