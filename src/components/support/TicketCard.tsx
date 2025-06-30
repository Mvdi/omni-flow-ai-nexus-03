import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TicketCardProps {
  ticket: any;
  onTicketClick: (ticket: any) => void;
}

export const TicketCard = ({ ticket, onTicketClick }: TicketCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('da-DK', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Høj': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Lav': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Åben': return 'bg-blue-100 text-blue-800';
      case 'I gang': return 'bg-yellow-100 text-yellow-800';
      case 'Afventer kunde': return 'bg-orange-100 text-orange-800';
      case 'Løst': return 'bg-green-100 text-green-800';
      case 'Lukket': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500" 
      onClick={() => onTicketClick(ticket)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {ticket.ticket_number}
            </Badge>
            <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Only show priority badge if priority is actually set and not null/empty */}
            {ticket.priority && ticket.priority.trim() !== '' && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getPriorityColor(ticket.priority)}`}
              >
                {ticket.priority}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(ticket.created_at)}
            </span>
          </div>
        </div>
        <CardTitle className="text-base">{ticket.subject}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Kunde:</span>
            <span className="font-medium">{ticket.customer_name || ticket.customer_email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Email:</span>
            <span className="truncate max-w-48">{ticket.customer_email}</span>
          </div>
          {ticket.last_response_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sidste svar:</span>
              <span>{formatDate(ticket.last_response_at)} {formatTime(ticket.last_response_at)}</span>
            </div>
          )}
          {ticket.response_time_hours && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Svartid:</span>
              <span>{ticket.response_time_hours}h</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
