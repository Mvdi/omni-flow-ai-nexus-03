import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuotes, useUpdateQuote } from '@/hooks/useQuotes';
import { FileText, Eye, Send, DollarSign, Calendar, CheckCircle, X, RotateCcw, Edit } from 'lucide-react';
import { formatDanishDateTime } from '@/utils/danishTime';
import { Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QuotePreviewDialog } from './QuotePreviewDialog';
import { QuoteEditorDialog } from './QuoteEditorDialog';

interface QuoteManagementProps {
  lead: Lead;
}

export const QuoteManagement = ({ lead }: QuoteManagementProps) => {
  const { data: allQuotes = [] } = useQuotes();
  const updateQuote = useUpdateQuote();
  const [sendingQuote, setSendingQuote] = useState<string | null>(null);
  const [previewQuote, setPreviewQuote] = useState<any>(null);
  const [editQuote, setEditQuote] = useState<any>(null);

  // Filter quotes for this lead
  const leadQuotes = allQuotes.filter(quote => quote.lead_id === lead.id);

  const handleStatusChange = async (quoteId: string, status: 'sent' | 'accepted' | 'rejected') => {
    await updateQuote.mutateAsync({
      id: quoteId,
      updates: { status }
    });
  };

  const handleSendQuote = async (quote: any) => {
    console.log('handleSendQuote received quote:', quote);
    console.log('customEmailData:', quote.customEmailData);
    setSendingQuote(quote.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          to: lead.email,
          customerName: lead.navn,
          quoteNumber: quote.quote_number,
          quoteTitle: quote.title,
          quoteDescription: quote.description,
          totalAmount: quote.total_amount,
          currency: quote.currency,
          validUntil: quote.valid_until,
          items: quote.items || [],
          customEmailData: quote.customEmailData || {
            customer_phone: lead.telefon,
            customer_address: lead.adresse,
            customer_company: lead.virksomhed,
            customer_email: lead.email,
            ...quote.customEmailData
          }
        }
      });

      if (error) {
        throw error;
      }

      // Update quote status to sent
      await updateQuote.mutateAsync({
        id: quote.id,
        updates: { status: 'sent' }
      });

      toast.success(`Tilbud ${quote.quote_number} sendt til ${lead.navn}`);
    } catch (error: any) {
      console.error('Failed to send quote:', error);
      toast.error('Fejl ved afsendelse af tilbud: ' + (error.message || 'Ukendt fejl'));
    } finally {
      setSendingQuote(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      case 'expired': return <Calendar className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getQuotesByStatus = (status: string) => {
    return leadQuotes.filter(quote => quote.status === status);
  };

  const totalQuoteValue = leadQuotes
    .filter(q => q.status === 'accepted')
    .reduce((sum, quote) => sum + quote.total_amount, 0);

  if (leadQuotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tilbud
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Ingen tilbud oprettet endnu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tilbud ({leadQuotes.length})
          </div>
          {totalQuoteValue > 0 && (
            <Badge variant="outline" className="text-green-600">
              <DollarSign className="h-3 w-3 mr-1" />
              {totalQuoteValue.toLocaleString('da-DK')} kr accepteret
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Alle ({leadQuotes.length})</TabsTrigger>
            <TabsTrigger value="draft">Kladde ({getQuotesByStatus('draft').length})</TabsTrigger>
            <TabsTrigger value="sent">Sendt ({getQuotesByStatus('sent').length})</TabsTrigger>
            <TabsTrigger value="accepted">Accepteret ({getQuotesByStatus('accepted').length})</TabsTrigger>
            <TabsTrigger value="rejected">Afvist ({getQuotesByStatus('rejected').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
              {leadQuotes.map((quote) => (
                <QuoteCard 
                  key={quote.id} 
                  quote={quote} 
                  onStatusChange={handleStatusChange}
                  onSendQuote={handleSendQuote}
                  onPreviewQuote={setPreviewQuote}
                  onEditQuote={setEditQuote}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  sendingQuote={sendingQuote}
                />
              ))}
          </TabsContent>

          {['draft', 'sent', 'accepted', 'rejected'].map((status) => (
            <TabsContent key={status} value={status} className="space-y-3 mt-4">
              {getQuotesByStatus(status).map((quote) => (
                <QuoteCard 
                  key={quote.id} 
                  quote={quote} 
                  onStatusChange={handleStatusChange}
                  onSendQuote={handleSendQuote}
                  onPreviewQuote={setPreviewQuote}
                  onEditQuote={setEditQuote}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  sendingQuote={sendingQuote}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <QuotePreviewDialog
        open={!!previewQuote}
        onOpenChange={() => setPreviewQuote(null)}
        quote={previewQuote}
        leadName={lead.navn}
        onSendQuote={(quoteWithTemplate) => {
          if (previewQuote) {
            handleSendQuote(quoteWithTemplate || previewQuote);
            setPreviewQuote(null);
          }
        }}
        sending={sendingQuote === previewQuote?.id}
      />

      <QuoteEditorDialog
        open={!!editQuote}
        onOpenChange={() => setEditQuote(null)}
        quote={editQuote}
        leadName={lead.navn}
        onSendQuote={(customQuote) => {
          if (customQuote) {
            handleSendQuote(customQuote);
            setEditQuote(null);
          }
        }}
        sending={sendingQuote === editQuote?.id}
      />
    </Card>
  );
};

interface QuoteCardProps {
  quote: any;
  onStatusChange: (quoteId: string, status: 'sent' | 'accepted' | 'rejected') => void;
  onSendQuote: (quote: any) => void;
  onPreviewQuote: (quote: any) => void;
  onEditQuote?: (quote: any) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  sendingQuote: string | null;
}

const QuoteCard = ({ quote, onStatusChange, onSendQuote, onPreviewQuote, onEditQuote, getStatusColor, getStatusIcon, sendingQuote }: QuoteCardProps) => {
  return (
    <div className="p-3 border rounded-lg bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-medium text-blue-600">
              {quote.quote_number}
            </span>
            <Badge className={`text-xs ${getStatusColor(quote.status)}`}>
              {getStatusIcon(quote.status)}
              <span className="ml-1 capitalize">{quote.status}</span>
            </Badge>
          </div>
          
          <h4 className="font-medium text-gray-900 mb-1">{quote.title}</h4>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="font-medium text-green-600">
              {quote.total_amount.toLocaleString('da-DK')} {quote.currency}
            </span>
            {quote.valid_until && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Gyldig til: {formatDanishDateTime(quote.valid_until)}
              </span>
            )}
          </div>

          {quote.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {quote.description}
            </p>
          )}

          {quote.template_used && (
            <div className="text-xs text-purple-600 mb-2">
              Skabelon: {quote.template_used}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onPreviewQuote(quote)}
            className="text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
          {onEditQuote && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onEditQuote(quote)}
              className="text-xs text-purple-600 border-purple-200"
            >
              <Edit className="h-3 w-3 mr-1" />
              Rediger
            </Button>
          )}
          {quote.status === 'draft' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSendQuote(quote)}
              disabled={sendingQuote === quote.id}
              className="text-xs"
            >
              <Send className="h-3 w-3 mr-1" />
              {sendingQuote === quote.id ? 'Sender...' : 'Send'}
            </Button>
          )}
        </div>

        {quote.status === 'sent' && (
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSendQuote(quote)}
              disabled={sendingQuote === quote.id}
              className="text-xs text-blue-600 border-blue-200"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {sendingQuote === quote.id ? 'Sender...' : 'Gensend'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(quote.id, 'accepted')}
              className="text-xs text-green-600 border-green-200"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Accepter
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(quote.id, 'rejected')}
              className="text-xs text-red-600 border-red-200"
            >
              <X className="h-3 w-3 mr-1" />
              Afvis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};