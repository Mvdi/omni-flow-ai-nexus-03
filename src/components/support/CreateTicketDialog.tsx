
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Plus } from 'lucide-react';
import { useAddTicket } from '@/hooks/useTickets';

interface CreateTicketDialogProps {
  children?: React.ReactNode;
}

export const CreateTicketDialog = ({ children }: CreateTicketDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    customer_email: '',
    customer_name: '',
    customer_address: '',
    priority: 'Medium' as 'Høj' | 'Medium' | 'Lav'
  });

  const addTicket = useAddTicket();

  const handleAddressSelect = (addressData: { address: string; latitude: number; longitude: number; bfe_number?: string }) => {
    console.log('Customer address selected for ticket');
    setFormData(prev => ({ ...prev, customer_address: addressData.address }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.customer_email.trim()) {
      return;
    }

    const ticketContent = formData.content + (formData.customer_address ? `\n\nKunde adresse: ${formData.customer_address}` : '');

    addTicket.mutate({
      subject: formData.subject,
      content: ticketContent || null,
      customer_email: formData.customer_email,
      customer_name: formData.customer_name || null,
      priority: formData.priority,
      status: 'Åben',
      assignee_id: null
    }, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          subject: '',
          content: '',
          customer_email: '',
          customer_name: '',
          customer_address: '',
          priority: 'Medium'
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Ny Ticket
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Opret Ny Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Kundens Navn</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Fx. Jens Hansen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Kundens Email *</Label>
              <Input
                id="customer_email"
                type="email"
                required
                value={formData.customer_email}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                placeholder="kunde@example.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Emne *</Label>
            <Input
              id="subject"
              required
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Beskriv problemet kort"
            />
          </div>

          <div className="space-y-2">
            <AddressAutocomplete
              label="Kunde Adresse (valgfrit)"
              value={formData.customer_address}
              onChange={(value) => setFormData(prev => ({ ...prev, customer_address: value }))}
              onAddressSelect={handleAddressSelect}
              placeholder="Vælg kundens adresse"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioritet</Label>
            <Select value={formData.priority} onValueChange={(value: 'Høj' | 'Medium' | 'Lav') => setFormData(prev => ({ ...prev, priority: value }))}>
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

          <div className="space-y-2">
            <Label htmlFor="content">Beskrivelse</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Detaljeret beskrivelse af problemet..."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuller
            </Button>
            <Button 
              type="submit" 
              disabled={addTicket.isPending || !formData.subject.trim() || !formData.customer_email.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {addTicket.isPending ? 'Opretter...' : 'Opret Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
