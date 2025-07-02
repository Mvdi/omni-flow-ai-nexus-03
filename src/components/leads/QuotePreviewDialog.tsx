
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
            Forhåndsvisning: {templateData?.documentTitle || 'Tilbud'} {quote.quote_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden bg-white max-w-4xl mx-auto">
          <div className="bg-white p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-black mb-1">{templateData?.documentTitle || 'Tilbud'}</h1>
              </div>
              <div className="w-24 h-24 flex items-center justify-center">
                {templateData?.logoUrl ? (
                  <img src={templateData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                    LOGO
                  </div>
                )}
              </div>
            </div>
            
            {/* Company Info */}
            <div className="flex justify-between mb-8">
              <div>
                <div className="font-medium text-black">{templateData?.companyName}</div>
                {templateData?.companyAddress && <div className="text-sm text-black">{templateData.companyAddress}</div>}
                {templateData?.companyCity && <div className="text-sm text-black">{templateData.companyCity}</div>}
                {templateData?.companyCvr && <div className="text-sm text-black">{templateData.companyCvr}</div>}
              </div>
              <div className="text-sm text-black text-right">
                {new Date().toLocaleDateString('da-DK')}
              </div>
            </div>
            
            {/* Customer Information */}
            <div className="mb-6">
              <div className="font-medium text-black">{leadName}</div>
              {quote.customer_email && (
                <div className="text-sm text-blue-600 underline">{quote.customer_email}</div>
              )}
            </div>
            
            {/* Quote Info */}
            <div className="mb-6 text-sm text-black">
              <strong>{quote.title}</strong>
            </div>
            
            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-2 font-semibold text-black">{templateData?.itemColumnHeader || 'Vare'}</th>
                    <th className="text-left py-2 font-semibold text-black">{templateData?.descriptionColumnHeader || 'Beskrivelse'}</th>
                    <th className="text-center py-2 font-semibold text-black">{templateData?.quantityColumnHeader || 'Antal'}</th>
                    <th className="text-center py-2 font-semibold text-black">{templateData?.unitColumnHeader || 'Enhed'}</th>
                    <th className="text-right py-2 font-semibold text-black">{templateData?.priceColumnHeader || 'Stk. pris'}</th>
                    <th className="text-right py-2 font-semibold text-black">{templateData?.totalColumnHeader || 'Pris'}</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items?.map((item: any, index: number) => (
                    <tr key={index} className="border-b border-gray-300">
                      <td className="py-2 text-black">{item.description?.split(' ')[0] || item.description || 'Ydelse'}</td>
                      <td className="py-2 text-black">{item.description}</td>
                      <td className="py-2 text-center text-black">{item.quantity}</td>
                      <td className="py-2 text-center text-black">Timer</td>
                      <td className="py-2 text-right text-black">Kr. {item.unit_price?.toLocaleString('da-DK') || 0}</td>
                      <td className="py-2 text-right text-black font-semibold">Kr. {item.total_price?.toLocaleString('da-DK') || 0}</td>
                    </tr>
                  )) || []}
                </tbody>
              </table>
            </div>
            
            {/* Totals */}
            <div className="text-right mb-8 space-y-1">
              <div className="flex justify-end">
                <div className="w-32 text-right mr-10 text-black">{templateData?.subtotalLabel || 'Subtotal'}</div>
                <div className="w-20 text-right text-black">Kr. {Math.round((quote.total_amount || 0) / 1.25).toLocaleString('da-DK')}</div>
              </div>
              <div className="flex justify-end">
                <div className="w-32 text-right mr-10 text-black">{templateData?.vatLabel || 'Moms (25%)'}</div>
                <div className="w-20 text-right text-black">Kr. {Math.round((quote.total_amount || 0) - ((quote.total_amount || 0) / 1.25)).toLocaleString('da-DK')}</div>
              </div>
              <div className="flex justify-end font-bold text-lg border-t-2 border-black pt-2">
                <div className="w-32 text-right mr-10 text-black">{templateData?.totalLabel || 'Total DKK'}</div>
                <div className="w-20 text-right text-black">Kr. {(quote.total_amount || 0).toLocaleString('da-DK')}</div>
              </div>
            </div>
            
            {/* Confirmation Button */}
            <div className="text-center mb-8">
              <div className="bg-green-600 text-white px-6 py-2 rounded font-semibold text-sm inline-block">
                {templateData?.ctaButtonText || '✅ BEKRÆFT TILBUD NU'}
              </div>
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
