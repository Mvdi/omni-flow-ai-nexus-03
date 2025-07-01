
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SyncStatus {
  isHealthy: boolean;
  lastSyncAt: string | null;
  errorCount: number;
  warningMessage?: string;
}

export const useEmailSyncMonitoring = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isHealthy: true,
    lastSyncAt: null,
    errorCount: 0
  });

  const checkSyncHealth = async () => {
    try {
      // Check recent sync logs
      const { data: recentLogs } = await supabase
        .from('email_sync_log')
        .select('*')
        .gte('sync_started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('sync_started_at', { ascending: false });

      // Check mailbox sync status
      const { data: mailboxes } = await supabase
        .from('monitored_mailboxes')
        .select('last_sync_at')
        .eq('is_active', true);

      if (!recentLogs || !mailboxes) return;

      const failedLogs = recentLogs.filter(log => log.status === 'failed');
      const runningTooLong = recentLogs.filter(log => 
        log.status === 'running' && 
        new Date(log.sync_started_at).getTime() < Date.now() - 10 * 60 * 1000
      );

      let isHealthy = true;
      let warningMessage = undefined;

      if (failedLogs.length > 2) {
        isHealthy = false;
        warningMessage = `${failedLogs.length} sync fejl i den sidste time`;
      } else if (runningTooLong.length > 0) {
        isHealthy = false;
        warningMessage = 'Email sync kører usædvanligt længe';
      } else if (recentLogs.length === 0) {
        isHealthy = false;
        warningMessage = 'Ingen sync aktivitet den sidste time';
      }

      const mostRecentSync = mailboxes
        .map(m => m.last_sync_at)
        .filter(Boolean)
        .sort()
        .pop();

      setSyncStatus({
        isHealthy,
        lastSyncAt: mostRecentSync || null,
        errorCount: failedLogs.length,
        warningMessage
      });

    } catch (error) {
      console.error('Failed to check sync health:', error);
      setSyncStatus(prev => ({
        ...prev,
        isHealthy: false,
        warningMessage: 'Kunne ikke tjekke sync status'
      }));
    }
  };

  useEffect(() => {
    checkSyncHealth();
    
    // Check every 2 minutes
    const interval = setInterval(checkSyncHealth, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    syncStatus,
    refreshStatus: checkSyncHealth
  };
};
