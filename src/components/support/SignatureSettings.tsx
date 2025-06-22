
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

export const SignatureSettings = () => {
  const [signature, setSignature] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const savedSignature = localStorage.getItem('support-signature');
    if (savedSignature) {
      setSignature(savedSignature);
    }
  }, []);

  const handleSaveSignature = () => {
    localStorage.setItem('support-signature', signature);
    toast({
      title: "Signatur gemt",
      description: "Din signatur er nu gemt og vil blive tilføjet til alle dine svar.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Min Signatur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signature">Signatur</Label>
          <Textarea
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Med venlig hilsen,&#10;[Dit navn]&#10;Kundeservice&#10;&#10;Email: support@company.com&#10;Telefon: +45 12 34 56 78"
            className="min-h-[120px]"
          />
        </div>
        <Button onClick={handleSaveSignature} className="bg-orange-600 hover:bg-orange-700">
          Gem Signatur
        </Button>
      </CardContent>
    </Card>
  );
};
