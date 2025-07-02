
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QuotePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  leadName: string;
  onSendQuote: () => void;
  sending: boolean;
}

export const QuotePreviewDialog = ({ 
  open, 
  onOpenChange, 
  quote, 
  leadName, 
  onSendQuote,
  sending 
}: QuotePreviewDialogProps) => {
  const [templateData, setTemplateData] = useState<any>(null);

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

  if (!quote) return null;

  // Check if any items have discount
  const hasDiscount = quote.items?.some((item: any) => item.discount_percent > 0) || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Forhåndsvisning: Tilbud {quote.quote_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden bg-white max-w-4xl mx-auto">
          {/* Email Preview - Clean Professional Design */}
          <div className="bg-white p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-black mb-1">{templateData?.documentTitle || 'Tilbud'}</h1>
                {templateData?.documentSubtitle && (
                  <p className="text-lg text-black">{templateData.documentSubtitle}</p>
                )}
              </div>
              <div className="w-32 h-32 flex items-center justify-center">
                {templateData?.logoUrl ? (
                  <img src={templateData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    LOGO
                  </div>
                )}
              </div>
            </div>
            
            {/* Company Info */}
            <div className="flex justify-between mb-8">
              <div>
                <div className="font-semibold text-black mb-2">{templateData?.companyName || 'Virksomhed'}</div>
                <div className="text-sm text-black leading-relaxed">
                  {templateData?.companyAddress || ''}<br/>
                  {templateData?.companyCity || ''}<br/>
                  {templateData?.companyCvr || ''}
                </div>
              </div>
              <div className="text-sm text-black text-right">
                {new Date().toLocaleDateString('da-DK')}
              </div>
            </div>
            
            {/* Customer Information */}
            <div className="mb-8">
              <div className="font-semibold text-black text-lg mb-2">{leadName}</div>
              <div className="text-sm text-black leading-relaxed">
                {quote.customer_email && (
                  <div>Email: {quote.customer_email}</div>
                )}
                {quote.customer_phone && (
                  <div>Telefon: {quote.customer_phone}</div>
                )}
                {quote.customer_address && (
                  <div>Adresse: {quote.customer_address}</div>
                )}
                {quote.customer_company && (
                  <div>Virksomhed: {quote.customer_company}</div>
                )}
              </div>
            </div>
            
            {/* Project Info */}
            <div className="mb-8 text-sm text-black leading-relaxed">
              <strong>{quote.title}</strong>
            </div>
            
            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-3 font-semibold text-black">{templateData?.itemColumnHeader || 'Vare'}</th>
                    <th className="text-left py-3 font-semibold text-black">{templateData?.descriptionColumnHeader || 'Beskrivelse'}</th>
                    <th className="text-right py-3 font-semibold text-black">{templateData?.quantityColumnHeader || 'Antal'}</th>
                    <th className="text-right py-3 font-semibold text-black">{templateData?.unitColumnHeader || 'Enhed'}</th>
                    <th className="text-right py-3 font-semibold text-black">{templateData?.priceColumnHeader || 'Stk. pris'}</th>
                    {hasDiscount && <th className="text-right py-3 font-semibold text-black">{templateData?.discountColumnHeader || 'Rabat'}</th>}
                    <th className="text-right py-3 font-semibold text-black">{templateData?.totalColumnHeader || 'Pris'}</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items?.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-3 text-black">{item.description?.split(' ')[0] || 'Ydelse'}</td>
                      <td className="py-3 text-black">{item.description}</td>
                      <td className="py-3 text-right text-black">{item.quantity}</td>
                      <td className="py-3 text-right text-black">Timer</td>
                      <td className="py-3 text-right text-black">Kr. {item.unit_price?.toLocaleString('da-DK') || 0}</td>
                      {hasDiscount && <td className="py-3 text-right text-black">{item.discount_percent || 0}%</td>}
                      <td className="py-3 text-right text-black font-semibold">Kr. {item.total_price?.toLocaleString('da-DK') || 0}</td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
            
            {/* Totals */}
            <div className="text-right mb-8">
              <div className="flex justify-end mb-2">
                <div className="w-32 text-right mr-10 text-black">{templateData?.subtotalLabel || 'Subtotal'}</div>
                <div className="w-20 text-right text-black">Kr. {Math.round((quote.total_amount || 0) / 1.25).toLocaleString('da-DK')}</div>
              </div>
              <div className="flex justify-end mb-4">
                <div className="w-32 text-right mr-10 text-black">{templateData?.vatLabel || 'Moms (25%)'}</div>
                <div className="w-20 text-right text-black">Kr. {Math.round((quote.total_amount || 0) - ((quote.total_amount || 0) / 1.25)).toLocaleString('da-DK')}</div>
              </div>
              <div className="flex justify-end font-bold text-lg border-t-2 border-black pt-3">
                <div className="w-32 text-right mr-10 text-black">{templateData?.totalLabel || 'Total DKK'}</div>
                <div className="w-20 text-right text-black">Kr. {(quote.total_amount || 0).toLocaleString('da-DK')}</div>
              </div>
            </div>
            
            {/* Confirmation Button */}
            <div className="text-center mb-8">
              <div className="bg-green-600 text-white px-8 py-3 rounded font-semibold text-sm inline-block">
                {templateData?.ctaButtonText || '✅ BEKRÆFT TILBUD NU'}
              </div>
            </div>
            
            {/* Signature */}
            <div className="mb-8 text-black">
              {templateData?.signatureText || 'Vi ser frem til et godt samarbejde.'}<br/><br/>
              Med venlig hilsen<br/>
              {templateData?.signatureName || 'Mathias Nielsen'}
            </div>
            
            {/* Footer */}
            <div className="text-center text-xs text-gray-600 border-t border-gray-200 pt-5">
              {templateData?.footerText || ''}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Luk
          </Button>
          <Button onClick={onSendQuote} disabled={sending} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sender...' : 'Send Tilbud'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
