
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SendEmailRequest {
  ticket_id: string;
  message_content: string;
  sender_name?: string;
  cc_emails?: string[];
}

export function useOffice365EmailSender() {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const sendEmail = async ({ ticket_id, message_content, sender_name, cc_emails }: SendEmailRequest) => {
    setIsSending(true);
    
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('Du skal være logget ind for at sende emails.');
      }

      console.log('Sending email via Office 365...', { ticket_id, content_length: message_content.length });
      
      const { data, error } = await supabase.functions.invoke('office365-send-email', {
        body: {
          ticket_id,
          message_content,
          sender_name: sender_name || 'Support Agent',
          cc_emails
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Email send error:', error);
        throw new Error(error.message || 'Fejl ved afsendelse af email');
      }

      console.log('Email sent successfully:', data);
      
      toast({
        title: 'Email sendt',
        description: `Email blev sendt til ${data.to} fra ${data.from}`,
      });

      return data;
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast({
        title: 'Fejl ved afsendelse',
        description: error.message || 'Kunne ikke sende email. Prøv igen senere.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendEmail,
    isSending,
  };
}
