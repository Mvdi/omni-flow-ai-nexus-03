
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SyncHealth {
  current_status: string;
  last_sync_at: string;
  consecutive_failures: number;
  minutes_since_last_sync: number;
}

interface SyncMetrics {
  isHealthy: boolean;
  lastSyncAt: string | null;
  consecutiveFailures: number;
  minutesSinceLastSync: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  warningMessage?: string;
}

export const useReliableEmailSync = () => {
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics>({
    isHealthy: true,
    lastSyncAt: null,
    consecutiveFailures: 0,
    minutesSinceLastSync: 0,
    healthStatus: 'healthy'
  });

  const [isLoading, setIsLoading] = useState(false);

  const checkSyncHealth = async () => {
    setIsLoading(true);
    try {
      // Enhanced query to get better sync health data
      const { data: healthData, error } = await supabase
        .from('email_sync_log')
        .select('status, sync_started_at, errors_count, emails_processed, error_details')
        .not('mailbox_address', 'in', '("SYSTEM_LOCK", "HEALTH_CHECK", "CRITICAL_ALERT", "DEAD_LETTER_QUEUE", "CLEANUP_DUPLICATES")')
        .order('sync_started_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Failed to check sync health:', error);
        setSyncMetrics(prev => ({
          ...prev,
          isHealthy: false,
          healthStatus: 'critical',
          warningMessage: 'Kunne ikke tjekke sync status'
        }));
        return;
      }

      if (healthData && healthData.length > 0) {
        const lastSync = healthData[0];
        const minutesSinceLastSync = Math.floor(
          (Date.now() - new Date(lastSync.sync_started_at).getTime()) / (1000 * 60)
        );
        
        // Get consecutive failures from recent logs
        const { data: recentLogs } = await supabase
          .from('email_sync_log')
          .select('status, error_details')
          .not('mailbox_address', 'in', '("SYSTEM_LOCK", "HEALTH_CHECK", "CRITICAL_ALERT", "DEAD_LETTER_QUEUE", "CLEANUP_DUPLICATES")')
          .order('sync_started_at', { ascending: false })
          .limit(10);

        let consecutiveFailures = 0;
        if (recentLogs) {
          for (const log of recentLogs) {
            if (log.status === 'failed') {
              consecutiveFailures++;
            } else {
              break;
            }
          }
        }
        
        let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
        let warningMessage = undefined;
        let isHealthy = true;

        // Enhanced health determination with duplicate detection
        if (consecutiveFailures >= 3) {
          healthStatus = 'critical';
          isHealthy = false;
          warningMessage = `🚨 KRITISK: ${consecutiveFailures} sync fejl i træk`;
        } else if (minutesSinceLastSync > 10) {
          healthStatus = 'critical';
          isHealthy = false;
          warningMessage = `🚨 KRITISK: Ingen sync i ${minutesSinceLastSync} minutter`;
        } else if (consecutiveFailures > 0) {
          healthStatus = 'warning';
          isHealthy = false;
          warningMessage = `⚠️ USTABIL: ${consecutiveFailures} fejl i træk`;
        } else if (minutesSinceLastSync > 5) {
          healthStatus = 'warning';
          warningMessage = `⚠️ FORSINKET: ${minutesSinceLastSync} minutter siden sidste sync`;
        } else {
          // Check for potential duplicate issues
          const errorLogs = recentLogs?.filter(log => 
            log.error_details?.toLowerCase().includes('duplicate') ||
            log.error_details?.toLowerCase().includes('duplikat')
          );
          
          if (errorLogs && errorLogs.length > 0) {
            healthStatus = 'warning';
            warningMessage = `⚠️ DUPLIKATER: Mulige duplikerede beskeder detekteret`;
          }
        }

        setSyncMetrics({
          isHealthy,
          lastSyncAt: lastSync.sync_started_at,
          consecutiveFailures,
          minutesSinceLastSync,
          healthStatus,
          warningMessage
        });
      }

    } catch (error) {
      console.error('Error checking sync health:', error);
      setSyncMetrics(prev => ({
        ...prev,
        isHealthy: false,
        healthStatus: 'critical',
        warningMessage: 'Systemfejl ved sundhedstjek'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const triggerBulletproofSync = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('Du skal være logget ind');
      }

      console.log('🚀 Triggering BULLETPROOF email sync with duplicate prevention...');

      const { data, error } = await supabase.functions.invoke('reliable-email-sync', {
        body: { 
          source: 'manual-trigger', 
          priority: 'high',
          preventDuplicates: true 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      console.log('✅ BULLETPROOF sync completed:', data);
      return data;
    } catch (error) {
      console.error('Failed to trigger bulletproof sync:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkSyncHealth();
    
    // Check health every 30 seconds for real-time monitoring
    const interval = setInterval(checkSyncHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    syncMetrics,
    isLoading,
    refreshHealth: checkSyncHealth,
    triggerBulletproofSync
  };
};
