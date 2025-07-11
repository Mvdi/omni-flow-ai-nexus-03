import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Save, Send, Upload, Image } from "lucide-react";
import { useQuoteTemplates } from '@/hooks/useQuotes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuoteEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  leadName: string;
  onSendQuote: (customData: any) => void;
  sending: boolean;
}

export const QuoteEditorDialog = ({ 
  open, 
  onOpenChange, 
  quote, 
  leadName, 
  onSendQuote,
  sending 
}: QuoteEditorDialogProps) => {
  const { data: templates = [] } = useQuoteTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [templateData, setTemplateData] = useState<any>(null);
  
  const [emailData, setEmailData] = useState({
    // Company Info - vil blive overskrevet fra skabelon
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyCvr: '',
    
    // Header
    documentTitle: 'Tilbud',
    documentSubtitle: '',
    
    // Content
    projectDescription: quote?.title || '',
    
    // Benefits section
    benefitsTitle: '🏆 Hvad du får med MM Multipartner:',
    benefits: [
      'Professionelt udstyr og miljøvenlige produkter',
      'Erfarne og forsikrede medarbejdere', 
      'Kvalitetsgaranti på alt vores arbejde',
      'Fleksible tider der passer dig',
      'Ingen skjulte omkostninger'
    ],
    
    // Call to Action
    ctaButtonText: '✅ BEKRÆFT TILBUD NU',
    
    // Footer
    footerText: ''
  });

  // Load template data fra database
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          const { data: template } = await supabase
            .from('quote_email_templates')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();
          
          if (template && template.template_data) {
            setTemplateData(template.template_data);
            const data = template.template_data as any;
            // Opdater emailData med skabelon data
            setEmailData(prev => ({
              ...prev,
              companyName: data?.companyName || '',
              companyAddress: data?.companyAddress || '',
              companyCity: data?.companyCity || '',
              companyCvr: data?.companyCvr || '',
              documentTitle: data?.documentTitle || 'Tilbud',
              documentSubtitle: data?.documentSubtitle || '',
              ctaButtonText: data?.ctaButtonText || '✅ BEKRÆFT TILBUD NU',
              footerText: data?.footerText || ''
            }));
            
            if (data?.logoUrl) {
              setLogoUrl(data.logoUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error loading template:', error);
      }
    };
    
    if (open) {
      loadTemplate();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate);
      if (template?.template_text) {
        // Parse template text hvis det er JSON, ellers brug det som projekt beskrivelse
        try {
          const templateData = JSON.parse(template.template_text);
          setEmailData(prev => ({ ...prev, ...templateData }));
        } catch {
          setEmailData(prev => ({ 
            ...prev, 
            projectDescription: template.template_text 
          }));
        }
      }
    }
    
    // Hvis der ikke er valgt template, brug template data fra database
    if (!selectedTemplate && templateData) {
      setEmailData(prev => ({
        ...prev,
        companyName: templateData.companyName || prev.companyName,
        companyAddress: templateData.companyAddress || prev.companyAddress,
        companyCity: templateData.companyCity || prev.companyCity,
        companyCvr: templateData.companyCvr || prev.companyCvr,
        documentTitle: templateData.documentTitle || prev.documentTitle,
        documentSubtitle: templateData.documentSubtitle || prev.documentSubtitle,
        ctaButtonText: templateData.ctaButtonText || prev.ctaButtonText,
        footerText: templateData.footerText || prev.footerText
      }));
    }
  }, [selectedTemplate, templates, templateData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      setLogoUrl(urlData.publicUrl);
      toast.success('Logo uploadet succesfuldt!');
    } catch (error: any) {
      toast.error('Fejl ved upload: ' + error.message);
    }
  };

  const handleSend = () => {
    const customQuoteData = {
      ...quote,
      customEmailData: emailData,
      logoUrl: logoUrl
    };
    onSendQuote(customQuoteData);
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Rediger Tilbud: {quote.quote_number}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="template">Skabelon</TabsTrigger>
            <TabsTrigger value="content">Indhold</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="preview">Forhåndsvisning</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vælg Skabelon</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg en skabelon..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Skabelonen vil automatisk udfylde relevante felter med foruddefineret tekst.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Virksomhedsoplysninger</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Virksomhedsnavn</Label>
                  <Input
                    id="companyName"
                    value={emailData.companyName}
                    onChange={(e) => setEmailData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="companyAddress">Adresse</Label>
                  <Input
                    id="companyAddress"
                    value={emailData.companyAddress}
                    onChange={(e) => setEmailData(prev => ({ ...prev, companyAddress: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="companyCity">By og postnummer</Label>
                  <Input
                    id="companyCity"
                    value={emailData.companyCity}
                    onChange={(e) => setEmailData(prev => ({ ...prev, companyCity: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="companyCvr">CVR/Kontakt</Label>
                  <Input
                    id="companyCvr"
                    value={emailData.companyCvr}
                    onChange={(e) => setEmailData(prev => ({ ...prev, companyCvr: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Header */}
            <Card>
              <CardHeader>
                <CardTitle>Dokument Header</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="documentTitle">Titel</Label>
                  <Input
                    id="documentTitle"
                    value={emailData.documentTitle}
                    onChange={(e) => setEmailData(prev => ({ ...prev, documentTitle: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="documentSubtitle">Undertitel</Label>
                  <Input
                    id="documentSubtitle"
                    value={emailData.documentSubtitle}
                    onChange={(e) => setEmailData(prev => ({ ...prev, documentSubtitle: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Project Content */}
            <Card>
              <CardHeader>
                <CardTitle>Projekt Indhold</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="projectDescription">Projekt Beskrivelse</Label>
                  <Textarea
                    id="projectDescription"
                    value={emailData.projectDescription}
                    onChange={(e) => setEmailData(prev => ({ ...prev, projectDescription: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="logo-upload">Upload Logo</Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="mt-2"
                    />
                  </div>
                  {logoUrl && (
                    <div className="border rounded-lg p-4">
                      <img src={logoUrl} alt="Logo" className="max-h-20 object-contain" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="border rounded-lg overflow-hidden bg-white">
              {/* Preview af det tilpassede tilbud */}
              <div className="bg-white p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-4xl font-bold text-black mb-1">{emailData.documentTitle}</h1>
                    <p className="text-lg text-black">{emailData.documentSubtitle}</p>
                  </div>
                  <div className="w-20 h-20">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        LOGO
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Company Info */}
                <div className="flex justify-between mb-8">
                  <div>
                    <div className="font-semibold text-black mb-2">{emailData.companyName}</div>
                    <div className="text-sm text-black leading-relaxed">
                      {emailData.companyAddress}<br/>
                      {emailData.companyCity}<br/>
                      {emailData.companyCvr}
                    </div>
                  </div>
                  <div className="text-sm text-black text-right">
                    {new Date().toLocaleDateString('da-DK')}
                  </div>
                </div>
                
                {/* Customer */}
                <div className="mb-6">
                  <div className="font-semibold text-black text-lg">{leadName}</div>
                </div>
                
                {/* Project Info */}
                <div className="mb-8 text-sm text-black leading-relaxed">
                  <strong>{emailData.projectDescription}</strong>
                </div>
                
                {/* Rest of preview... */}
                <div className="text-center text-gray-500 py-8">
                  [Tabel og resten af tilbuddet vises her...]
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuller
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sender...' : 'Send Tilpasset Tilbud'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};