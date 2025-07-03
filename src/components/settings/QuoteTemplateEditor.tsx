import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, X, Eye, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FONT_OPTIONS = [
  'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Lucida Console'
];

interface QuoteTemplateData {
  // Header
  documentTitle: string;
  documentSubtitle: string;
  
  // Company Info
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyContact: string;
  companyCvr: string;
  
  // Content
  projectDescriptionPrefix: string;
  validityText: string;
  startText: string;
  
  // Table Headers
  itemColumnHeader: string;
  descriptionColumnHeader: string;
  quantityColumnHeader: string;
  unitColumnHeader: string;
  priceColumnHeader: string;
  discountColumnHeader: string;
  totalColumnHeader: string;
  
  // Totals
  subtotalLabel: string;
  vatLabel: string;
  totalLabel: string;
  
  // CTA Section
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  
  // Signature
  signatureText: string;
  signatureName: string;
  signatureTitle: string;
  
  // Footer
  footerText: string;
  
  // Logo
  logoUrl: string;
  
  // Styling
  fontFamily: string;
  primaryColor: string;
  backgroundColor: string;
}

export const QuoteTemplateEditor = () => {
  const [templateData, setTemplateData] = useState<QuoteTemplateData>({
    documentTitle: 'Tilbud',
    documentSubtitle: '',
    companyName: 'MM Multipartner',
    companyAddress: 'Penselvej 8',
    companyCity: '1234 Spandevis',
    companyContact: '',
    companyCvr: 'CVR: 12345678',
    projectDescriptionPrefix: '',
    validityText: 'Tilbuddet gælder t.o.m. den',
    startText: 'Virksomhedsnavnet påbegynder opgaven den 01/01-2025',
    itemColumnHeader: 'Vare',
    descriptionColumnHeader: 'Beskrivelse',
    quantityColumnHeader: 'Antal',
    unitColumnHeader: 'Enhed',
    priceColumnHeader: 'Stk. pris',
    discountColumnHeader: 'Rabat',
    totalColumnHeader: 'Pris',
    subtotalLabel: 'Subtotal',
    vatLabel: 'Moms (25%)',
    totalLabel: 'Total DKK',
    ctaTitle: '',
    ctaSubtitle: '',
    ctaButtonText: '✅ BEKRÆFT TILBUD NU',
    signatureText: 'Vi ser frem til et godt samarbejde.',
    signatureName: 'Torben Schwartz',
    signatureTitle: 'Din malermester',
    footerText: 'MM Multipartner – Penselvej 8 – 1234 Spandevis – kontakt@dinmalermester.dk – www.dinmalermester.dk',
    logoUrl: '',
    fontFamily: 'Arial',
    primaryColor: '#4CAF50',
    backgroundColor: '#ffffff'
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          // Try to load from quote_email_templates table
          const { data: template, error } = await supabase
            .from('quote_email_templates')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single();
          
          if (template && template.template_data) {
            console.log('Found quote template in database:', template);
            const parsedData = template.template_data as Record<string, any>;
            setTemplateData(prev => ({ ...prev, ...parsedData }));
          } else {
            console.log('No quote template found in database, using defaults');
          }
        }
      } catch (error) {
        console.error('Error loading quote template:', error);
      }
      setLoading(false);
    };
    
    loadTemplate();
  }, []);

  const handleInputChange = (field: keyof QuoteTemplateData, value: string) => {
    setTemplateData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `quote-logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      setTemplateData(prev => ({ ...prev, logoUrl: urlData.publicUrl }));
      toast({ title: 'Logo uploadet', description: 'Logo blev uploadet succesfuldt!' });
    } catch (error: any) {
      toast({ 
        title: 'Fejl ved upload', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const generateTemplateHtml = () => {
    // Generate a comprehensive HTML template similar to the send-quote-email function
    return `
    <!DOCTYPE html>
    <html lang="da">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${templateData.documentTitle} - ${templateData.companyName}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: ${templateData.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                line-height: 1.4; 
                color: #000000; 
                background-color: ${templateData.backgroundColor}; 
                font-size: 14px;
            }
            .container { 
                max-width: 800px; 
                margin: 0 auto; 
                background: #ffffff; 
                padding: 40px;
            }
            .header { 
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 40px;
            }
            .quote-title {
                font-size: 36px;
                font-weight: 700;
                color: #000000;
                margin-bottom: 5px;
                line-height: 1.1;
            }
            .quote-subtitle {
                font-size: 18px;
                color: #000000;
                font-weight: 400;
            }
            .logo-section {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .company-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
            }
            .company-name {
                font-size: 16px;
                font-weight: 600;
                color: #000000;
                margin-bottom: 8px;
            }
            .company-details {
                font-size: 13px;
                color: #000000;
                line-height: 1.4;
            }
            .signature-section {
                margin-top: 50px;
                font-size: 14px;
                color: #000000;
            }
            .footer { 
                margin-top: 60px;
                text-align: center; 
                font-size: 12px;
                color: #666666;
                border-top: 1px solid #e5e7eb;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <div class="quote-title">${templateData.documentTitle}</div>
                    ${templateData.documentSubtitle ? `<div class="quote-subtitle">${templateData.documentSubtitle}</div>` : ''}
                </div>
                <div class="logo-section">
                    ${templateData.logoUrl ? 
                      `<img src="${templateData.logoUrl}" alt="Logo" style="max-width: 80px; max-height: 80px; object-fit: contain;" />` : 
                      '<div style="background: #E3F2FD; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #1976D2; font-weight: 600; font-size: 14px;">LOGO</div>'
                    }
                </div>
            </div>
            
            <div class="company-section">
                <div>
                    <div class="company-name">${templateData.companyName}</div>
                    <div class="company-details">
                        ${templateData.companyAddress}<br>
                        ${templateData.companyCity}<br>
                        ${templateData.companyCvr}
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 30px;">
                <div style="font-size: 13px; color: #000000; line-height: 1.5; margin-bottom: 30px;">
                    ${templateData.projectDescriptionPrefix ? `<strong>${templateData.projectDescriptionPrefix}</strong><br>` : ''}
                    ${templateData.validityText}<br>
                    ${templateData.startText}
                </div>
            </div>
            
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="#" style="display: inline-block; background: #4CAF50; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">${templateData.ctaButtonText}</a>
            </div>
            
            <div class="signature-section">
                ${templateData.signatureText}<br><br>
                Med venlig hilsen<br>
                ${templateData.signatureName}<br>
                ${templateData.signatureTitle}
            </div>
            
            <div class="footer">
                ${templateData.footerText}
            </div>
        </div>
    </body>
    </html>
    `;
  };

  const handleSaveTemplate = async () => {
    setLoading(true);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Ikke logget ind');
      }

      const templateHtml = generateTemplateHtml();
      
      // Først sæt alle eksisterende templates til ikke-default
      await supabase
        .from('quote_email_templates')
        .update({ is_default: false })
        .eq('user_id', user.id);
      
      // Derefter upsert den nye template som default
      const { error: upsertError } = await supabase
        .from('quote_email_templates')
        .upsert({
          user_id: user.id,
          name: 'Standard Tilbudsskabelon',
          description: 'Standard tilbudsskabelon lavet i editor',
          template_data: templateData as any,
          html_template: templateHtml,
          is_default: true
        });
      
      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        throw upsertError;
      }
      
      toast({
        title: 'Tilbudsskabelon gemt',
        description: 'Din tilbudsskabelon er gemt og vil blive brugt til alle nye tilbud.',
      });
    } catch (error: any) {
      console.error('Error saving quote template:', error);
      toast({ 
        title: 'Fejl ved gemning',
        description: `Kunne ikke gemme tilbudsskabelon: ${error.message}`,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tilbudsskabelon Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dokument Header</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentTitle">Dokument Titel</Label>
                <Input
                  id="documentTitle"
                  value={templateData.documentTitle}
                  onChange={(e) => handleInputChange('documentTitle', e.target.value)}
                  placeholder="Tilbud"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documentSubtitle">Undertitel</Label>
                <Input
                  id="documentSubtitle"
                  value={templateData.documentSubtitle}
                  onChange={(e) => handleInputChange('documentSubtitle', e.target.value)}
                  placeholder="(EKSEMPEL) eller tom"
                />
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Virksomhedsoplysninger</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Virksomhedsnavn</Label>
                <Input
                  id="companyName"
                  value={templateData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="MM Multipartner"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Adresse</Label>
                <Input
                  id="companyAddress"
                  value={templateData.companyAddress}
                  onChange={(e) => handleInputChange('companyAddress', e.target.value)}
                  placeholder="Penselvej 8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCity">By og postnummer</Label>
                <Input
                  id="companyCity"
                  value={templateData.companyCity}
                  onChange={(e) => handleInputChange('companyCity', e.target.value)}
                  placeholder="1234 Spandevis"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyCvr">CVR/Kontakt</Label>
                <Input
                  id="companyCvr"
                  value={templateData.companyCvr}
                  onChange={(e) => handleInputChange('companyCvr', e.target.value)}
                  placeholder="CVR: 12345678"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Logo</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </Button>
              </div>
              {templateData.logoUrl && (
                <div className="flex items-center gap-2">
                  <img src={templateData.logoUrl} alt="Logo" className="h-12 w-12 object-contain border rounded" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTemplateData(prev => ({ ...prev, logoUrl: '' }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Content Texts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Indhold Tekster</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="validityText">Gyldighedstekst</Label>
                <Input
                  id="validityText"
                  value={templateData.validityText}
                  onChange={(e) => handleInputChange('validityText', e.target.value)}
                  placeholder="Tilbuddet gælder t.o.m. den"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startText">Opstarts tekst</Label>
                <Input
                  id="startText"
                  value={templateData.startText}
                  onChange={(e) => handleInputChange('startText', e.target.value)}
                  placeholder="Virksomhedsnavnet påbegynder opgaven den 01/01-2025"
                />
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Opfordrings Sektion</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctaButtonText">Knap Tekst</Label>
                <Input
                  id="ctaButtonText"
                  value={templateData.ctaButtonText}
                  onChange={(e) => handleInputChange('ctaButtonText', e.target.value)}
                  placeholder="✅ BEKRÆFT TILBUD NU"
                />
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Underskrift</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signatureText">Underskrift Tekst</Label>
                <Input
                  id="signatureText"
                  value={templateData.signatureText}
                  onChange={(e) => handleInputChange('signatureText', e.target.value)}
                  placeholder="Vi ser frem til et godt samarbejde."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatureName">Navn</Label>
                <Input
                  id="signatureName"
                  value={templateData.signatureName}
                  onChange={(e) => handleInputChange('signatureName', e.target.value)}
                  placeholder="Torben Schwartz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatureTitle">Titel</Label>
                <Input
                  id="signatureTitle"
                  value={templateData.signatureTitle}
                  onChange={(e) => handleInputChange('signatureTitle', e.target.value)}
                  placeholder="Din malermester"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Footer</h3>
            <div className="space-y-2">
              <Label htmlFor="footerText">Footer Tekst</Label>
              <Textarea
                id="footerText"
                value={templateData.footerText}
                onChange={(e) => handleInputChange('footerText', e.target.value)}
                placeholder="MM Multipartner – Penselvej 8 – 1234 Spandevis – kontakt@dinmalermester.dk – www.dinmalermester.dk"
                rows={3}
              />
            </div>
          </div>

          {/* Styling */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Styling</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Skrifttype</Label>
                <select 
                  id="fontFamily" 
                  className="w-full border rounded p-2" 
                  value={templateData.fontFamily} 
                  onChange={e => handleInputChange('fontFamily', e.target.value)}
                >
                  {FONT_OPTIONS.map(font => <option key={font} value={font}>{font}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primær Farve (CTA)</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={templateData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Baggrundfarve</Label>
                <Input
                  id="backgroundColor"
                  type="color"
                  value={templateData.backgroundColor}
                  onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveTemplate} className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Gemmer...' : 'Gem Skabelon'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Skjul' : 'Vis'} forhåndsvisning
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Forhåndsvisning af Tilbudsskabelon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-white p-4">
              <iframe 
                srcDoc={generateTemplateHtml()}
                className="w-full h-96 border-0"
                sandbox="allow-same-origin"
                title="Template Preview"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};