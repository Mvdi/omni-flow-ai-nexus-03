
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SupportTicket } from '@/hooks/useTickets';
import { User, Mail, Phone, Calendar, Ticket, TrendingUp, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

interface CustomerInfoProps {
  ticket: SupportTicket;
}

export const CustomerInfo = ({ ticket }: CustomerInfoProps) => {
  const getCustomerInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Simuleret kunde data - i produktion ville dette komme fra database
  const customerData = {
    totalTickets: 3,
    resolvedTickets: 2,
    averageResponseTime: '4.2h',
    lastContact: ticket.created_at,
    customerType: 'Eksisterende kunde',
    priority: 'Standard',
    tags: ['Support', 'Bug Report'],
    notes: 'Kunde er generelt tilfreds men oplever tekniske problemer'
  };

  return (
    <div className="space-y-6">
      {/* Customer Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Kunde Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                {getCustomerInitials(ticket.customer_name, ticket.customer_email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{ticket.customer_name || 'Anonym kunde'}</h3>
              <p className="text-sm text-gray-600">{ticket.customer_email}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{ticket.customer_email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>
                Sidste kontakt: {formatDistanceToNow(new Date(customerData.lastContact), { 
                  addSuffix: true, 
                  locale: da 
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="secondary">{customerData.customerType}</Badge>
            <Badge variant="outline">{customerData.priority}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Customer Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Kunde Statistik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Totale tickets</span>
            <span className="font-semibold">{customerData.totalTickets}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Løste tickets</span>
            <span className="font-semibold text-green-600">{customerData.resolvedTickets}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Gns. responstid</span>
            <span className="font-semibold">{customerData.averageResponseTime}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Succes rate</span>
            <span className="font-semibold text-green-600">
              {Math.round((customerData.resolvedTickets / customerData.totalTickets) * 100)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {customerData.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Noter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">{customerData.notes}</p>
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Seneste Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="p-2 bg-gray-50 rounded text-sm">
              <div className="font-medium">Login problem</div>
              <div className="text-gray-600 text-xs">Løst - 2 dage siden</div>
            </div>
            <div className="p-2 bg-gray-50 rounded text-sm">
              <div className="font-medium">Password reset</div>
              <div className="text-gray-600 text-xs">Løst - 1 uge siden</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
