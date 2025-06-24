
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSendEmail() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async (to: string, subject: string, content: string, ticketId?: string) => {
    setStatus('sending');
    setError(null);
    
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setStatus('error');
      setError('Du skal være logget ind for at sende emails.');
      return false;
    }

    try {
      const res = await fetch('/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ to, subject, content, ticketId }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setStatus('error');
        setError(data.error || 'Kunne ikke sende email');
        return false;
      } else {
        setStatus('success');
        return true;
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message || 'Ukendt fejl ved sending af email');
      return false;
    }
  };

  return { sendEmail, status, error };
}
