import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCreateOrUpdateLead, useLeadSupportTickets } from '@/hooks/useLeads';
import { Plus, Edit, Upload, FileText, MessageSquare, Calendar, Phone, Mail, MapPin, Building, DollarSign } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import { TicketPopup } from './TicketPopup';
import type { SupportTicket } from '@/hooks/useTickets';

interface LeadDialogProps {
  lead?: Lead;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const LeadDialog = ({ lead, trigger, open, onOpenChange }: LeadDialogProps) => {
  const [isOpen, setIsOpen] = useState(open || false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketPopupOpen, setTicketPopupOpen] = useState(false);
  const [formData, setFormData] = useState({
    navn: '',
    telefon: '',
    email: '',
    adresse: '',
    postnummer: '',
    by: '',
    virksomhed: '',
    vaerdi: '',
    prioritet: 'Medium' as string,
    status: 'new' as string,
    noter: '',
    uploads: [] as any[]
  });

  const createOrUpdateLead = useCreateOrUpdateLead();
  const supportEmail = lead?.email || formData.email;
  const { data: supportTickets = [], isLoading: ticketsLoading } = useLeadSupportTickets(supportEmail);

  useEffect(() => {
    if (lead) {
      setFormData({
        navn: lead.navn || '',
        telefon: lead.telefon || '',
        email: lead.email || '',
        adresse: lead.adresse || '',
        postnummer: lead.postnummer || '',
        by: lead.by || '',
        virksomhed: lead.virksomhed || '',
        vaerdi: lead.vaerdi?.toString() || '',
        prioritet: lead.prioritet || 'Medium',
        status: lead.status || 'new',
        noter: lead.noter || '',
        uploads: (lead.uploads as any[]) || []
      });
    }
  }, [lead]);

  useEffect(() => {
    setIsOpen(open || false);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const leadData = {
      ...(lead?.id && { id: lead.id }),
      ...formData,
      vaerdi: formData.vaerdi ? parseInt(formData.vaerdi) : null
    };

    await createOrUpdateLead.mutateAsync(leadData);
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newUploads = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    }));
    
    setFormData(prev => ({
      ...prev,
      uploads: [...prev.uploads, ...newUploads]
    }));
  };

  const removeUpload = (index: number) => {
    setFormData(prev => ({
      ...prev,
      uploads: prev.uploads.filter((_, i) => i !== index)
    }));
  };

  const handleTicketClick = (ticket: any) => {
    // Cast the ticket to the correct type, ensuring priority and status are correct
    const typedTicket: SupportTicket = {
      ...ticket,
      priority: ticket.priority as 'Høj' | 'Medium' | 'Lav',
      status: ticket.status as 'Åben' | 'I gang' | 'Afventer kunde' | 'Løst' | 'Lukket'
    };
    setSelectedTicket(typedTicket);
    setTicketPopupOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      onOpenChange?.(open);
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={lead ? "outline" : "default"}>
            {lead ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {lead ? 'Rediger Lead' : 'Nyt Lead'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Rediger Lead' : 'Opret Nyt Lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Opdater lead-information' : 'Tilføj et nyt lead til CRM-systemet'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grundlæggende Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Grundlæggende Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="navn">Navn *</Label>
                <Input
                  id="navn"
                  value={formData.navn}
                  onChange={(e) => setFormData(prev => ({ ...prev, navn: e.target.value }))}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefon">Telefon</Label>
                <Input
                  id="telefon"
                  value={formData.telefon}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="virksomhed">Virksomhed</Label>
                <Input
                  id="virksomhed"
                  value={formData.virksomhed}
                  onChange={(e) => setFormData(prev => ({ ...prev, virksomhed: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postnummer">Postnummer</Label>
                <Input
                  id="postnummer"
                  value={formData.postnummer}
                  onChange={(e) => setFormData(prev => ({ ...prev, postnummer: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="by">By</Label>
                <Input
                  id="by"
                  value={formData.by}
                  onChange={(e) => setFormData(prev => ({ ...prev, by: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vaerdi">Værdi (kr)</Label>
                <Input
                  id="vaerdi"
                  type="number"
                  value={formData.vaerdi}
                  onChange={(e) => setFormData(prev => ({ ...prev, vaerdi: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status og Prioriteter */}
          <Card>
            <CardHeader>
              <CardTitle>Status og Prioriteter</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nye Leads</SelectItem>
                    <SelectItem value="contacted">Kontaktet</SelectItem>
                    <SelectItem value="qualified">Kvalificeret</SelectItem>
                    <SelectItem value="proposal">Tilbud Sendt</SelectItem>
                    <SelectItem value="negotiation">Forhandling</SelectItem>
                    <SelectItem value="closed-won">Lukket - Vundet</SelectItem>
                    <SelectItem value="closed-lost">Lukket - Tabt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioritet">Prioritet</Label>
                <Select value={formData.prioritet} onValueChange={(value: any) => setFormData(prev => ({ ...prev, prioritet: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lav">Lav</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Høj">Høj</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Noter */}
          <Card>
            <CardHeader>
              <CardTitle>Noter</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Tilføj noter om leadet..."
                value={formData.noter}
                onChange={(e) => setFormData(prev => ({ ...prev, noter: e.target.value }))}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Filer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="flex-1"
                />
              </div>
              
              {formData.uploads.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploadede filer:</Label>
                  {formData.uploads.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(index)}
                      >
                        Slet
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support Tickets - Flyttet højere op og forbedret */}
          {lead && supportEmail && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Support Tickets
                  {ticketsLoading && <span className="text-sm text-gray-500">(Indlæser...)</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Indlæser support tickets...</p>
                  </div>
                ) : supportTickets.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        {supportTickets.length} aktiv{supportTickets.length !== 1 ? 'e' : ''} ticket{supportTickets.length !== 1 ? 's' : ''}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {supportEmail}
                      </Badge>
                    </div>
                    {supportTickets.slice(0, 5).map((ticket) => (
                      <div 
                        key={ticket.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{ticket.subject}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-gray-600">#{ticket.ticket_number}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(ticket.created_at).toLocaleDateString('da-DK')}
                            </p>
                            <p className="text-xs text-gray-600">
                              Status: {ticket.status === 'open' ? 'Åben' : ticket.status === 'in_progress' ? 'I gang' : 'Lukket'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={ticket.priority === 'Høj' ? 'destructive' : ticket.priority === 'Medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {supportTickets.length > 5 && (
                      <div className="text-center py-2">
                        <p className="text-sm text-gray-600">
                          +{supportTickets.length - 5} flere tickets
                        </p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Se alle tickets
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Ingen aktive support tickets for denne kunde</p>
                    <p className="text-xs mt-1">Email: {supportEmail}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                onOpenChange?.(false);
              }}
            >
              Annuller
            </Button>
            <Button
              type="submit"
              disabled={createOrUpdateLead.isPending}
            >
              {createOrUpdateLead.isPending ? 'Gemmer...' : (lead ? 'Opdater' : 'Opret')}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Ticket Popup */}
      {selectedTicket && (
        <TicketPopup
          ticket={selectedTicket}
          open={ticketPopupOpen}
          onOpenChange={setTicketPopupOpen}
        />
      )}
    </Dialog>
  );
};
