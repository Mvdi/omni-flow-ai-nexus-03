import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Edit, Trash2, Package, Copy } from 'lucide-react';
import { useQuoteTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/hooks/useQuoteTemplates';
import { useQuoteProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useQuoteProducts';
import { toast } from 'sonner';

export const QuoteTemplateManagement: React.FC = () => {
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template_text: '',
    is_default: false
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    default_price: 0,
    unit: 'stk',
    category: ''
  });

  const { data: templates = [], refetch: refetchTemplates } = useQuoteTemplates();
  const { data: products = [], refetch: refetchProducts } = useQuoteProducts();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.template_text) {
      toast.error('Navn og tekst er påkrævet');
      return;
    }

    try {
      await createTemplate.mutateAsync(newTemplate);
      setNewTemplate({ name: '', description: '', template_text: '', is_default: false });
      setIsCreateTemplateOpen(false);
      refetchTemplates();
      toast.success('Skabelon oprettet');
    } catch (error: any) {
      toast.error('Fejl ved oprettelse: ' + error.message);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || newProduct.default_price <= 0) {
      toast.error('Navn og pris er påkrævet');
      return;
    }

    try {
      await createProduct.mutateAsync(newProduct);
      setNewProduct({ name: '', description: '', default_price: 0, unit: 'stk', category: '' });
      setIsCreateProductOpen(false);
      refetchProducts();
      toast.success('Varelinje oprettet');
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
      refetchTemplates();
      toast.success('Skabelon opdateret');
    } catch (error: any) {
      toast.error('Fejl ved opdatering: ' + error.message);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        updates: editingProduct
      });
      setEditingProduct(null);
      refetchProducts();
      toast.success('Varelinje opdateret');
    } catch (error: any) {
      toast.error('Fejl ved opdatering: ' + error.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Er du sikker på, at du vil slette denne skabelon?')) return;

    try {
      await deleteTemplate.mutateAsync(id);
      refetchTemplates();
      toast.success('Skabelon slettet');
    } catch (error: any) {
      toast.error('Fejl ved sletning: ' + error.message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Er du sikker på, at du vil slette denne varelinje?')) return;

    try {
      await deleteProduct.mutateAsync(id);
      refetchProducts();
      toast.success('Varelinje slettet');
    } catch (error: any) {
      toast.error('Fejl ved sletning: ' + error.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopieret til udklipsholder');
  };

  const defaultTemplateText = `Kære [KUNDE_NAVN],

Tak for din henvendelse vedrørende [YDELSE_TYPE].

Vi glæder os til at hjælpe dig med:

[BESKRIVELSE_AF_OPGAVE]

Priser:
- [YDELSE_1]: [PRIS_1] kr
- [YDELSE_2]: [PRIS_2] kr

Total: [TOTAL_BELØB] kr

Tilbuddet er gyldigt til: [GYLDIG_TIL]

Betingelser:
- Betaling 30 dage netto
- Arbejdet udføres efter aftale
- Priser er ekskl. moms

Har du spørgsmål, er du velkommen til at kontakte os.

Med venlig hilsen
MM Multipartner
salg@mmmultipartner.dk`;

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tilbud Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Tekst Skabeloner</TabsTrigger>
            <TabsTrigger value="products">Varelinjer/Produkter</TabsTrigger>
          </TabsList>
          
          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Tekst Skabeloner</h3>
                <p className="text-sm text-muted-foreground">Copy-paste færdige skabeloner til tilbud</p>
              </div>
              <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ny Skabelon
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Opret Ny Tekst Skabelon</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Navn</Label>
                      <Input
                        id="name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                        placeholder="F.eks. Standard Vinduesvask"
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
                      <Label htmlFor="content">Skabelon Tekst</Label>
                      <Textarea
                        id="content"
                        value={newTemplate.template_text || defaultTemplateText}
                        onChange={(e) => setNewTemplate({...newTemplate, template_text: e.target.value})}
                        className="min-h-[400px] font-mono text-sm"
                        placeholder="Skriv din skabelon tekst her..."
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Brug placeholdre som [KUNDE_NAVN], [TOTAL_BELØB], [GYLDIG_TIL] etc.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
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

            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {template.name}
                        {template.is_default && <Badge variant="secondary">Standard</Badge>}
                      </h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(template.template_text)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
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
                  
                  <div className="bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap">{template.template_text}</pre>
                  </div>
                </div>
              ))}
              
              {templates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Ingen skabeloner fundet</p>
                  <p className="text-sm">Opret din første tekst skabelon</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Varelinjer & Produkter</h3>
                <p className="text-sm text-muted-foreground">Genbrugelige ydelser og priser til tilbud</p>
              </div>
              <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ny Varelinje
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Opret Ny Varelinje</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="product-name">Navn *</Label>
                        <Input
                          id="product-name"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder="F.eks. Vinduesvask - Stor bolig"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Kategori</Label>
                        <Input
                          id="category"
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                          placeholder="F.eks. Vinduesvask"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="product-description">Beskrivelse</Label>
                      <Textarea
                        id="product-description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        placeholder="Detaljeret beskrivelse af ydelsen"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Standard Pris (DKK) *</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={newProduct.default_price}
                          onChange={(e) => setNewProduct({...newProduct, default_price: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Enhed</Label>
                        <Select value={newProduct.unit} onValueChange={(value) => setNewProduct({...newProduct, unit: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stk">stk</SelectItem>
                            <SelectItem value="job">job</SelectItem>
                            <SelectItem value="timer">timer</SelectItem>
                            <SelectItem value="m2">m²</SelectItem>
                            <SelectItem value="løbende meter">løbende meter</SelectItem>
                            <SelectItem value="måned">måned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateProductOpen(false)}>
                        Annuller
                      </Button>
                      <Button onClick={handleCreateProduct} disabled={createProduct.isPending}>
                        {createProduct.isPending ? 'Opretter...' : 'Opret Varelinje'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Categories Filter */}
            {categories.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">Alle kategorier</Badge>
                {categories.map(category => (
                  <Badge key={category} variant="secondary">{category}</Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{product.name}</h4>
                        {product.category && (
                          <Badge variant="outline" className="text-xs mt-1">{product.category}</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-green-600">
                        {product.default_price.toLocaleString('da-DK')} DKK
                      </span>
                      <span className="text-sm text-muted-foreground">/ {product.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {products.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ingen varelinjer fundet</p>
                <p className="text-sm">Opret dine første produkter/ydelser</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  <Label htmlFor="edit-content">Skabelon Tekst</Label>
                  <Textarea
                    id="edit-content"
                    value={editingTemplate.template_text}
                    onChange={(e) => setEditingTemplate({...editingTemplate, template_text: e.target.value})}
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

        {/* Edit Product Dialog */}
        {editingProduct && (
          <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Rediger Varelinje</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-product-name">Navn</Label>
                    <Input
                      id="edit-product-name"
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Kategori</Label>
                    <Input
                      id="edit-category"
                      value={editingProduct.category || ''}
                      onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-product-description">Beskrivelse</Label>
                  <Textarea
                    id="edit-product-description"
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-price">Standard Pris (DKK)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingProduct.default_price}
                      onChange={(e) => setEditingProduct({...editingProduct, default_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-unit">Enhed</Label>
                    <Select value={editingProduct.unit} onValueChange={(value) => setEditingProduct({...editingProduct, unit: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stk">stk</SelectItem>
                        <SelectItem value="job">job</SelectItem>
                        <SelectItem value="timer">timer</SelectItem>
                        <SelectItem value="m2">m²</SelectItem>
                        <SelectItem value="løbende meter">løbende meter</SelectItem>
                        <SelectItem value="måned">måned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingProduct(null)}>
                    Annuller
                  </Button>
                  <Button onClick={handleUpdateProduct} disabled={updateProduct.isPending}>
                    {updateProduct.isPending ? 'Opdaterer...' : 'Opdater'}
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