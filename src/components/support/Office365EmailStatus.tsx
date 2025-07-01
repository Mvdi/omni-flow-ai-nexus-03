
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Mail, Clock, CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';
import { ManualEmailSync } from './ManualEmailSync';

interface EmailSyncLog {
  id: string;
  mailbox_address: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  emails_processed: number;
  errors_count: number;
  error_details: string | null;
  status: string;
}

interface MonitoredMailbox {
  id: string;
  email_address: string;
  is_active: boolean;
  last_sync_at: string | null;
}

export const Office365EmailStatus = () => {
  const [syncLogs, setSyncLogs] = useState<EmailSyncLog[]>([]);
  const [mailboxes, setMailboxes] = useState<MonitoredMailbox[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Hent seneste sync logs
      const { data: logs, error: logsError } = await supabase
        .from('email_sync_log')
        .select('*')
        .order('sync_started_at', { ascending: false })
        .limit(20);

      if (logsError) {
        console.error('Failed to fetch sync logs:', logsError);
      } else {
        setSyncLogs(logs || []);
      }

      // Hent monitored mailboxes
      const { data: boxes, error: boxesError } = await supabase
        .from('monitored_mailboxes')
        .select('*')
        .order('email_address');

      if (boxesError) {
        console.error('Failed to fetch mailboxes:', boxesError);
      } else {
        setMailboxes(boxes || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    setLastSyncResult(null);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('Du skal være logget ind');
      }

      console.log('Triggering enhanced email sync with intelligent catch-up...');
      
      const { data, error } = await supabase.functions.invoke('office365-email-sync', {
        body: { source: 'manual', debug: true },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      setLastSyncResult(data);
      
      toast({
        title: 'Email sync completed',
        description: `Processed ${data.processed} emails, ${data.caughtUp} caught-up. ${data.errors} errors.`,
        variant: data.errors > 0 ? 'destructive' : 'default',
      });

      // Opdater data efter 3 sekunder for at se nye tickets
      setTimeout(fetchData, 3000);
    } catch (error: any) {
      console.error('Failed to trigger sync:', error);
      toast({
        title: 'Sync fejl',
        description: error.message || 'Kunne ikke starte email sync',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh hver 30 sekunder
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-yellow-600" />;
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
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeSinceLastSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Aldrig';
    
    const lastSync = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}t ${diffMins}m siden`;
    } else {
      return `${diffMins}m siden`;
    }
  };

  const getSyncHealthStatus = () => {
    const recentLogs = syncLogs.filter(log => 
      new Date(log.sync_started_at).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
    );
    
    const failedRecent = recentLogs.filter(log => log.status === 'failed');
    const runningLong = recentLogs.filter(log => 
      log.status === 'running' && 
      new Date(log.sync_started_at).getTime() < Date.now() - 10 * 60 * 1000 // Running for more than 10 min
    );

    if (failedRecent.length > 2) return { status: 'unhealthy', message: 'Flere sync fejl den sidste time' };
    if (runningLong.length > 0) return { status: 'warning', message: 'Sync kører usædvanligt længe' };
    if (recentLogs.length === 0) return { status: 'warning', message: 'Ingen sync aktivitet den sidste time' };
    
    return { status: 'healthy', message: 'Email sync kører normalt' };
  };

  const healthStatus = getSyncHealthStatus();

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      <Card className={`border-2 ${
        healthStatus.status === 'healthy' ? 'border-green-200 bg-green-50' :
        healthStatus.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${
            healthStatus.status === 'healthy' ? 'text-green-800' :
            healthStatus.status === 'warning' ? 'text-yellow-800' :
            'text-red-800'
          }`}>
            <Activity className="h-5 w-5" />
            Email Sync System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`${
            healthStatus.status === 'healthy' ? 'text-green-700' :
            healthStatus.status === 'warning' ? 'text-yellow-700' :
            'text-red-700'
          }`}>
            {healthStatus.message}
          </p>
          <div className="mt-2 text-sm text-gray-600">
            Sidste opdatering: {new Date().toLocaleTimeString('da-DK')}
          </div>
        </CardContent>
      </Card>

      {/* Manual Historical Sync */}
      <ManualEmailSync />

      {/* Last Sync Result */}
      {lastSyncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Seneste Sync Resultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <span className="font-medium">Processed:</span> {lastSyncResult.processed}
              </div>
              <div>
                <span className="font-medium">Merged:</span> {lastSyncResult.merged || 0}
              </div>
              <div>
                <span className="font-medium">Caught-up:</span> {lastSyncResult.caughtUp || 0}
              </div>
              <div>
                <span className="font-medium">Errors:</span> {lastSyncResult.errors}
              </div>
              <div>
                <span className="font-medium">Time:</span> {new Date(lastSyncResult.timestamp).toLocaleTimeString('da-DK')}
              </div>
            </div>
            {lastSyncResult.caughtUp > 0 && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <span className="text-blue-800 font-medium">🔄 Catch-up aktiv: </span>
                <span className="text-blue-700">Fandt {lastSyncResult.caughtUp} historiske emails</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monitored Mailboxes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Monitored Email Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {mailboxes.map((mailbox) => (
              <div key={mailbox.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{mailbox.email_address}</span>
                  <Badge variant={mailbox.is_active ? 'default' : 'secondary'}>
                    {mailbox.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    Sidste sync: {mailbox.last_sync_at 
                      ? new Date(mailbox.last_sync_at).toLocaleString('da-DK')
                      : 'Aldrig'
                    }
                  </div>
                  <div className="font-medium">
                    {getTimeSinceLastSync(mailbox.last_sync_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={triggerSync} disabled={syncing || loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Smart Email Sync'}
            </Button>
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Opdater Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Detaljeret Email Sync Aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              Ingen sync aktivitet endnu
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-medium">{log.mailbox_address}</div>
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
