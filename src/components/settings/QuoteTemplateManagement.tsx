import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import { useQuoteTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useQuoteTemplates';
import { toast } from 'sonner';

export const QuoteTemplateManagement: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template_content: '',
    is_default: false
  });

  const { data: templates = [], refetch } = useQuoteTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.template_content) {
      toast.error('Navn og indhold er påkrævet');
      return;
    }

    try {
      await createTemplate.mutateAsync(newTemplate);
      setNewTemplate({ name: '', description: '', template_content: '', is_default: false });
      setIsCreateOpen(false);
      refetch();
      toast.success('Skabelon oprettet');
    } catch (error: any) {
      toast.error('Fejl ved oprettelse: ' + error.message);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        updates: editingTemplate
      });
      setEditingTemplate(null);
      refetch();
      toast.success('Skabelon opdateret');
    } catch (error: any) {
      toast.error('Fejl ved opdatering: ' + error.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Er du sikker på, at du vil slette denne skabelon?')) return;

    try {
      await deleteTemplate.mutateAsync(id);
      refetch();
      toast.success('Skabelon slettet');
    } catch (error: any) {
      toast.error('Fejl ved sletning: ' + error.message);
    }
  };

  const defaultTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tilbud</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-info { margin-bottom: 30px; }
        .quote-details { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total { font-size: 18px; font-weight: bold; text-align: right; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>TILBUD</h1>
        <p>Tilbudsnummer: {{quote_number}}</p>
        <p>Dato: {{date}}</p>
    </div>
    
    <div class="company-info">
        <h3>Fra:</h3>
        <p><strong>{{company_name}}</strong></p>
        <p>{{company_address}}</p>
        <p>{{company_phone}}</p>
        <p>{{company_email}}</p>
    </div>
    
    <div class="quote-details">
        <h3>Til:</h3>
        <p><strong>{{customer_name}}</strong></p>
        <p>{{customer_email}}</p>
    </div>
    
    <h3>{{title}}</h3>
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
            {{#each items}}
            <tr>
                <td>{{description}}</td>
                <td>{{quantity}}</td>
                <td>{{unit_price}} {{currency}}</td>
                <td>{{total_price}} {{currency}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>
    
    <div class="total">
        <p>Total: {{total_amount}} {{currency}}</p>
    </div>
    
    {{#if notes}}
    <div style="margin-top: 30px;">
        <h4>Noter:</h4>
        <p>{{notes}}</p>
    </div>
    {{/if}}
    
    <div class="footer">
        <p>Dette tilbud er gyldigt til: {{valid_until}}</p>
        <p>Tak for din interesse!</p>
    </div>
</body>
</html>`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tilbud Skabeloner
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ny Skabelon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Opret Ny Tilbud Skabelon</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Navn</Label>
                  <Input
                    id="name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    placeholder="F.eks. Standard Tilbud"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Input
                    id="description"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                    placeholder="Kort beskrivelse af skabelonen"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newTemplate.is_default}
                    onCheckedChange={(checked) => setNewTemplate({...newTemplate, is_default: checked})}
                  />
                  <Label>Gør til standard skabelon</Label>
                </div>
                <div>
                  <Label htmlFor="content">HTML Skabelon</Label>
                  <Textarea
                    id="content"
                    value={newTemplate.template_content || defaultTemplate}
                    onChange={(e) => setNewTemplate({...newTemplate, template_content: e.target.value})}
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="HTML indhold for tilbuddet..."
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Brug variabler som &#123;&#123;quote_number&#125;&#125;, &#123;&#123;customer_name&#125;&#125;, &#123;&#123;total_amount&#125;&#125;, etc.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Annuller
                  </Button>
                  <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
                    {createTemplate.isPending ? 'Opretter...' : 'Opret Skabelon'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    {template.name}
                    {template.is_default && <Badge variant="secondary">Standard</Badge>}
                  </h4>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Oprettet: {new Date(template.created_at).toLocaleDateString('da-DK')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {templates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ingen skabeloner fundet</p>
              <p className="text-sm">Opret din første skabelon for at komme i gang</p>
            </div>
          )}
        </div>

        {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Rediger Skabelon</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Navn</Label>
                  <Input
                    id="edit-name"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Beskrivelse</Label>
                  <Input
                    id="edit-description"
                    value={editingTemplate.description || ''}
                    onChange={(e) => setEditingTemplate({...editingTemplate, description: e.target.value})}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingTemplate.is_default}
                    onCheckedChange={(checked) => setEditingTemplate({...editingTemplate, is_default: checked})}
                  />
                  <Label>Gør til standard skabelon</Label>
                </div>
                <div>
                  <Label htmlFor="edit-content">HTML Skabelon</Label>
                  <Textarea
                    id="edit-content"
                    value={editingTemplate.template_content}
                    onChange={(e) => setEditingTemplate({...editingTemplate, template_content: e.target.value})}
                    className="min-h-[400px] font-mono text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                    Annuller
                  </Button>
                  <Button onClick={handleUpdateTemplate} disabled={updateTemplate.isPending}>
                    {updateTemplate.isPending ? 'Opdaterer...' : 'Opdater'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};