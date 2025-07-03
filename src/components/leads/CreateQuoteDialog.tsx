import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateQuote } from '@/hooks/useQuotes';
import { FileText, Plus } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface CreateQuoteDialogProps {
  lead: Lead;
  children?: React.ReactNode;
}

export const CreateQuoteDialog = ({ lead, children }: CreateQuoteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  
  const createQuote = useCreateQuote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createQuote.mutateAsync({
        lead_id: lead.id,
        customer_email: lead.email,
        customer_name: lead.navn,
        title: title || `Tilbud til ${lead.navn}`,
        description,
        items: [],
        total_amount: parseFloat(totalAmount) || 0,
        currency: 'DKK',
        status: 'draft',
        valid_until: null,
        template_used: null,
        notes: null,
      });
      
      setOpen(false);
      setTitle('');
      setDescription('');
      setTotalAmount('');
    } catch (error) {
      console.error('Failed to create quote:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div onClick={(e) => e.stopPropagation()}>
          {children || (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Lav Tilbud
            </Button>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Opret Tilbud
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer">Kunde</Label>
            <Input 
              id="customer" 
              value={`${lead.navn} (${lead.email})`} 
              disabled 
              className="bg-gray-50"
            />
          </div>
          
          <div>
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Tilbud til ${lead.navn}`}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tilbudsbeskrivelse..."
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="amount">Beløb (DKK)</Label>
            <Input
              id="amount"
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuller
            </Button>
            <Button type="submit" disabled={createQuote.isPending}>
              {createQuote.isPending ? 'Opretter...' : 'Opret Tilbud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};