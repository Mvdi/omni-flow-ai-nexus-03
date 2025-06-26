
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';

export const SignatureSettings = () => {
  const [signature, setSignature] = useState('');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [extraText, setExtraText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSignature();
    }
  }, [user]);

  const loadSignature = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_signatures')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSignature(data.html || '');
        setFontFamily(data.font_family || 'Arial');
        setExtraText(data.extra_text || '');
        
        // Store in localStorage for immediate use
        localStorage.setItem('signature-html', data.html || '');
        localStorage.setItem('support-signature', data.plain || '');
      } else {
        // Load from localStorage as fallback
        const savedSignature = localStorage.getItem('support-signature') || '';
        const savedSignatureHtml = localStorage.getItem('signature-html') || '';
        setSignature(savedSignatureHtml || savedSignature);
      }
    } catch (error) {
      console.error('Error loading signature:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke indlæse signatur: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSignature = async () => {
    if (!user) {
      toast({
        title: "Fejl", 
        description: "Du skal være logget ind for at gemme signatur",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const plainText = signature.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
      
      const signatureData = {
        user_id: user.id,
        html: signature,
        plain: plainText,
        font_family: fontFamily,
        extra_text: extraText,
      };

      const { error } = await supabase
        .from('user_signatures')
        .upsert(signatureData, { onConflict: 'user_id' });

      if (error) throw error;

      // Save to localStorage for immediate use
      localStorage.setItem('signature-html', signature);
      localStorage.setItem('support-signature', plainText);

      toast({
        title: "Signatur gemt",
        description: "Din signatur er blevet gemt succesfuldt.",
      });
    } catch (error) {
      console.error('Error saving signature:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke gemme signatur: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewHtml = () => {
    return `
      <div style="font-family: ${fontFamily}; line-height: 1.4;">
        ${signature}
        ${extraText ? `<div style="margin-top: 10px; font-style: italic;">${extraText}</div>` : ''}
      </div>
    `;
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-gray-600">Du skal være logget ind for at administrere signaturer.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Signatur Indstillinger</CardTitle>
          <CardDescription>
            Opsæt din email signatur der automatisk tilføjes til alle support beskeder
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Indlæser signatur...</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="font-family">Skrifttype</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Arial">Arial</SelectItem>
                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    <SelectItem value="Calibri">Calibri</SelectItem>
                    <SelectItem value="Georgia">Georgia</SelectItem>
                    <SelectItem value="Verdana">Verdana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">HTML Signatur</Label>
                <Textarea
                  id="signature"
                  placeholder="Indtast din HTML signatur her..."
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-gray-600">
                  Du kan bruge HTML tags som &lt;br&gt;, &lt;strong&gt;, &lt;em&gt; osv.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="extra-text">Ekstra tekst</Label>
                <Input
                  id="extra-text"
                  placeholder="Ekstra tekst der vises under signaturen..."
                  value={extraText}
                  onChange={(e) => setExtraText(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={saveSignature} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Gemmer...' : 'Gem Signatur'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showPreview ? 'Skjul' : 'Vis'} Forhåndsvisning
                </Button>
              </div>

              {showPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Forhåndsvisning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="p-4 border rounded-lg bg-white"
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
