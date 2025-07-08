import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemHealthDashboard } from './SystemHealthDashboard';
import { ReliableEmailSyncMonitor } from './ReliableEmailSyncMonitor';
import { TicketOverview } from './TicketOverview';
import { useTickets } from '@/hooks/useTickets';
import { useRealtimeTicketNotifications } from '@/hooks/useRealtimeTicketNotifications';
import { Badge } from "@/components/ui/badge";
import { SupportTicket } from '@/hooks/useTickets';

interface EnhancedSupportDashboardProps {
  onTicketSelect: (ticket: SupportTicket) => void;
}

export const EnhancedSupportDashboard = ({ onTicketSelect }: EnhancedSupportDashboardProps) => {
  const { data: tickets = [], isLoading } = useTickets();
  const { hasNewReplies, newReplyCount } = useRealtimeTicketNotifications();

  const newRepliesCount = tickets.filter(t => t.status === 'Nyt svar').length;
  const highPriorityCount = tickets.filter(t => t.priority === 'Høj').length;
  const openTicketsCount = tickets.filter(t => t.status !== 'Lukket' && t.status !== 'Løst').length;

  return (
    <div className="h-full">
      <Tabs defaultValue="tickets" className="h-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets" className="relative">
            Tickets
            {newRepliesCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse">
                {newRepliesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="system">
            System
          </TabsTrigger>
          <TabsTrigger value="email-sync">
            Email Sync
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            Overvågning
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="h-full mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{openTicketsCount}</div>
              <div className="text-sm text-muted-foreground">Åbne Tickets</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-orange-600">{newRepliesCount}</div>
              <div className="text-sm text-muted-foreground">Nye Svar</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{highPriorityCount}</div>
              <div className="text-sm text-muted-foreground">Høj Prioritet</div>
            </div>
            <div className="text-center p-4 bg-background rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{tickets.length}</div>
              <div className="text-sm text-muted-foreground">Total Tickets</div>
            </div>
          </div>
          
          <TicketOverview tickets={tickets} onTicketSelect={onTicketSelect} />
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <SystemHealthDashboard />
        </TabsContent>

        <TabsContent value="email-sync" className="mt-4">
          <ReliableEmailSyncMonitor />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-4">
          <div className="grid gap-6">
            <SystemHealthDashboard />
            <ReliableEmailSyncMonitor />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};