import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportTicket } from '@/hooks/useTickets';
import { Clock, User, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

interface TicketOverviewProps {
  tickets: SupportTicket[];
  onTicketSelect: (ticket: SupportTicket) => void;
}

export const TicketOverview = ({ tickets, onTicketSelect }: TicketOverviewProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Åben': return 'bg-red-100 text-red-800 border-red-200';
      case 'I gang': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Afventer kunde': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Løst': return 'bg-green-100 text-green-800 border-green-200';
      case 'Lukket': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Høj': return 'destructive';
      case 'Medium': return 'secondary';
      case 'Lav': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'Høj') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  // Only show tickets that are not closed
  const visibleTickets = tickets.filter(ticket => ticket.status !== 'Lukket');

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>Alle Tickets</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto">
          <div className="divide-y">
            {visibleTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onTicketSelect(ticket)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {ticket.ticket_number}
                      </span>
                      {getPriorityIcon(ticket.priority)}
                      <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                        {ticket.priority}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </Badge>
                    </div>
                    
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
                      {ticket.subject}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">
                          {ticket.customer_name || ticket.customer_email}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(ticket.created_at), { 
                            addSuffix: true, 
                            locale: da 
                          })}
                        </span>
                      </div>
                    </div>

                    {ticket.content && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {ticket.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
