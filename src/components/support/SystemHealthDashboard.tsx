import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  Database, 
  Mail, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Settings,
  Trash2
} from 'lucide-react';
import { useEmailSyncMonitoring } from '@/hooks/useEmailSyncMonitoring';
import { useTicketMessageEnsurer } from '@/hooks/useTicketMessageEnsurer';
import { useRealtimeTicketNotifications } from '@/hooks/useRealtimeTicketNotifications';
import { useDuplicateCleanup } from '@/hooks/useDuplicateCleanup';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemStats {
  totalTickets: number;
  newReplies: number;
  missingMessages: number;
  recentErrors: number;
  avgResponseTime: number;
  duplicateMessages: number;
}

export const SystemHealthDashboard = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { syncStatus, refreshStatus } = useEmailSyncMonitoring();
  const { ensureTicketMessages, isProcessing } = useTicketMessageEnsurer();
  const { hasNewReplies, newReplyCount, clearNewReplies } = useRealtimeTicketNotifications();
  const { cleanupDuplicateMessages, isCleaningUp } = useDuplicateCleanup();

  // System statistics
  const { data: systemStats, refetch: refetchStats } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async (): Promise<SystemStats> => {
      // Get total tickets
      const { count: totalTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true });

      // Get new replies count  
      const { count: newReplies } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Nyt svar');

      // Check for tickets missing messages
      const { data: ticketsWithoutMessages } = await supabase
        .from('support_tickets')
        .select('id')
        .not('id', 'in', 
          `(SELECT DISTINCT ticket_id FROM ticket_messages WHERE ticket_id IS NOT NULL)`
        );

      // Get recent sync errors
      const { count: recentErrors } = await supabase
        .from('email_sync_log')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('sync_started_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      // Calculate average response time (simplified)
      const { data: responseTimeData } = await supabase
        .from('support_tickets')
        .select('response_time_hours')
        .not('response_time_hours', 'is', null)
        .limit(100);

      const avgResponseTime = responseTimeData && responseTimeData.length > 0
        ? responseTimeData.reduce((sum, t) => sum + (t.response_time_hours || 0), 0) / responseTimeData.length
        : 0;

      return {
        totalTickets: totalTickets || 0,
        newReplies: newReplies || 0,
        missingMessages: ticketsWithoutMessages?.length || 0,
        recentErrors: recentErrors || 0,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        duplicateMessages: 0 // This would require a complex query
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshStatus(),
        refetchStats()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getHealthScore = () => {
    if (!systemStats || !syncStatus) return 0;
    
    let score = 100;
    
    // Deduct for sync issues
    if (!syncStatus.isHealthy) score -= 30;
    if (syncStatus.errorCount > 0) score -= (syncStatus.errorCount * 10);
    
    // Deduct for missing messages
    if (systemStats.missingMessages > 0) score -= (systemStats.missingMessages * 5);
    
    // Deduct for high response time
    if (systemStats.avgResponseTime > 24) score -= 20;
    else if (systemStats.avgResponseTime > 12) score -= 10;
    
    return Math.max(score, 0);
  };

  const healthScore = getHealthScore();

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 90) return <CheckCircle2 className="h-6 w-6 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
    return <Shield className="h-6 w-6 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getHealthIcon(healthScore)}
              System Sundhed Dashboard
            </div>
            <div className="flex items-center gap-2">
              {hasNewReplies && (
                <Badge variant="destructive" className="animate-pulse">
                  {newReplyCount} nye svar
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Opdater
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Health Score */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getHealthColor(healthScore)}`}>
                {healthScore}%
              </div>
              <div className="text-sm text-muted-foreground">System Sundhed Score</div>
              <Progress value={healthScore} className="mt-2" />
            </div>

            <Separator />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-background rounded-lg border">
                <Database className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                <div className="text-lg font-bold">{systemStats?.totalTickets || 0}</div>
                <div className="text-xs text-muted-foreground">Total Tickets</div>
              </div>

              <div className="text-center p-3 bg-background rounded-lg border">
                <Mail className="h-5 w-5 mx-auto mb-2 text-orange-600" />
                <div className="text-lg font-bold">{systemStats?.newReplies || 0}</div>
                <div className="text-xs text-muted-foreground">Nye Svar</div>
              </div>

              <div className="text-center p-3 bg-background rounded-lg border">
                <Clock className="h-5 w-5 mx-auto mb-2 text-green-600" />
                <div className="text-lg font-bold">{systemStats?.avgResponseTime || 0}h</div>
                <div className="text-xs text-muted-foreground">Gns. Svartid</div>
              </div>

              <div className="text-center p-3 bg-background rounded-lg border">
                <Activity className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                <div className="text-lg font-bold">{syncStatus?.errorCount || 0}</div>
                <div className="text-xs text-muted-foreground">Sync Fejl</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Vedligeholdelse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Data Integrity */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Data Integritet</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Manglende Ticket Beskeder</div>
                    <div className="text-xs text-muted-foreground">
                      {systemStats?.missingMessages || 0} tickets mangler beskeder
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={ensureTicketMessages}
                    disabled={isProcessing}
                  >
                    <Database className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
                    {isProcessing ? 'Opretter...' : 'Ret'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Duplikerede Beskeder</div>
                    <div className="text-xs text-muted-foreground">
                      Ryd op i duplikerede ticket beskeder
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cleanupDuplicateMessages}
                    disabled={isCleaningUp}
                  >
                    <Trash2 className={`h-4 w-4 mr-2 ${isCleaningUp ? 'animate-spin' : ''}`} />
                    {isCleaningUp ? 'Rydder...' : 'Ryd op'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Real-time Status */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Real-time Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Email Sync</div>
                    <div className="text-xs text-muted-foreground">
                      {syncStatus?.isHealthy ? '✅ Fungerer korrekt' : '❌ Problemer detekteret'}
                    </div>
                  </div>
                  <Badge variant={syncStatus?.isHealthy ? 'default' : 'destructive'}>
                    {syncStatus?.isHealthy ? 'Aktiv' : 'Fejl'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Notifikationer</div>
                    <div className="text-xs text-muted-foreground">
                      Real-time kunde svar notifikationer
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasNewReplies && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearNewReplies}
                      >
                        Ryd ({newReplyCount})
                      </Button>
                    )}
                    <Badge variant="default">Aktiv</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Alerts */}
      {(systemStats?.missingMessages || 0) > 0 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <div className="font-medium text-orange-800">
                  Data Integritets Problem
                </div>
                <div className="text-sm text-orange-700">
                  {systemStats.missingMessages} tickets mangler tilsvarende beskeder. Dette kan påvirke konversationshistorik.
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={ensureTicketMessages}
                disabled={isProcessing}
                className="ml-auto"
              >
                Ret Nu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};