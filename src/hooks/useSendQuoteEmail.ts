import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SendQuoteEmailRequest {
  quote_id: string;
  customer_email: string;
  customer_name: string;
  quote_content: string;
  sender_name?: string;
}

export function useSendQuoteEmail() {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendQuoteEmail = async ({ quote_id, customer_email, customer_name, quote_content, sender_name }: SendQuoteEmailRequest) => {
    setIsSending(true);
    
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('Du skal være logget ind for at sende tilbudsemail.');
      }

      console.log('Sending quote email via Office 365...', { quote_id, customer_email });
      
      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          quote_id,
          customer_email,
          customer_name,
          quote_content,
          sender_name: sender_name || 'Sales Team'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Quote email send error:', error);
        throw new Error(error.message || 'Fejl ved afsendelse af tilbudsemail');
      }

      console.log('Quote email sent successfully:', data);
      
      toast({
        title: 'Tilbudsemail sendt',
        description: `Tilbud ${data.quote_number} blev sendt til ${customer_email}`,
      });

      return data;
    } catch (error: any) {
      console.error('Failed to send quote email:', error);
      toast({
        title: 'Fejl ved afsendelse',
        description: error.message || 'Kunne ikke sende tilbudsemail. Prøv igen senere.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendQuoteEmail,
    isSending,
  };
}