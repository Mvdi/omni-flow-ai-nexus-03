
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Download, AlertTriangle } from 'lucide-react';

interface SyncResult {
  processed: number;
  merged: number;
  errors: number;
  caughtUp: number;
  details: string;
}

export const ManualEmailSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncHours, setSyncHours] = useState('24');
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const triggerHistoricalSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error('Du skal være logget ind');
      }

      console.log(`Triggering historical email sync for last ${syncHours} hours...`);
      
      // Create a temporary edge function call with custom sync window
      const { data, error } = await supabase.functions.invoke('office365-email-sync', {
        body: { 
          source: 'manual-historical', 
          syncHours: parseInt(syncHours),
          debug: true 
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      setSyncResult(data);
      
      toast({
        title: 'Historisk email sync fuldført',
        description: `Behandlet ${data.processed} emails, fundet ${data.caughtUp} historiske emails`,
        variant: data.errors > 0 ? 'destructive' : 'default',
      });

    } catch (error: any) {
      console.error('Failed to trigger historical sync:', error);
      toast({
        title: 'Sync fejl',
        description: error.message || 'Kunne ikke starte historisk email sync',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getSyncHoursLabel = (hours: string) => {
    switch (hours) {
      case '1': return '1 time (Standard)';
      case '4': return '4 timer (Catch-up)';
      case '12': return '12 timer (Udvidet)';
      case '24': return '24 timer (Fuld dag)';
      case '48': return '48 timer (2 dage)';
      case '72': return '72 timer (3 dage)';
      case '168': return '168 timer (1 uge)';
      default: return `${hours} timer`;
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Download className="h-5 w-5" />
          Manuel Historisk Email Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sync-hours">Sync Tidsvindue</Label>
            <Select value={syncHours} onValueChange={setSyncHours}>
              <SelectTrigger>
                <SelectValue placeholder="Vælg tidsvindue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 time (Standard)</SelectItem>
                <SelectItem value="4">4 timer (Normal catch-up)</SelectItem>
                <SelectItem value="12">12 timer (Udvidet catch-up)</SelectItem>
                <SelectItem value="24">24 timer (Fuld dag)</SelectItem>
                <SelectItem value="48">48 timer (2 dage)</SelectItem>
                <SelectItem value="72">72 timer (3 dage)</SelectItem>
                <SelectItem value="168">168 timer (1 uge)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-blue-600">
              Aktuelt valgt: {getSyncHoursLabel(syncHours)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Sync Handling</Label>
            <Button 
              onClick={triggerHistoricalSync} 
              disabled={syncing}
              className="w-full"
              size="lg"
            >
              <Clock className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synkroniserer...' : 'Start Historisk Sync'}
            </Button>
          </div>
        </div>

        {syncResult && (
          <div className="mt-4 p-4 bg-white rounded-lg border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Sync Resultat
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Nye tickets:</span> {syncResult.processed}
              </div>
              <div>
                <span className="font-medium">Sammenføjede:</span> {syncResult.merged}
              </div>
              <div>
                <span className="font-medium">Historiske:</span> {syncResult.caughtUp}
              </div>
              <div>
                <span className="font-medium">Fejl:</span> {syncResult.errors}
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{syncResult.details}</p>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Vigtigt:</p>
            <p>Historisk sync vil behandle alle emails fra det valgte tidsvindue. Dette kan tage tid og oprette mange tickets hvis der er mange emails.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
