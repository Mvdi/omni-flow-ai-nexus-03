import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { User, Upload, X, Eye } from 'lucide-react';

interface SignatureData {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  customText: string;
  images: Array<{
    id: string;
    url: string;
    alt: string;
  }>;
}

export const SignatureSettings = () => {
  const [signatureData, setSignatureData] = useState<SignatureData>({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    customText: '',
    images: [],
  });
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load both old and new signature formats for compatibility
    const savedDetailedSignature = localStorage.getItem('detailed-signature');
    if (savedDetailedSignature) {
      try {
        const parsedData = JSON.parse(savedDetailedSignature);
        setSignatureData(parsedData);
        console.log('Loaded detailed signature from localStorage:', parsedData);
      } catch (error) {
        console.error('Error parsing saved detailed signature:', error);
      }
    }
  }, []);

  const handleInputChange = (field: keyof SignatureData, value: string) => {
    setSignatureData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          const newImage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            url: imageUrl,
            alt: file.name
          };
          
          setSignatureData(prev => ({
            ...prev,
            images: [...prev.images, newImage]
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (imageId: string) => {
    setSignatureData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  const generateSignatureHtml = () => {
    const { name, title, company, email, phone, website, address, customText, images } = signatureData;
    
    let html = '<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;">';
    
    if (name) html += `<div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">${name}</div>`;
    if (title) html += `<div style="color: #666; margin-bottom: 2px;">${title}</div>`;
    if (company) html += `<div style="font-weight: 500; margin-bottom: 8px;">${company}</div>`;
    
    html += '<div style="margin-bottom: 8px;">';
    if (email) html += `<div>✉ <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">${email}</a></div>`;
    if (phone) html += `<div>📞 <a href="tel:${phone}" style="color: #0066cc; text-decoration: none;">${phone}</a></div>`;
    if (website) html += `<div>🌐 <a href="${website}" style="color: #0066cc; text-decoration: none;">${website}</a></div>`;
    html += '</div>';
    
    if (address) html += `<div style="color: #666; font-size: 12px; margin-bottom: 8px;">${address}</div>`;
    
    if (images.length > 0) {
      html += '<div style="margin: 12px 0;">';
      images.forEach(image => {
        html += `<img src="${image.url}" alt="${image.alt}" style="max-height: 60px; margin-right: 8px; vertical-align: middle;" />`;
      });
      html += '</div>';
    }
    
    if (customText) html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; color: #666; font-size: 12px;">${customText.replace(/\n/g, '<br>')}</div>`;
    
    html += '</div>';
    
    return html;
  };

  const handleSaveSignature = () => {
    // Save the detailed signature data
    localStorage.setItem('detailed-signature', JSON.stringify(signatureData));
    
    // Generate and save the HTML signature for use in tickets
    const htmlSignature = generateSignatureHtml();
    localStorage.setItem('signature-html', htmlSignature);
    
    // Also save a simple text version for backwards compatibility
    const textSignature = [
      signatureData.name,
      signatureData.title,
      signatureData.company,
      signatureData.email,
      signatureData.phone,
      signatureData.website,
      signatureData.address,
      signatureData.customText
    ].filter(Boolean).join('\n');
    
    localStorage.setItem('support-signature', textSignature);
    
    console.log('Signature saved:', {
      data: signatureData,
      html: htmlSignature,
      text: textSignature
    });
    
    toast({
      title: "Signatur gemt",
      description: "Din detaljerede signatur er nu gemt og vil blive tilføjet til alle dine svar.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detaljeret Signatur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Fulde navn</Label>
              <Input
                id="name"
                value={signatureData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Dit fulde navn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Jobtitel</Label>
              <Input
                id="title"
                value={signatureData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Kundeservice specialist"
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-2">
            <Label htmlFor="company">Virksomhed</Label>
            <Input
              id="company"
              value={signatureData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Virksomhedens navn"
            />
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={signatureData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="din@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={signatureData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+45 12 34 56 78"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Hjemmeside</Label>
            <Input
              id="website"
              value={signatureData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://www.virksomhed.dk"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={signatureData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Gadenavn 123, 1234 By, Danmark"
            />
          </div>

          {/* Images */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Billeder i signatur</Label>
              <div className="relative">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload billeder
                </Button>
              </div>
            </div>
            
            {signatureData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {signatureData.images.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-16 object-contain border rounded-lg bg-gray-50"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Text */}
          <div className="space-y-2">
            <Label htmlFor="customText">Brugerdefineret tekst</Label>
            <Textarea
              id="customText"
              value={signatureData.customText}
              onChange={(e) => handleInputChange('customText', e.target.value)}
              placeholder="Ekstra information, juridiske noter, eller andet..."
              className="min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSaveSignature} className="bg-orange-600 hover:bg-orange-700">
              Gem Signatur
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
            <CardTitle>Forhåndsvisning af signatur</CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="border rounded-lg p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: generateSignatureHtml() }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
