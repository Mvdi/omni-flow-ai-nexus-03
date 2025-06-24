import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useOffice365Integration() {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const saveCredentials = async (client_id: string, client_secret: string, tenant_id: string) => {
    setStatus('saving');
    setError(null);
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setStatus('error');
      setError('Du skal være logget ind som admin.');
      return;
    }
    try {
      const res = await fetch('/functions/v1/office365-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ client_id, client_secret, tenant_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setError(data.error || 'Ukendt fejl');
      } else {
        setStatus('success');
      }
    } catch (e: any) {
      setStatus('error');
      setError(e.message || 'Ukendt fejl');
    }
  };

  return { saveCredentials, status, error };
} 