
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerSearch, Customer } from "@/components/ui/customer-search";
import { useAddTicket } from '@/hooks/useTickets';
import { Plus, UserCheck } from 'lucide-react';

export interface CreateTicketDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const CreateTicketDialog = ({ isOpen, onClose }: CreateTicketDialogProps) => {
  const [open, setOpen] = useState(isOpen || false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    customer_email: '',
    customer_name: '',
    priority: '' as '' | 'Høj' | 'Medium' | 'Lav'
  });

  const addTicket = useAddTicket();

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer_email: customer.email,
      customer_name: customer.navn || ''
    }));
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      customer_email: '',
      customer_name: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ticketData = {
      ...formData,
      priority: formData.priority || null,
      status: 'Åben' as const,
      assignee_id: null
    };

    await addTicket.mutateAsync(ticketData);
    
    // Reset form
    setFormData({
      subject: '',
      content: '',
      customer_email: '',
      customer_name: '',
      priority: ''
    });
    setSelectedCustomer(null);
    
    setOpen(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) onClose?.();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nyt Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Opret Support Ticket</DialogTitle>
          <DialogDescription>
            Opret et nyt support ticket for en kunde
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Search Section */}
          <div className="space-y-4">
            {selectedCustomer ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">
                        {selectedCustomer.navn || 'Ingen navn'}
                      </p>
                      <p className="text-sm text-green-700">{selectedCustomer.email}</p>
                      {selectedCustomer.telefon && (
                        <p className="text-sm text-green-700">{selectedCustomer.telefon}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSelectedCustomer}
                  >
                    Skift kunde
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <CustomerSearch
                  onCustomerSelect={handleCustomerSelect}
                  placeholder="Søg efter eksisterende kunde eller indtast ny..."
                  label="Søg kunde"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Kunde navn</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="Indtast kunde navn"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email *</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                      placeholder="kunde@email.dk"
                      required
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Emne *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Beskriv problemet kort"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioritet</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as '' | 'Høj' | 'Medium' | 'Lav' }))}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg prioritet (valgfri)" />
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
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                onClose?.();
              }}
            >
              Annuller
            </Button>
            <Button
              type="submit"
              disabled={addTicket.isPending}
            >
              {addTicket.isPending ? 'Opretter...' : 'Opret Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
