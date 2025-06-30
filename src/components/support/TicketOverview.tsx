
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportTicket } from '@/hooks/useTickets';
import { Clock, User, AlertTriangle, Bell, Zap } from 'lucide-react';
import { formatDanishDistance, formatDanishDateTime } from '@/utils/danishTime';

interface TicketOverviewProps {
  tickets: SupportTicket[];
  onTicketSelect: (ticket: SupportTicket) => void;
}

export const TicketOverview = ({ tickets, onTicketSelect }: TicketOverviewProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Nyt svar': return 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
      case 'Åben': return 'bg-red-100 text-red-800 border-red-200';
      case 'I gang': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Afventer kunde': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Løst': return 'bg-green-100 text-green-800 border-green-200';
      case 'Lukket': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case 'Høj': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Lav': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string | null) => {
    if (priority === 'Høj') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getSLAStatus = (ticket: SupportTicket) => {
    if (!ticket.sla_deadline) return null;
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'expired';
    if (hoursLeft < 2) return 'critical';
    if (hoursLeft < 4) return 'warning';
    return 'good';
  };

  // Sort tickets: "Nyt svar" first, then by priority, then by created date
  const sortedTickets = tickets
    .filter(ticket => ticket.status !== 'Lukket')
    .sort((a, b) => {
      // "Nyt svar" always comes first
      if (a.status === 'Nyt svar' && b.status !== 'Nyt svar') return -1;
      if (b.status === 'Nyt svar' && a.status !== 'Nyt svar') return 1;
      
      // Then by priority
      const priorityOrder = { 'Høj': 3, 'Medium': 2, 'Lav': 1, null: 0 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Finally by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-600" />
          Smart Ticket Oversigt
          {tickets.filter(t => t.status === 'Nyt svar').length > 0 && (
            <Badge className="bg-orange-500 text-white animate-bounce">
              {tickets.filter(t => t.status === 'Nyt svar').length} nye svar
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          <div className="divide-y">
            {sortedTickets.map((ticket) => {
              const slaStatus = getSLAStatus(ticket);
              return (
                <div
                  key={ticket.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    ticket.status === 'Nyt svar' ? 'bg-orange-50 border-l-4 border-orange-400' : ''
                  } ${
                    slaStatus === 'expired' ? 'border-r-4 border-red-500' :
                    slaStatus === 'critical' ? 'border-r-4 border-red-400' :
                    slaStatus === 'warning' ? 'border-r-4 border-yellow-400' : ''
                  }`}
                  onClick={() => onTicketSelect(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {ticket.status === 'Nyt svar' && (
                          <Bell className="h-4 w-4 text-orange-600 animate-bounce" />
                        )}
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {ticket.ticket_number}
                        </span>
                        {getPriorityIcon(ticket.priority)}
                        {ticket.priority && (
                          <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                            {ticket.priority}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </Badge>
                        {ticket.category && (
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                            {ticket.category}
                          </Badge>
                        )}
                        {slaStatus === 'expired' && (
                          <Badge variant="destructive" className="text-xs">
                            SLA BRUDT
                          </Badge>
                        )}
                        {slaStatus === 'critical' && (
                          <Badge variant="destructive" className="text-xs">
                            KRITISK
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
                        {ticket.subject}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">
                            {ticket.customer_name || ticket.customer_email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDanishDistance(ticket.created_at)}
                          </span>
                        </div>
                        {ticket.assignee_name && (
                          <span className="text-blue-600 font-medium">
                            Tildelt: {ticket.assignee_name}
                          </span>
                        )}
                      </div>

                      {ticket.last_response_at && (
                        <div className="text-sm text-green-600 mb-2">
                          Sidst: {formatDanishDistance(ticket.last_response_at)}
                        </div>
                      )}

                      {ticket.sla_deadline && (
                        <div className={`text-sm font-medium ${
                          slaStatus === 'expired' ? 'text-red-600' :
                          slaStatus === 'critical' ? 'text-red-500' :
                          slaStatus === 'warning' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          SLA: {formatDanishDateTime(ticket.sla_deadline)}
                        </div>
                      )}

                      {ticket.content && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {ticket.content}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
