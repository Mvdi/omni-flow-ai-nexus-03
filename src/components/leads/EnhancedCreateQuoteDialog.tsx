import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreateQuote } from '@/hooks/useQuotes';
import { useQuoteTemplates } from '@/hooks/useQuoteTemplates';
import { useQuoteProducts } from '@/hooks/useQuoteProducts';
import { useSendQuoteEmail } from '@/hooks/useSendQuoteEmail';
import { FileText, Plus, Trash2, Send, Mail } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';

interface QuoteItem {
  id: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface EnhancedCreateQuoteDialogProps {
  lead: Lead;
  children?: React.ReactNode;
}

export const EnhancedCreateQuoteDialog = ({ lead, children }: EnhancedCreateQuoteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [sendAfterSave, setSendAfterSave] = useState(false);
  
  const createQuote = useCreateQuote();
  const { data: templates = [] } = useQuoteTemplates();
  const { data: products = [] } = useQuoteProducts();
  const { sendQuoteEmail, isSending } = useSendQuoteEmail();

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const totalAmount = subtotal - discountAmount;

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template) {
        setDescription(template.template_text);
        if (!title) {
          setTitle(template.name);
        }
      }
    }
  }, [selectedTemplate, templates, title]);

  const addItem = (productId?: string) => {
    const product = productId ? products.find(p => p.id === productId) : null;
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      product_name: product?.name || '',
      description: product?.description || '',
      quantity: 1,
      unit_price: product?.default_price || 0,
      total: product?.default_price || 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = async (send: boolean = false) => {
    try {
      const quoteData = {
        lead_id: lead.id,
        customer_email: lead.email,
        customer_name: lead.navn,
        title: title || `Tilbud til ${lead.navn}`,
        description,
        items: items,
        total_amount: totalAmount,
        currency: 'DKK',
        status: send ? 'sent' as const : 'draft' as const,
        valid_until: null,
        template_used: selectedTemplate || null,
        notes: notes || null,
      };

      const newQuote = await createQuote.mutateAsync(quoteData);
      
      if (send && newQuote) {
        // Send quote via Office 365
        const emailContent = `
Hej ${lead.navn},

Tak for din interesse. Vedlagt finder du vores tilbud.

${description}

${items.length > 0 ? `
TILBUDSLINJER:
${items.map(item => 
  `• ${item.product_name}: ${item.quantity} ${products.find(p => p.name === item.product_name)?.unit || 'stk'} à ${item.unit_price.toLocaleString('da-DK')} kr = ${item.total.toLocaleString('da-DK')} kr`
).join('\n')}

Subtotal: ${subtotal.toLocaleString('da-DK')} kr
${discountPercent > 0 ? `Rabat (${discountPercent}%): -${discountAmount.toLocaleString('da-DK')} kr\n` : ''}
TOTAL: ${totalAmount.toLocaleString('da-DK')} kr
` : ''}

${notes ? `\nNotater:\n${notes}` : ''}

Med venlig hilsen
MM Multipartner
        `;

        await sendQuoteEmail({
          quote_id: newQuote.id,
          customer_email: lead.email,
          customer_name: lead.navn,
          quote_content: emailContent
        });
      }
      
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create/send quote:', error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedTemplate('');
    setItems([]);
    setDiscountPercent(0);
    setNotes('');
    setSendAfterSave(false);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Opret Avanceret Tilbud
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Grundoplysninger</TabsTrigger>
            <TabsTrigger value="items">Varelinjer</TabsTrigger>
            <TabsTrigger value="send">Gennemgå & Send</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Kunde</Label>
                <Input 
                  id="customer" 
                  value={`${lead.navn} (${lead.email})`} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="template">Skabelon</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg skabelon (valgfrit)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.is_default && <Badge variant="secondary" className="ml-2">Standard</Badge>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                rows={6}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Noter (interne)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Interne noter..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Varelinjer</h3>
              <div className="flex gap-2">
                <Select onValueChange={(productId) => addItem(productId)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Tilføj produkt" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.default_price?.toLocaleString('da-DK')} kr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => addItem()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tilføj Linje
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <Label>Produkt</Label>
                        <Input
                          value={item.product_name}
                          onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                          placeholder="Produktnavn"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Beskrivelse</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Beskrivelse"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Antal</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Enhedspris</Label>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>Total</Label>
                        <div className="text-sm font-semibold p-2">
                          {item.total.toLocaleString('da-DK')} kr
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rabat & Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="discount">Rabat (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div className="text-right space-y-1">
                    <div>Subtotal: <span className="font-semibold">{subtotal.toLocaleString('da-DK')} kr</span></div>
                    {discountPercent > 0 && (
                      <div className="text-orange-600">
                        Rabat ({discountPercent}%): <span className="font-semibold">-{discountAmount.toLocaleString('da-DK')} kr</span>
                      </div>
                    )}
                    <div className="text-lg font-bold">
                      Total: <span className="text-primary">{totalAmount.toLocaleString('da-DK')} kr</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tilbudsoversigt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><strong>Kunde:</strong> {lead.navn} ({lead.email})</div>
                <div><strong>Titel:</strong> {title || `Tilbud til ${lead.navn}`}</div>
                <div><strong>Antal linjer:</strong> {items.length}</div>
                <div><strong>Total beløb:</strong> {totalAmount.toLocaleString('da-DK')} kr</div>
                {discountPercent > 0 && (
                  <div><strong>Rabat:</strong> {discountPercent}% ({discountAmount.toLocaleString('da-DK')} kr)</div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuller
              </Button>
              <Button 
                onClick={() => handleSubmit(false)}
                disabled={createQuote.isPending}
                variant="secondary"
              >
                {createQuote.isPending ? 'Gemmer...' : 'Gem som Kladde'}
              </Button>
              <Button 
                onClick={() => handleSubmit(true)}
                disabled={createQuote.isPending || isSending}
                className="bg-primary hover:bg-primary/90"
              >
                <Mail className="h-4 w-4 mr-2" />
                {createQuote.isPending || isSending ? 'Sender...' : 'Gem & Send'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};