
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
      // Use the new bulletproof health check function
      const { data: healthData, error } = await supabase
        .rpc('check_email_sync_health');

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
        const health: SyncHealth = healthData[0];
        
        let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
        let warningMessage = undefined;
        let isHealthy = true;

        // Determine health status based on bulletproof criteria
        if (health.consecutive_failures >= 3) {
          healthStatus = 'critical';
          isHealthy = false;
          warningMessage = `🚨 KRITISK: ${health.consecutive_failures} sync fejl i træk`;
        } else if (health.minutes_since_last_sync > 10) {
          healthStatus = 'critical';
          isHealthy = false;
          warningMessage = `🚨 KRITISK: Ingen sync i ${health.minutes_since_last_sync} minutter`;
        } else if (health.consecutive_failures > 0) {
          healthStatus = 'warning';
          isHealthy = false;
          warningMessage = `⚠️ USTABIL: ${health.consecutive_failures} fejl i træk`;
        } else if (health.minutes_since_last_sync > 5) {
          healthStatus = 'warning';
          warningMessage = `⚠️ FORSINKET: ${health.minutes_since_last_sync} minutter siden sidste sync`;
        }

        setSyncMetrics({
          isHealthy,
          lastSyncAt: health.last_sync_at,
          consecutiveFailures: health.consecutive_failures,
          minutesSinceLastSync: health.minutes_since_last_sync,
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

      const { data, error } = await supabase.functions.invoke('reliable-email-sync', {
        body: { source: 'manual-trigger', priority: 'high' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

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
