import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreateQuote, useQuoteTemplates } from '@/hooks/useQuotes';
import { FileText, Plus, Calendar, DollarSign } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';

interface CreateQuoteDialogProps {
  lead: Lead;
}

export const CreateQuoteDialog = ({ lead }: CreateQuoteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    total_amount: 0,
    valid_until: '',
    template_used: '',
    notes: ''
  });

  const { data: templates = [] } = useQuoteTemplates();
  const createQuote = useCreateQuote();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quoteData = {
      lead_id: lead.id,
      customer_email: lead.email,
      customer_name: lead.navn,
      title: formData.title,
      description: formData.description,
      items: [], // Can be expanded later
      total_amount: formData.total_amount,
      currency: 'DKK',
      status: 'draft' as const,
      valid_until: formData.valid_until || null,
      template_used: formData.template_used || null,
      notes: formData.notes || null
    };

    await createQuote.mutateAsync(quoteData);
    setOpen(false);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      total_amount: 0,
      valid_until: '',
      template_used: '',
      notes: ''
    });
  };

  const getValidUntilDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Opret Tilbud
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Opret Tilbud til {lead.navn}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Tilbud Detaljer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tilbud Titel *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="f.eks. Vinduesvask - Bolig"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Samlet beløb (kr) *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detaljeret beskrivelse af ydelsen..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template_used">Skabelon</Label>
                  <Select value={formData.template_used} onValueChange={(value) => setFormData(prev => ({ ...prev, template_used: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vælg skabelon (valgfri)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.name}>
                          {template.name}
                          {template.is_default && <Badge variant="outline" className="ml-2 text-xs">Standard</Badge>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="valid_until">Gyldig til</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    placeholder={getValidUntilDate()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Interne noter</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Interne noter til tilbuddet..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
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