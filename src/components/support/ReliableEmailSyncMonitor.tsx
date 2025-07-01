import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDuplicateCleanup } from '@/hooks/useDuplicateCleanup';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Zap,
  Heart,
  Trash2
} from 'lucide-react';

interface SyncHealth {
  current_status: string;
  last_sync_at: string;
  consecutive_failures: number;
  minutes_since_last_sync: number;
}

interface SyncLog {
  id: string;
  mailbox_address: string;
  status: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  emails_processed: number;
  errors_count: number;
  error_details: string | null;
}

export const ReliableEmailSyncMonitor = () => {
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null);
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();
  const { cleanupDuplicateMessages, isCleaningUp } = useDuplicateCleanup();

  const fetchSyncHealth = async () => {
    try {
      // Fetch recent logs to calculate health
      const { data: logsData, error: logsError } = await supabase
        .from('email_sync_log')
        .select('*')
        .not('mailbox_address', 'in', '("SYSTEM_LOCK")')
        .order('sync_started_at', { ascending: false })
        .limit(10);

      if (logsError) {
        console.error('Failed to fetch recent logs:', logsError);
      } else {
        const logs = logsData || [];
        setRecentLogs(logs);

        // Calculate health from logs
        if (logs.length > 0) {
          const lastLog = logs[0];
          const minutesSinceLastSync = Math.floor(
            (Date.now() - new Date(lastLog.sync_started_at).getTime()) / (1000 * 60)
          );

          // Count consecutive failures
          let consecutiveFailures = 0;
          for (const log of logs) {
            if (log.status === 'failed') {
              consecutiveFailures++;
            } else {
              break;
            }
          }

          setSyncHealth({
            current_status: lastLog.status,
            last_sync_at: lastLog.sync_started_at,
            consecutive_failures: consecutiveFailures,
            minutes_since_last_sync: minutesSinceLastSync
          });
        }
      }
    } catch (error) {
      console.error('Error fetching sync data:', error);
    }
  };

  const triggerBulletproofSync = async () => {
    setIsTesting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('Du skal være logget ind');
      }

      console.log('Triggering BULLETPROOF email sync...');
      
      const { data, error } = await supabase.functions.invoke('reliable-email-sync', {
        body: { source: 'manual-test', priority: 'high' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      console.log('BULLETPROOF sync completed:', data);
      
      toast({
        title: '🎯 BULLETPROOF Sync Completed',
        description: `Health: ${data.health} | Processed: ${data.processed} | Errors: ${data.errors}`,
        variant: data.health === 'healthy' ? 'default' : 'destructive',
      });

      // Refresh data after sync
      setTimeout(fetchSyncHealth, 2000);
    } catch (error: any) {
      console.error('Failed to trigger bulletproof sync:', error);
      toast({
        title: 'Sync fejl',
        description: error.message || 'Kunne ikke starte BULLETPROOF sync',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await fetchSyncHealth();
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSyncHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSyncHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = (health: string, consecutiveFailures: number) => {
    if (consecutiveFailures >= 3) {
      return <ShieldX className="h-6 w-6 text-red-600" />;
    } else if (consecutiveFailures > 0) {
      return <ShieldAlert className="h-6 w-6 text-yellow-600" />;
    } else {
      return <ShieldCheck className="h-6 w-6 text-green-600" />;
    }
  };

  const getHealthColor = (consecutiveFailures: number, minutesSinceLastSync: number) => {
    if (consecutiveFailures >= 3 || minutesSinceLastSync > 10) {
      return 'border-red-500 bg-red-50';
    } else if (consecutiveFailures > 0 || minutesSinceLastSync > 5) {
      return 'border-yellow-500 bg-yellow-50';
    } else {
      return 'border-green-500 bg-green-50';
    }
  };

  const getHealthMessage = (consecutiveFailures: number, minutesSinceLastSync: number) => {
    if (consecutiveFailures >= 3) {
      return '🚨 KRITISK: Email sync system er nede!';
    } else if (minutesSinceLastSync > 10) {
      return '⚠️ ADVARSEL: Ingen sync i over 10 minutter';
    } else if (consecutiveFailures > 0) {
      return '⚠️ ADVARSEL: Intermitterende sync fejl';
    } else if (minutesSinceLastSync > 5) {
      return '🟡 WATCH: Sync er forsinket';
    } else {
      return '✅ SUNDT: Email sync kører pålideligt';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <ShieldX className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Activity className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* BULLETPROOF System Health Status */}
      <Card className={`border-2 ${syncHealth ? getHealthColor(syncHealth.consecutive_failures, syncHealth.minutes_since_last_sync) : 'border-gray-200'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            BULLETPROOF Email Sync System
            {syncHealth && getHealthIcon('', syncHealth.consecutive_failures)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {syncHealth ? (
            <div className="space-y-4">
              <Alert className={syncHealth.consecutive_failures >= 3 ? 'border-red-500' : syncHealth.consecutive_failures > 0 ? 'border-yellow-500' : 'border-green-500'}>
                <Heart className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {getHealthMessage(syncHealth.consecutive_failures, syncHealth.minutes_since_last_sync)}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="font-bold text-lg">
                    <Badge className={getStatusColor(syncHealth.current_status)}>
                      {syncHealth.current_status}
                    </Badge>
                  </div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-sm text-gray-600">Sidste Sync</div>
                  <div className="font-bold text-lg">
                    {syncHealth.minutes_since_last_sync}m siden
                  </div>
                </div>

                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-sm text-gray-600">Fejl i træk</div>
                  <div className={`font-bold text-lg ${syncHealth.consecutive_failures > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {syncHealth.consecutive_failures}
                  </div>
                </div>

                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-sm text-gray-600">Sundhed</div>
                  <div className="font-bold text-lg">
                    {syncHealth.consecutive_failures >= 3 ? '🚨 KRITISK' : 
                     syncHealth.consecutive_failures > 0 ? '⚠️ USTABIL' : '✅ SUNDT'}
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center">
                Sidste opdatering: {new Date().toLocaleTimeString('da-DK')} | 
                Auto-refresh hver 30 sekunder
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Indlæser system status...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            BULLETPROOF Kontrol Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Email Sync Kontrol</h4>
              <div className="flex gap-2">
                <Button 
                  onClick={triggerBulletproofSync} 
                  disabled={isTesting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Shield className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'BULLETPROOF Sync kører...' : 'Kør BULLETPROOF Sync'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={refreshData} 
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Opdater Status
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Database Oprydning</h4>
              <Button 
                onClick={cleanupDuplicateMessages}
                disabled={isCleaningUp}
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className={`h-4 w-4 mr-2 ${isCleaningUp ? 'animate-spin' : ''}`} />
                {isCleaningUp ? 'Rydder op...' : 'Fjern Duplikerede Beskeder'}
              </Button>
              <p className="text-xs text-gray-500">
                Fjerner automatisk duplikerede ticket beskeder fra databasen
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sync Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Seneste Sync Aktivitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              Ingen sync aktivitet endnu
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-medium">
                        {log.mailbox_address === 'HEALTH_CHECK' ? '🔍 Health Check' :
                         log.mailbox_address === 'CRITICAL_ALERT' ? '🚨 Critical Alert' :
                         log.mailbox_address}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(log.sync_started_at).toLocaleString('da-DK')}
                        {log.sync_completed_at && (
                          <span> → {new Date(log.sync_completed_at).toLocaleString('da-DK')}</span>
                        )}
                      </div>
                      {log.error_details && (
                        <div className="text-sm text-red-600 mt-1 max-w-md truncate">
                          {log.error_details}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getStatusColor(log.status)}>
                      {log.status}
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">
                      📧 {log.emails_processed} • ❌ {log.errors_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
