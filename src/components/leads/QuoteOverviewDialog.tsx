import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuotes } from '@/hooks/useQuotes';
import { FileText, Eye, Edit, Calendar } from 'lucide-react';

export const QuoteOverviewDialog = () => {
  const [open, setOpen] = useState(false);
  const { data: quotes = [], isLoading } = useQuotes();

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Kladde';
      case 'sent': return 'Sendt';
      case 'accepted': return 'Accepteret';
      case 'rejected': return 'Afvist';
      case 'expired': return 'Udløbet';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="whitespace-nowrap touch-target">
          <FileText className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Vis Tilbud</span>
          <span className="sm:hidden">Tilbud</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tilbud Oversigt
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border">
              <div className="text-sm font-medium text-blue-700">Total Tilbud</div>
              <div className="text-xl font-bold text-blue-900">{quotes.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border">
              <div className="text-sm font-medium text-green-700">Accepteret</div>
              <div className="text-xl font-bold text-green-900">
                {quotes.filter(q => q.status === 'accepted').length}
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border">
              <div className="text-sm font-medium text-orange-700">Sendt</div>
              <div className="text-xl font-bold text-orange-900">
                {quotes.filter(q => q.status === 'sent').length}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border">
              <div className="text-sm font-medium text-purple-700">Total Værdi</div>
              <div className="text-xl font-bold text-purple-900">
                {quotes.reduce((sum, q) => sum + q.total_amount, 0).toLocaleString('da-DK')} kr
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tilbud Nr.</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Beløb</TableHead>
                  <TableHead>Oprettet</TableHead>
                  <TableHead>Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Indlæser tilbud...
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Ingen tilbud fundet
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.quote_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{quote.customer_name || 'Ingen navn'}</div>
                          <div className="text-xs text-gray-500">{quote.customer_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{quote.title}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(quote.status)}>
                          {getStatusLabel(quote.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {quote.total_amount.toLocaleString('da-DK')} {quote.currency}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {new Date(quote.created_at).toLocaleDateString('da-DK')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};