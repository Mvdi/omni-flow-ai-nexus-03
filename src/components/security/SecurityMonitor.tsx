import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high';
  details: any;
  created_at: string;
  resolved_at?: string;
  source: string;
}

export const SecurityMonitor = () => {
  const { data: securityEvents = [], isLoading } = useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SecurityEvent[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const unresolvedEvents = securityEvents.filter(event => !event.resolved_at);
  const highSeverityEvents = unresolvedEvents.filter(event => event.severity === 'high');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Security Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {securityEvents.filter(e => e.severity === 'low').length}
              </div>
              <div className="text-sm text-gray-600">Low Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {securityEvents.filter(e => e.severity === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">Medium Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {securityEvents.filter(e => e.severity === 'high').length}
              </div>
              <div className="text-sm text-gray-600">High Risk</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Priority Alerts */}
      {highSeverityEvents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You have {highSeverityEvents.length} unresolved high-severity security event(s) that require attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No security events recorded</p>
            ) : (
              securityEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 rounded-lg border ${getSeverityColor(event.severity)} ${
                    !event.resolved_at ? 'border-l-4' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(event.severity)}
                      <div>
                        <div className="font-medium">
                          {event.event_type.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div className="text-sm opacity-75">
                          {new Date(event.created_at).toLocaleString()}
                        </div>
                        {event.details && (
                          <div className="text-xs mt-1 opacity-60">
                            Source: {event.source}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getSeverityColor(event.severity)}>
                        {event.severity}
                      </Badge>
                      {event.resolved_at && (
                        <Badge variant="outline" className="text-green-600 bg-green-50">
                          Resolved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};