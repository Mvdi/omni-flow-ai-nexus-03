
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Mail, Clock, CheckCircle, XCircle } from 'lucide-react';

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
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Hent seneste sync logs
      const { data: logs, error: logsError } = await supabase
        .from('email_sync_log')
        .select('*')
        .order('sync_started_at', { ascending: false })
        .limit(10);

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
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('Du skal være logget ind');
      }

      console.log('Triggering manual email sync...');
      
      const { data, error } = await supabase.functions.invoke('office365-email-sync', {
        body: { source: 'manual' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Email sync startet',
        description: `Processing ${data.mailboxes} mailboxes...`,
      });

      // Opdater data efter 2 sekunder
      setTimeout(fetchData, 2000);
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

  return (
    <div className="space-y-6">
      {/* Monitored Mailboxes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Monitored Email Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {mailboxes.map((mailbox) => (
              <div key={mailbox.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{mailbox.email_address}</span>
                  <Badge variant={mailbox.is_active ? 'default' : 'secondary'}>
                    {mailbox.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Sidste sync: {mailbox.last_sync_at 
                    ? new Date(mailbox.last_sync_at).toLocaleString('da-DK')
                    : 'Aldrig'
                  }
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={triggerSync} disabled={syncing || loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Manuel Sync'}
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
          <CardTitle>Seneste Email Sync Aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              Ingen sync aktivitet endnu
            </div>
          ) : (
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="font-medium">{log.mailbox_address}</div>
                      <div className="text-sm text-gray-600">
                        Startet: {new Date(log.sync_started_at).toLocaleString('da-DK')}
                        {log.sync_completed_at && (
                          <span> • Færdig: {new Date(log.sync_completed_at).toLocaleString('da-DK')}</span>
                        )}
                      </div>
                      {log.error_details && (
                        <div className="text-sm text-red-600 mt-1">
                          Fejl: {log.error_details}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge className={getStatusColor(log.status)}>
                      {log.status}
                    </Badge>
                    <div className="text-sm text-gray-600 mt-1">
                      {log.emails_processed} emails • {log.errors_count} fejl
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
