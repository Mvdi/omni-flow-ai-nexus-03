import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Send } from "lucide-react";

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
  if (!quote) return null;

  const itemsHtml = quote.items?.map((item: any, index: number) => (
    <tr key={index} className="border-b border-gray-200">
      <td className="p-4 text-gray-700">{item.description}</td>
      <td className="p-4 text-center text-gray-600">{item.quantity}</td>
      <td className="p-4 text-right text-gray-600">{item.unit_price?.toLocaleString('da-DK')} {quote.currency}</td>
      <td className="p-4 text-right text-gray-900 font-semibold">{item.total_price?.toLocaleString('da-DK')} {quote.currency}</td>
    </tr>
  )) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Forhåndsvisning: Tilbud {quote.quote_number}
          </DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Email Preview */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-2">PROFESSIONELT TILBUD</h1>
            <p className="text-indigo-100 text-lg font-medium">Specialiseret rengøring af højeste kvalitet</p>
            <div className="bg-white/15 backdrop-blur-sm px-6 py-3 rounded-full inline-block mt-4 font-semibold">
              Tilbud Nr. {quote.quote_number}
            </div>
          </div>
          
          <div className="p-8">
            <div className="text-lg text-gray-800 mb-6">Kære {leadName},</div>
            
            <p className="text-gray-600 mb-6">
              Tak for din henvendelse! Vi har udarbejdet et skræddersyet tilbud baseret på dine specifikke behov.
            </p>
            
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl mb-6 border-l-4 border-indigo-600">
              <h3 className="text-indigo-600 text-xl font-semibold mb-2">{quote.title}</h3>
              {quote.description && (
                <p className="text-gray-600">{quote.description}</p>
              )}
            </div>
            
            <div className="bg-green-50 border border-green-200 p-6 rounded-xl mb-6">
              <h4 className="text-green-800 font-semibold mb-3">🏆 Hvad du får med MM Multipartner:</h4>
              <ul className="space-y-2">
                <li className="text-green-700 flex items-center">
                  <span className="text-green-500 font-bold mr-2">✓</span>
                  Professionelt udstyr og miljøvenlige produkter
                </li>
                <li className="text-green-700 flex items-center">
                  <span className="text-green-500 font-bold mr-2">✓</span>
                  Erfarne og forsikrede medarbejdere
                </li>
                <li className="text-green-700 flex items-center">
                  <span className="text-green-500 font-bold mr-2">✓</span>
                  Kvalitetsgaranti på alt vores arbejde
                </li>
                <li className="text-green-700 flex items-center">
                  <span className="text-green-500 font-bold mr-2">✓</span>
                  Fleksible tider der passer dig
                </li>
                <li className="text-green-700 flex items-center">
                  <span className="text-green-500 font-bold mr-2">✓</span>
                  Ingen skjulte omkostninger
                </li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="text-gray-800 text-lg font-semibold mb-4">📋 Tilbudsdetaljer:</h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-4 text-left font-semibold text-gray-700 text-sm uppercase tracking-wide">Ydelse</th>
                      <th className="p-4 text-center font-semibold text-gray-700 text-sm uppercase tracking-wide">Antal</th>
                      <th className="p-4 text-right font-semibold text-gray-700 text-sm uppercase tracking-wide">Pris pr. stk.</th>
                      <th className="p-4 text-right font-semibold text-gray-700 text-sm uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsHtml}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white p-6 rounded-xl text-center mb-6">
              <div className="text-sm text-indigo-200 uppercase tracking-wide mb-2">Samlet investering</div>
              <div className="text-3xl font-bold mb-2">{quote.total_amount?.toLocaleString('da-DK')} {quote.currency}</div>
              <p className="text-indigo-200 text-sm">Inkl. moms • Ingen overraskelser</p>
            </div>
            
            {quote.valid_until && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-center mb-6 font-medium">
                ⏰ <strong>Begrænset tilbud:</strong> Dette tilbud udløber {new Date(quote.valid_until).toLocaleDateString('da-DK')}
              </div>
            )}
            
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-8 rounded-2xl text-center mb-6">
              <h3 className="text-white text-2xl font-bold mb-3">🚀 Klar til at komme i gang?</h3>
              <p className="text-green-100 mb-6">Bekræft dit tilbud nu og få professionel rengøring af højeste kvalitet!</p>
              <div className="bg-white text-green-600 px-8 py-4 rounded-full font-bold text-lg inline-block shadow-lg">
                ✅ BEKRÆFT TILBUD NU
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-6">
              <h4 className="text-amber-800 font-semibold mb-3">💬 Har du spørgsmål?</h4>
              <p className="text-amber-800">
                Ring til os på <strong>+45 XX XX XX XX</strong> eller svar på denne email. 
                Vi er klar til at hjælpe dig!
              </p>
            </div>
            
            <div className="bg-gray-50 p-8 text-center border-t border-gray-200">
              <div className="text-2xl font-bold text-indigo-600 mb-4">MM Multipartner</div>
              <div className="text-gray-600 leading-relaxed">
                <strong>Email:</strong> salg@mmmultipartner.dk<br/>
                <strong>Hjemmeside:</strong> www.mmmultipartner.dk<br/><br/>
                <em>"Din pålidelige partner inden for professionel rengøring"</em>
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