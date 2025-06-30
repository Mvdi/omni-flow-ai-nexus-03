
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Download } from 'lucide-react';

export const ReprocessTicket = () => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleReprocess = async () => {
    if (!ticketNumber.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast venligst et ticket nummer",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log(`Re-processing ticket: ${ticketNumber}`);
      
      const { data, error } = await supabase.functions.invoke('reprocess-ticket', {
        body: { ticket_number: ticketNumber.trim() }
      });

      if (error) {
        console.error('Re-process error:', error);
        throw error;
      }

      console.log('Re-process result:', data);

      if (data.success) {
        toast({
          title: "Ticket genbehandlet",
          description: `Fandt ${data.attachments_found} vedhæftninger for ${data.ticket_number}`,
        });
        
        // Refresh the page to show new attachments
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || 'Ukendt fejl');
      }
    } catch (error) {
      console.error('Re-process failed:', error);
      toast({
        title: "Fejl ved genbehandling",
        description: `Kunne ikke genbehandle ticket: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Genbehandl Ticket (Hent Manglende Vedhæftninger)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder="T-022"
            value={ticketNumber}
            onChange={(e) => setTicketNumber(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleReprocess}
            disabled={isProcessing || !ticketNumber.trim()}
          >
            {isProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'Behandler...' : 'Genbehandl'}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Brug dette værktøj til at genbehandle gamle tickets og hente manglende vedhæftninger.
        </p>
      </CardContent>
    </Card>
  );
};
