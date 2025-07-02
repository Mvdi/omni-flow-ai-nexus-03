import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreateQuote } from '@/hooks/useQuotes';
import { useQuoteTemplates } from '@/hooks/useQuoteTemplates';
import { useQuoteProducts } from '@/hooks/useQuoteProducts';
import { FileText, Plus, Calendar, DollarSign, Trash2, User, Building, MapPin, Phone, Mail, Package } from 'lucide-react';
import { Lead } from '@/hooks/useLeads';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CreateQuoteDialogProps {
  lead: Lead;
}

export const CreateQuoteDialog = ({ lead }: CreateQuoteDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    valid_until: '',
    template_used: '',
    notes: ''
  });
  
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0, total_price: 0 }
  ]);

  const { data: templates = [], isLoading: templatesLoading } = useQuoteTemplates();
  const { data: products = [] } = useQuoteProducts();
  const createQuote = useCreateQuote();

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);

  // Update item total when quantity or unit price changes
  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const addProductToItems = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const newItem: QuoteItem = {
        id: Date.now().toString(),
        description: product.name + (product.description ? ` - ${product.description}` : ''),
        quantity: 1,
        unit_price: product.default_price,
        total_price: product.default_price
      };
      setItems(prev => [...prev, newItem]);
      toast.success(`${product.name} tilføjet til tilbuddet`);
    }
  };

  const handleTemplateChange = async (templateName: string) => {
    setFormData(prev => ({ ...prev, template_used: templateName }));
    
    if (templateName) {
      const template = templates.find(t => t.name === templateName);
      if (template) {
        // Pre-fill some fields based on template if needed
        if (!formData.title) {
          setFormData(prev => ({ ...prev, title: `Tilbud for ${lead.navn}` }));
        }
      }
    }
  };

  const generateQuoteHtml = () => {
    const template = templates.find(t => t.name === formData.template_used);
    let html = template?.template_text || getDefaultTemplate();
    
    // Replace template variables
    const now = new Date();
    const replacements = {
      '{{quote_number}}': `Q-${now.getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      '{{date}}': now.toLocaleDateString('da-DK'),
      '{{customer_name}}': lead.navn,
      '{{customer_email}}': lead.email,
      '{{title}}': formData.title,
      '{{description}}': formData.description || '',
      '{{total_amount}}': totalAmount.toLocaleString('da-DK'),
      '{{currency}}': 'DKK',
      '{{valid_until}}': formData.valid_until ? new Date(formData.valid_until).toLocaleDateString('da-DK') : '',
      '{{notes}}': formData.notes || '',
      '{{company_name}}': 'MM Multipartner',
      '{{company_address}}': 'Din adresse her',
      '{{company_phone}}': 'Dit telefonnummer',
      '{{company_email}}': 'salg@mmmultipartner.dk'
    };

    // Generate items HTML
    const itemsHtml = items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td>${item.quantity}</td>
        <td>${item.unit_price.toLocaleString('da-DK')} DKK</td>
        <td>${item.total_price.toLocaleString('da-DK')} DKK</td>
      </tr>
    `).join('');
    
    html = html.replace('{{#each items}}', '').replace('{{/each}}', '');
    html = html.replace(/{{[\w_]+}}/g, (match) => {
      if (match.includes('items')) return itemsHtml;
      return replacements[match as keyof typeof replacements] || match;
    });

    return html;
  };

  const getDefaultTemplate = () => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Tilbud</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
            .company-info { margin-bottom: 30px; }
            .quote-details { margin-bottom: 30px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .items-table th { background-color: #f8fafc; font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; text-align: right; background-color: #f1f5f9; padding: 15px; border-radius: 8px; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="color: #2563eb; margin: 0;">TILBUD</h1>
            <p style="margin: 10px 0;">Tilbudsnummer: {{quote_number}}</p>
            <p style="margin: 10px 0;">Dato: {{date}}</p>
        </div>
        
        <div class="company-info">
            <h3>Fra:</h3>
            <p><strong>{{company_name}}</strong></p>
            <p>{{company_address}}</p>
            <p>Telefon: {{company_phone}}</p>
            <p>Email: {{company_email}}</p>
        </div>
        
        <div class="quote-details">
            <h3>Til:</h3>
            <p><strong>{{customer_name}}</strong></p>
            <p>{{customer_email}}</p>
        </div>
        
        <h2 style="color: #2563eb;">{{title}}</h2>
        <p>{{description}}</p>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Beskrivelse</th>
                    <th>Antal</th>
                    <th>Pris pr. stk.</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                {{items_html}}
            </tbody>
        </table>
        
        <div class="total">
            <p>Total: {{total_amount}} {{currency}}</p>
        </div>
        
        <div class="footer">
            <p><strong>Gyldig til:</strong> {{valid_until}}</p>
            <p><strong>Betingelser:</strong> Betaling 30 dage netto. Arbejdet udføres efter aftale.</p>
            <p>{{notes}}</p>
            <p style="margin-top: 20px;"><em>Tak for din interesse! Vi ser frem til at høre fra dig.</em></p>
        </div>
    </body>
    </html>
  `;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Tilbud titel er påkrævet');
      return;
    }

    if (items.length === 0 || items.every(item => !item.description.trim())) {
      toast.error('Tilføj mindst én ydelse til tilbuddet');
      return;
    }

    try {
      const quoteData = {
        lead_id: lead.id,
        customer_email: lead.email,
        customer_name: lead.navn,
        title: formData.title,
        description: formData.description,
        items: items.filter(item => item.description.trim()),
        total_amount: totalAmount,
        currency: 'DKK',
        status: 'draft' as const,
        valid_until: formData.valid_until || null,
        template_used: formData.template_used || null,
        notes: formData.notes || null
      };

      const result = await createQuote.mutateAsync(quoteData);
      
      // Generate and send email
      const quoteHtml = generateQuoteHtml().replace('{{items_html}}', 
        items.filter(item => item.description.trim()).map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${item.unit_price.toLocaleString('da-DK')} DKK</td>
            <td>${item.total_price.toLocaleString('da-DK')} DKK</td>
          </tr>
        `).join('')
      );

      // Send email via edge function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-quote-email', {
        body: {
          to: lead.email,
          customerName: lead.navn,
          quoteNumber: result.quote_number,
          quoteHtml: quoteHtml,
          subject: `Tilbud ${result.quote_number} fra MM Multipartner`
        }
      });

      if (emailError) {
        toast.error('Tilbud oprettet, men email kunne ikke sendes: ' + emailError.message);
      } else {
        toast.success(`Tilbud ${result.quote_number} sendt til ${lead.navn}`);
      }

      setOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        valid_until: '',
        template_used: '',
        notes: ''
      });
      setItems([{ id: '1', description: '', quantity: 1, unit_price: 0, total_price: 0 }]);
    } catch (error: any) {
      toast.error('Fejl ved oprettelse af tilbud: ' + error.message);
    }
  };

  const getValidUntilDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!formData.valid_until) {
      setFormData(prev => ({ ...prev, valid_until: getValidUntilDate() }));
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Opret Tilbud
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Opret Professionelt Tilbud til {lead.navn}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Kunde Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Navn:</span> {lead.navn}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Email:</span> {lead.email}
                </div>
                {lead.telefon && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Telefon:</span> {lead.telefon}
                  </div>
                )}
                {lead.adresse && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Adresse:</span> {lead.adresse}
                  </div>
                )}
                {lead.virksomhed && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Virksomhed:</span> {lead.virksomhed}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote Details Card */}
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
                    placeholder="f.eks. Vinduesvask - Bolig i Viborg"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="template_used">Skabelon</Label>
                  <Select value={formData.template_used} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={templatesLoading ? "Indlæser skabeloner..." : "Vælg skabelon (valgfri)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">
                          Ingen skabeloner fundet. <br />
                          Opret en skabelon i Indstillinger → Tilbud
                        </div>
                      ) : (
                        templates.map(template => (
                          <SelectItem key={template.id} value={template.name}>
                            <div className="flex items-center justify-between w-full">
                              <span>{template.name}</span>
                              {template.is_default && <Badge variant="outline" className="ml-2 text-xs">Standard</Badge>}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Overordnet Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Overordnet beskrivelse af projektet og forventninger..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_until">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Gyldig til
                  </Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Total Beløb: {totalAmount.toLocaleString('da-DK')} DKK
                  </Label>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      Sendes fra: <strong>salg@mmmultipartner.dk</strong>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Ydelser & Priser</span>
                <div className="flex gap-2">
                  {products.length > 0 && (
                    <Select onValueChange={addProductToItems}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Tilføj fra varelinjer" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{product.name}</span>
                              <span className="text-green-600 ml-2">{product.default_price.toLocaleString('da-DK')} kr</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button type="button" onClick={addItem} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Manuel Ydelse
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Ydelse {index + 1}</Label>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label>Beskrivelse *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Detaljeret beskrivelse af ydelsen"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Antal</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Pris pr. stk. (DKK)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      Total: {item.total_price.toLocaleString('da-DK')} DKK
                    </Badge>
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="text-right">
                <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-lg font-semibold text-blue-900">
                    Samlet Total: {totalAmount.toLocaleString('da-DK')} DKK
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interne Noter & Vilkår</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Interne noter og specielle vilkår</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Interne noter, specielle vilkår, eller andre bemærkninger..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuller
            </Button>
            <Button type="submit" disabled={createQuote.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createQuote.isPending ? 'Opretter og sender...' : 'Opret & Send Tilbud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};