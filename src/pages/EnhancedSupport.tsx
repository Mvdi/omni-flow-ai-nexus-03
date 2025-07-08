import { useState, useEffect } from 'react';
import { SupportTicket, useTickets } from '@/hooks/useTickets';
import { TicketConversation } from '@/components/support/TicketConversation';
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';
import { EnhancedSupportDashboard } from '@/components/support/EnhancedSupportDashboard';
import { useRealtimeTicketNotifications } from '@/hooks/useRealtimeTicketNotifications';
import { useAdvancedTicketManagement } from '@/hooks/useAdvancedTicketManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Bell, Zap, ArrowLeft } from 'lucide-react';

const EnhancedSupport = () => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: tickets = [], isLoading } = useTickets();
  const { hasNewReplies, newReplyCount, clearNewReplies } = useRealtimeTicketNotifications();
  const { autoAssignTickets, setSLADeadlines, categorizeTickers, isProcessing } = useAdvancedTicketManagement();

  // Auto-select ticket from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('ticket');
    
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  }, [tickets]);

  const handleTicketSelect = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('ticket', ticket.id);
    window.history.pushState({}, '', url.toString());
    
    // Clear notifications if selecting a "Nyt svar" ticket
    if (ticket.status === 'Nyt svar' && hasNewReplies) {
      clearNewReplies();
    }
  };

  const handleBackToOverview = () => {
    setSelectedTicket(null);
    // Remove ticket parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('ticket');
    window.history.pushState({}, '', url.toString());
  };

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={handleBackToOverview}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbage til oversigt
            </Button>
            {hasNewReplies && newReplyCount > 1 && (
              <Badge variant="destructive" className="animate-pulse">
                {newReplyCount - 1} andre nye svar venter
              </Badge>
            )}
          </div>
          
          <TicketConversation ticket={selectedTicket} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Zap className="h-8 w-8 text-orange-600" />
                Enhanced Support Center
              </h1>
              <p className="text-gray-600">Administrer tickets, overvåg system sundhed og email sync</p>
            </div>
            {hasNewReplies && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-600 animate-bounce" />
                    <div>
                      <div className="font-medium text-orange-800">
                        {newReplyCount} nye kunde svar
                      </div>
                      <div className="text-sm text-orange-600">
                        Klik på en ticket for at se svaret
                      </div>
                    </div>
                    <Badge variant="destructive" className="animate-pulse ml-2">
                      Live
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={autoAssignTickets}
              disabled={isProcessing}
              size="sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              Auto-tildel
            </Button>
            <Button
              variant="outline"
              onClick={setSLADeadlines}
              disabled={isProcessing}
              size="sm"
            >
              SLA
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ny Ticket
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <EnhancedSupportDashboard onTicketSelect={handleTicketSelect} />
          </div>
          
          <div className="lg:col-span-2">
            <Card className="p-8 text-center h-full flex items-center justify-center">
              <div className="space-y-4">
                <div className="text-6xl">🎫</div>
                <h3 className="text-xl font-semibold text-gray-900">Vælg en ticket</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Klik på en ticket fra listen for at se detaljer og konversation. 
                  Systemet overvåger automatisk for nye kunde svar.
                </p>
                {hasNewReplies && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-800 font-medium">
                      ⚡ Du har {newReplyCount} nye kunde svar der venter på behandling!
                    </p>
                    <p className="text-sm text-orange-600 mt-1">
                      Tickets med nye svar vises med orange markering
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-800">📊 System Sundhed</div>
                    <div className="text-blue-600">Real-time overvågning</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="font-medium text-green-800">📧 Email Sync</div>
                    <div className="text-green-600">Automatisk sync hver 2 min</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="font-medium text-purple-800">🔔 Notifikationer</div>
                    <div className="text-purple-600">Live kunde svar</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="font-medium text-yellow-800">🎯 Auto-tildeling</div>
                    <div className="text-yellow-600">Smart medarbejder matching</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <CreateTicketDialog 
          isOpen={isCreateDialogOpen} 
          onClose={() => setIsCreateDialogOpen(false)}
        />
      </div>
    </div>
  );
};

export default EnhancedSupport;