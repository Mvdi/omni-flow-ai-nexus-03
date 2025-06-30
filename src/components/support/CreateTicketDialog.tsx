import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAddTicket } from '@/hooks/useTickets';

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTicketDialog = ({ isOpen, onClose }: CreateTicketDialogProps) => {
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    customer_email: '',
    customer_name: '',
    priority: '' as string, // Changed from 'Medium' to empty string - no default priority
    status: 'Åben' as string,
    assignee_id: ''
  });

  const addTicket = useAddTicket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ticketData = {
      subject: formData.subject,
      content: formData.content || null,
      customer_email: formData.customer_email,
      customer_name: formData.customer_name || null,
      priority: (formData.priority || null) as 'Høj' | 'Medium' | 'Lav' | null, // Only include if set
      status: formData.status as 'Åben' | 'I gang' | 'Afventer kunde' | 'Løst' | 'Lukket',
      assignee_id: formData.assignee_id || null
    };

    await addTicket.mutateAsync(ticketData);
    
    // Reset form
    setFormData({
      subject: '',
      content: '',
      customer_email: '',
      customer_name: '',
      priority: '', // Reset to empty - no default
      status: 'Åben',
      assignee_id: ''
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Opret Ny Support Ticket</DialogTitle>
          <DialogDescription>
            Opret en ny support ticket for en kunde
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="subject">Emne *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Beskrivelse</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_email">Kunde Email *</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="customer_name">Kunde Navn</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Prioritet</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg prioritet (valgfri)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ingen prioritet</SelectItem>
                  <SelectItem value="Lav">Lav</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Høj">Høj</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
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

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuller
            </Button>
            <Button type="submit" disabled={addTicket.isPending}>
              Opret Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
