
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDanishDate, formatDanishDateTime } from '@/utils/danishTime';
import { useTicketTags } from '@/hooks/useTicketTags';
import { Tag } from 'lucide-react';

interface TicketCardProps {
  ticket: any;
  onTicketClick: (ticket: any) => void;
}

export const TicketCard = ({ ticket, onTicketClick }: TicketCardProps) => {
  const { data: tags = [] } = useTicketTags(ticket.id);
  
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
      case 'Nyt svar': return 'bg-orange-100 text-orange-800 animate-pulse border-orange-300';
      case 'Åben': return 'bg-blue-100 text-blue-800';
      case 'I gang': return 'bg-yellow-100 text-yellow-800';
      case 'Afventer kunde': return 'bg-orange-100 text-orange-800';
      case 'Løst': return 'bg-green-100 text-green-800';
      case 'Lukket': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSLAStatus = () => {
    if (!ticket.sla_deadline) return null;
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 0) return 'expired';
    if (hoursLeft < 2) return 'critical';
    if (hoursLeft < 4) return 'warning';
    return 'good';
  };

  const slaStatus = getSLAStatus();

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${
        ticket.status === 'Nyt svar' ? 'border-l-orange-500 bg-orange-50' : 
        slaStatus === 'expired' ? 'border-l-red-500 bg-red-50' :
        slaStatus === 'critical' ? 'border-l-red-400 bg-red-50' :
        'border-l-blue-500'
      }`}
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
          <div className="flex items-center gap-2">
            {ticket.priority && ticket.priority.trim() !== '' && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getPriorityColor(ticket.priority)}`}
              >
                {ticket.priority}
              </Badge>
            )}
            {ticket.category && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                {ticket.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDanishDate(ticket.created_at)}
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
          {ticket.assignee_name && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tildelt:</span>
              <span className="text-blue-600 font-medium">{ticket.assignee_name}</span>
            </div>
          )}
          {ticket.last_response_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sidste svar:</span>
              <span className="text-green-600">{formatDanishDateTime(ticket.last_response_at)}</span>
            </div>
          )}
          {ticket.sla_deadline && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SLA deadline:</span>
              <span className={`font-medium ${
                slaStatus === 'expired' ? 'text-red-600' :
                slaStatus === 'critical' ? 'text-red-500' :
                slaStatus === 'warning' ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {formatDanishDateTime(ticket.sla_deadline)}
              </span>
            </div>
          )}
          {ticket.response_time_hours && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Svartid:</span>
              <span>{Math.round(ticket.response_time_hours)}h</span>
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex items-start justify-between text-sm mt-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Tags:
              </span>
              <div className="flex flex-wrap gap-1 max-w-32">
                {tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.tag_name}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
