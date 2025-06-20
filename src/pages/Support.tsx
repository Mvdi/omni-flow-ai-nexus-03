
import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketCard } from '@/components/support/TicketCard';
import { TicketConversation } from '@/components/support/TicketConversation';
import { useTickets, SupportTicket } from '@/hooks/useTickets';
import { Ticket, Plus, Filter, Search, Mail, Clock, User, AlertTriangle, Bot, Inbox } from 'lucide-react';

const Support = () => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Ticket className="h-8 w-8 text-orange-600" />
              Support Ticket System
            </h1>
            <p className="text-gray-600">Administrer og løs kundesupport tickets effektivt</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Åbne Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{openTickets}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">I Gang</p>
                  <p className="text-2xl font-bold text-gray-900">{inProgressTickets}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Løst i dag</p>
                  <p className="text-2xl font-bold text-gray-900">{solvedToday}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Ticket className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gns. Responstid</p>
                  <p className="text-2xl font-bold text-gray-900">2.4h</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px]">
          {/* Ticket List */}
          <div className="lg:col-span-4 flex flex-col">
            <Card className="shadow-lg border-0 mb-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Tickets</CardTitle>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Ny
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Søg tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="flex-1">
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
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Prioritet" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle prioriteter</SelectItem>
                        <SelectItem value="Høj">Høj</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Lav">Lav</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 flex-1 flex flex-col">
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full overflow-y-auto p-4 space-y-3">
                  {isLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      Indlæser tickets...
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Ingen tickets fundet
                    </div>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        isSelected={selectedTicket?.id === ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Conversation */}
          <div className="lg:col-span-8">
            {selectedTicket ? (
              <TicketConversation ticket={selectedTicket} />
            ) : (
              <Card className="shadow-lg border-0 h-full">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Inbox className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Vælg en ticket
                    </h3>
                    <p className="text-gray-600">
                      Vælg en ticket fra listen for at se konversationen
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Email Integration Plan */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-orange-50 to-red-50 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-orange-600" />
              Email Integration Plan
            </CardTitle>
            <CardDescription>
              Næste skridt: Automatisk import af emails til ticket systemet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Email Webhook</h4>
                <p className="text-xs text-gray-600">Setup webhook til at modtage emails og konvertere til tickets</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">IMAP Integration</h4>
                <p className="text-xs text-gray-600">Forbind til din email server for automatisk ticket oprettelse</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">AI Email Parser</h4>
                <p className="text-xs text-gray-600">Intelligent parsing af emails for automatisk kategorisering</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;
