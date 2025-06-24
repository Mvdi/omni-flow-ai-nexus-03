import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketConversation } from '@/components/support/TicketConversation';
import { CustomerInfo } from '@/components/support/CustomerInfo';
import { TicketOverview } from '@/components/support/TicketOverview';
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';
import { SignatureSettings } from '@/components/support/SignatureSettings';
import { useTickets, SupportTicket } from '@/hooks/useTickets';
import { Ticket, Plus, Filter, Search, Mail, Clock, User, AlertTriangle, Bot, Inbox, Settings } from 'lucide-react';

const Support = () => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverview, setShowOverview] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('alle');

  const { data: tickets = [], isLoading } = useTickets();

  useEffect(() => {
    // Ved load: hvis ?ticket=... i URL, vælg det ticket
    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get('ticket');
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) setSelectedTicket(ticket);
    }
  }, [tickets]);

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

  // Filter tickets by tab
  const getTicketsByTab = (tab: string) => {
    switch (tab) {
      case 'aabne':
        return filteredTickets.filter(t => t.status === 'Åben');
      case 'i-gang':
        return filteredTickets.filter(t => t.status === 'I gang');
      case 'afventer':
        return filteredTickets.filter(t => t.status === 'Afventer kunde');
      case 'loest':
        return filteredTickets.filter(t => t.status === 'Løst');
      case 'lukket':
        return filteredTickets.filter(t => t.status === 'Lukket');
      default:
        // 'alle' tab: show only open, in progress, or awaiting
        return filteredTickets.filter(t => t.status === 'Åben' || t.status === 'I gang' || t.status === 'Afventer kunde');
    }
  };

  // Count tickets for each tab
  const alleTicketsCount = filteredTickets.filter(t => t.status === 'Åben' || t.status === 'I gang' || t.status === 'Afventer kunde').length;
  const openTickets = filteredTickets.filter(t => t.status === 'Åben').length;
  const inProgressTickets = filteredTickets.filter(t => t.status === 'I gang').length;
  const awaitingTickets = filteredTickets.filter(t => t.status === 'Afventer kunde').length;
  const solvedToday = filteredTickets.filter(t => {
    const today = new Date().toDateString();
    return t.status === 'Løst' && new Date(t.updated_at).toDateString() === today;
  }).length;
  const closedTickets = filteredTickets.filter(t => t.status === 'Lukket').length;

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

  const handleTicketSelect = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
      // Opdater URL uden reload
      const params = new URLSearchParams(window.location.search);
      params.set('ticket', ticketId);
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-2">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(false)}
              className="flex items-center gap-2"
            >
              ← Tilbage til tickets
            </Button>
          </div>
          <SignatureSettings />
        </div>
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-2">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedTicket(null);
                // Fjern ticket-param fra URL
                const params = new URLSearchParams(window.location.search);
                params.delete('ticket');
                window.history.pushState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
              }}
              className="flex items-center gap-2"
            >
              ← Tilbage til oversigt
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <CustomerInfo 
                ticket={selectedTicket} 
                onTicketSelect={handleTicketSelect}
                currentTicketId={selectedTicket.id}
              />
            </div>
            <div className="lg:col-span-2">
              <TicketConversation ticket={selectedTicket} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <Ticket className="h-7 w-7 text-orange-600" />
              Support Ticket System
            </h1>
            <p className="text-gray-600">Administrer og løs kundesupport tickets effektivt</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Indstillinger
          </Button>
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
                  <p className="text-sm font-medium text-gray-600">Afventer Kunde</p>
                  <p className="text-xl font-bold text-gray-900">{awaitingTickets}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Inbox className="h-5 w-5 text-blue-600" />
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
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-0 mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Ticket Oversigt</CardTitle>
              <CreateTicketDialog />
            </div>
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
            </div>
          </CardContent>
        </Card>

        {/* Ticket Tabs */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="alle">Alle ({alleTicketsCount})</TabsTrigger>
                <TabsTrigger value="aabne">Åbne ({openTickets})</TabsTrigger>
                <TabsTrigger value="i-gang">I Gang ({inProgressTickets})</TabsTrigger>
                <TabsTrigger value="afventer">Afventer ({awaitingTickets})</TabsTrigger>
                <TabsTrigger value="loest">Løst</TabsTrigger>
                <TabsTrigger value="lukket">Lukket</TabsTrigger>
              </TabsList>

              {['alle', 'aabne', 'i-gang', 'afventer', 'loest', 'lukket'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0">
                  {isLoading ? (
                    <div className="text-center py-6 text-gray-500">
                      Indlæser tickets...
                    </div>
                  ) : getTicketsByTab(tab).length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      Ingen tickets fundet
                    </div>
                  ) : (
                    <div className="divide-y">
                      {getTicketsByTab(tab).map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleTicketSelect(ticket.id)}
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
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;
