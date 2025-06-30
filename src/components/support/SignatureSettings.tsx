import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { User, Upload, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FONT_OPTIONS = [
  'Arial', 'Verdana', 'Times New Roman', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Lucida Console'
];

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
  fontFamily: string;
  extraText: string;
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
    fontFamily: 'Arial',
    extraText: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSignature = async () => {
      setLoading(true);
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          console.log('Loading signature for user:', user.id);
          const { data: userSignature, error } = await supabase
            .from('user_signatures')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (userSignature) {
            console.log('Found signature in database:', userSignature);
            // Parse images from stored data
            let images = [];
            try {
              if (userSignature.plain && userSignature.plain.includes('IMAGES:')) {
                const imagesPart = userSignature.plain.split('IMAGES:')[1];
                images = JSON.parse(imagesPart || '[]');
                console.log('Parsed images from signature:', images);
              }
            } catch (e) {
              console.error('Error parsing images:', e);
            }
            
            setSignatureData({ 
              name: userSignature.plain?.split('\n')[0] || '',
              title: userSignature.plain?.split('\n')[1] || '',
              company: userSignature.plain?.split('\n')[2] || '',
              email: userSignature.plain?.split('\n')[3] || '',
              phone: userSignature.plain?.split('\n')[4] || '',
              website: userSignature.plain?.split('\n')[5] || '',
              address: userSignature.plain?.split('\n')[6] || '',
              customText: userSignature.plain?.split('\n')[7] || '',
              images: images,
              fontFamily: userSignature.font_family || 'Arial',
              extraText: userSignature.extra_text || ''
            });
          } else {
            console.log('No signature found in database, checking localStorage');
            // Fallback til localStorage
            const savedDetailedSignature = localStorage.getItem('detailed-signature');
            if (savedDetailedSignature) {
              try {
                const parsedData = JSON.parse(savedDetailedSignature);
                console.log('Found signature in localStorage:', parsedData);
                setSignatureData(prev => ({ ...prev, ...parsedData }));
              } catch (e) {
                console.error('Error parsing localStorage signature:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading signature:', error);
        toast({ 
          title: 'Fejl',
          description: 'Kunne ikke hente signatur.',
          variant: 'destructive' 
        });
      }
      setLoading(false);
    };
    
    loadSignature();
  }, [toast]);

  const handleInputChange = (field: keyof SignatureData, value: string) => {
    setSignatureData(prev => ({ ...prev, [field]: value }));
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
          console.log('Adding new image to signature:', newImage.alt);
          setSignatureData(prev => ({ ...prev, images: [...prev.images, newImage] }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (imageId: string) => {
    console.log('Removing image:', imageId);
    setSignatureData(prev => ({ ...prev, images: prev.images.filter(img => img.id !== imageId) }));
  };

  const generateSignatureHtml = () => {
    const { name, title, company, email, phone, website, address, customText, images, fontFamily, extraText } = signatureData;
    
    console.log('Generating signature HTML with images:', images.length);
    
    // Clean signature layout with logo BELOW website
    let html = `<div style="font-family: ${fontFamily}, sans-serif; font-size: 14px; line-height: 1.4; color: #333; max-width: 400px;">`;
    
    // Extra text at top if present
    if (extraText) {
      html += `<div style="margin-bottom: 8px; color: #666; font-size: 13px;">${extraText.replace(/\n/g, '<br>')}</div>`;
    }
    
    // Name (largest, bold)
    if (name) {
      html += `<div style="font-weight: bold; font-size: 16px; margin-bottom: 2px; color: #333;">${name}</div>`;
    }
    
    // Title (smaller, gray)
    if (title) {
      html += `<div style="color: #666; font-size: 13px; margin-bottom: 2px;">${title}</div>`;
    }
    
    // Company (medium, semi-bold)
    if (company) {
      html += `<div style="font-weight: 500; color: #444; font-size: 14px; margin-bottom: 6px;">${company}</div>`;
    }
    
    // Email with icon
    if (email) {
      html += `<div style="font-size: 13px; line-height: 1.4; margin-bottom: 2px;">`;
      html += `📧 <a href="mailto:${email}" style="color: #0066cc; text-decoration: none;">${email}</a>`;
      html += '</div>';
    }
    
    // Phone with icon
    if (phone) {
      html += `<div style="font-size: 13px; line-height: 1.4; margin-bottom: 2px;">`;
      html += `📞 <a href="tel:${phone}" style="color: #0066cc; text-decoration: none;">${phone}</a>`;
      html += '</div>';
    }
    
    // Website with icon
    if (website) {
      html += `<div style="font-size: 13px; line-height: 1.4; margin-bottom: 12px;">`;
      html += `🌐 <a href="${website.startsWith('http') ? website : 'https://' + website}" style="color: #0066cc; text-decoration: none;">${website}</a>`;
      html += '</div>';
    }
    
    // LOGO/IMAGE SECTION - AFTER website, with proper spacing
    if (images.length > 0) {
      console.log('Adding images to signature HTML:', images.length);
      html += '<div style="margin-top: 12px; margin-bottom: 12px;">';
      images.forEach(image => {
        html += `<img src="${image.url}" alt="${image.alt}" style="max-height: 60px; max-width: 150px; object-fit: contain; display: block; margin-bottom: 4px;" />`;
      });
      html += '</div>';
    }
    
    // Address after logo
    if (address) {
      html += `<div style="color: #666; font-size: 12px; margin-bottom: 8px;">${address}</div>`;
    }
    
    // Custom text at bottom with separator line
    if (customText) {
      html += `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; color: #666; font-size: 11px;">${customText.replace(/\n/g, '<br>')}</div>`;
    }
    
    html += '</div>'; // Close main wrapper
    return html;
  };

  const handleSaveSignature = async () => {
    setLoading(true);
    console.log('Saving signature with images:', signatureData.images.length);
    
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('Ikke logget ind');
      }

      // Gem til Supabase database
      const plainTextSignature = [
        signatureData.name,
        signatureData.title,
        signatureData.company,
        signatureData.email,
        signatureData.phone,
        signatureData.website,
        signatureData.address,
        signatureData.customText,
        signatureData.images.length > 0 ? `IMAGES:${JSON.stringify(signatureData.images)}` : ''
      ].filter(Boolean).join('\n');

      const signatureHtml = generateSignatureHtml();
      
      console.log('Saving to database - plain text length:', plainTextSignature.length);
      console.log('Saving to database - HTML length:', signatureHtml.length);
      console.log('Images to save:', signatureData.images.map(img => ({ id: img.id, alt: img.alt, urlLength: img.url.length })));

      const { error: upsertError } = await supabase
        .from('user_signatures')
        .upsert({
          user_id: user.id,
          html: signatureHtml,
          plain: plainTextSignature,
          font_family: signatureData.fontFamily,
          extra_text: signatureData.extraText
        }, { 
          onConflict: 'user_id' 
        });
      
      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        throw upsertError;
      }

      // Gem også til localStorage som backup
      localStorage.setItem('detailed-signature', JSON.stringify(signatureData));
      localStorage.setItem('signature-html', signatureHtml);
      localStorage.setItem('support-signature', plainTextSignature);
      
      console.log('Signature saved successfully to both database and localStorage');
      
      toast({
        title: 'Signatur gemt',
        description: `Din signatur er gemt med ${signatureData.images.length} billede(r).`,
      });
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast({ 
        title: 'Fejl ved gemning',
        description: `Kunne ikke gemme signatur: ${error.message}`,
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
            <User className="h-5 w-5" />
            Detaljeret Signatur
            {signatureData.images.length > 0 && (
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {signatureData.images.length} billede(r)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font and extra text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fontFamily">Skrifttype</Label>
              <select id="fontFamily" className="w-full border rounded p-2" value={signatureData.fontFamily} onChange={e => handleInputChange('fontFamily', e.target.value)}>
                {FONT_OPTIONS.map(font => <option key={font} value={font}>{font}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extraText">Standard tekst over signatur</Label>
              <Input id="extraText" value={signatureData.extraText} onChange={e => handleInputChange('extraText', e.target.value)} placeholder="F.eks. 'Vi vaskes!'" />
            </div>
          </div>

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
                placeholder="Servicetekniker"
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
              placeholder="MM Multipartner"
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
                placeholder="mani@mmmultipartner.dk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={signatureData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="39393038"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Hjemmeside</Label>
            <Input
              id="website"
              value={signatureData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="www.mmmultipartner.dk"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={signatureData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Adresse info"
            />
          </div>

          {/* Images */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Logo/Billeder i signatur</Label>
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
                  Upload logo
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
            <Label htmlFor="customText">Brugerdefineret tekst (footer)</Label>
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
            <Button onClick={handleSaveSignature} className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? 'Gemmer...' : 'Gem Signatur'}
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
