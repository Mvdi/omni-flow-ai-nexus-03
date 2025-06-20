
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, User, Mail } from 'lucide-react';
import { SupportTicket } from '@/hooks/useTickets';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

interface TicketCardProps {
  ticket: SupportTicket;
  isSelected?: boolean;
  onClick: () => void;
}

export const TicketCard = ({ ticket, isSelected, onClick }: TicketCardProps) => {
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

  const getCustomerInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm">
                {getCustomerInitials(ticket.customer_name, ticket.customer_email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-medium text-blue-600">
                  {ticket.ticket_number}
                </span>
                <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                  {ticket.priority}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {ticket.customer_name || ticket.customer_email}
              </p>
            </div>
          </div>
          <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
            {ticket.status}
          </Badge>
        </div>
        
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
          {ticket.subject}
        </h3>
        
        {ticket.content && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {ticket.content}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(ticket.created_at), { 
                  addSuffix: true, 
                  locale: da 
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>{ticket.customer_email}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
