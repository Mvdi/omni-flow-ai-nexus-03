
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TicketConversation } from '@/components/support/TicketConversation';
import { TicketOverview } from '@/components/support/TicketOverview';
import { useTickets, SupportTicket } from '@/hooks/useTickets';
import { Ticket, Plus, Filter, Search, Mail, Clock, User, AlertTriangle, Bot, Inbox } from 'lucide-react';

const Support = () => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverview, setShowOverview] = useState(true);

  const { data: tickets = [], isLoading } = useTickets();

  const filteredTickets = tickets.filter(ticket => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesSearch = !searchQuery || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const openTickets = tickets.filter(t => t.status === 'Åben').length;
  const inProgressTickets = tickets.filter(t => t.status === 'I gang').length;
  const solvedToday = tickets.filter(t => {
    const today = new Date().toDateString();
    return t.status === 'Løst' && new Date(t.updated_at).toDateString() === today;
  }).length;

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

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedTicket(null)}
              className="flex items-center gap-2"
            >
              ← Tilbage til oversigt
            </Button>
          </div>
          <TicketConversation ticket={selectedTicket} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <Ticket className="h-7 w-7 text-orange-600" />
              Support Ticket System
            </h1>
            <p className="text-gray-600">Administrer og løs kundesupport tickets effektivt</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Åbne Tickets</p>
                  <p className="text-xl font-bold text-gray-900">{openTickets}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">I Gang</p>
                  <p className="text-xl font-bold text-gray-900">{inProgressTickets}</p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Løst i dag</p>
                  <p className="text-xl font-bold text-gray-900">{solvedToday}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gns. Responstid</p>
                  <p className="text-xl font-bold text-gray-900">2.4h</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-0 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ticket Oversigt</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Søg tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle status</SelectItem>
                  <SelectItem value="Åben">Åben</SelectItem>
                  <SelectItem value="I gang">I gang</SelectItem>
                  <SelectItem value="Afventer kunde">Afventer kunde</SelectItem>
                  <SelectItem value="Løst">Løst</SelectItem>
                  <SelectItem value="Lukket">Lukket</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Prioritet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle prioriteter</SelectItem>
                  <SelectItem value="Høj">Høj</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Lav">Lav</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" />
                Ny Ticket
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ticket List */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-6 text-gray-500">
                Indlæser tickets...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                Ingen tickets fundet
              </div>
            ) : (
              <div className="divide-y">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {ticket.ticket_number}
                          </span>
                          <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                            {ticket.priority}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 mb-1">
                            {ticket.subject}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>{ticket.customer_name || ticket.customer_email}</span>
                            <span>•</span>
                            <span>{new Date(ticket.created_at).toLocaleDateString('da-DK')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;
