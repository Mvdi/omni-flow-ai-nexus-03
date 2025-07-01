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
import { CreateTicketDialog } from '@/components/support/CreateTicketDialog';
import { SignatureSettings } from '@/components/support/SignatureSettings';
import { useTickets, SupportTicket, useTicketAnalytics } from '@/hooks/useTickets';
import { useRouteMemory } from '@/hooks/useRouteMemory';
import { formatDanishTime, formatDanishDistance } from '@/utils/danishTime';
import { Ticket, Search, Settings, Zap, Clock, TrendingUp, AlertTriangle, CheckCircle, Bell, Users } from 'lucide-react';

// Helper function to format Danish date
const formatDanishDate = (dateString: string) => {
  return formatDanishTime(new Date(dateString), 'dd/MM/yyyy');
};

const Support = () => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('alle');

  const { data: tickets = [], isLoading } = useTickets();
  const { data: analytics } = useTicketAnalytics();

  useRouteMemory();

  useEffect(() => {
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

  const getTicketsByTab = (tab: string) => {
    switch (tab) {
      case 'nyt-svar':
        return filteredTickets.filter(t => t.status === 'Nyt svar').sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
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
      case 'sla-brudt':
        return filteredTickets.filter(t => {
          if (!t.sla_deadline) return false;
          return new Date(t.sla_deadline) < new Date() && t.status !== 'Løst' && t.status !== 'Lukket';
        });
      default:
        return filteredTickets.filter(t => 
          t.status === 'Nyt svar' || t.status === 'Åben' || t.status === 'I gang' || t.status === 'Afventer kunde'
        ).sort((a, b) => {
          // Prioritize "Nyt svar" tickets at the top
          if (a.status === 'Nyt svar' && b.status !== 'Nyt svar') return -1;
          if (b.status === 'Nyt svar' && a.status !== 'Nyt svar') return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    }
  };

  // Enhanced counters
  const nytSvarCount = filteredTickets.filter(t => t.status === 'Nyt svar').length;
  const alleTicketsCount = filteredTickets.filter(t => 
    t.status === 'Nyt svar' || t.status === 'Åben' || t.status === 'I gang' || t.status === 'Afventer kunde'
  ).length;
  const openTickets = filteredTickets.filter(t => t.status === 'Åben').length;
  const inProgressTickets = filteredTickets.filter(t => t.status === 'I gang').length;
  const awaitingTickets = filteredTickets.filter(t => t.status === 'Afventer kunde').length;
  const solvedToday = filteredTickets.filter(t => {
    const today = new Date().toDateString();
    return t.status === 'Løst' && new Date(t.updated_at).toDateString() === today;
  }).length;
  const closedTickets = filteredTickets.filter(t => t.status === 'Lukket').length;
  const slaBreaches = analytics?.slaBreaches || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Nyt svar':
        return 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse';
      case 'Åben':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'I gang':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Afventer kunde':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Løst':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Lukket':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleTicketSelect = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
      const params = new URLSearchParams(window.location.search);
      params.set('ticket', ticketId);
      window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
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

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-2">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={() => setShowSettings(false)} className="flex items-center gap-2">
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
            <Button variant="outline" onClick={() => {
              setSelectedTicket(null);
              const params = new URLSearchParams(window.location.search);
              params.delete('ticket');
              window.history.pushState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
            }} className="flex items-center gap-2">
              ← Tilbage til oversigt
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <CustomerInfo ticket={selectedTicket} onTicketSelect={handleTicketSelect} currentTicketId={selectedTicket.id} />
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
              Support System
              {nytSvarCount > 0 && (
                <Badge className="bg-orange-500 text-white animate-bounce">
                  {nytSvarCount} nye svar
                </Badge>
              )}
            </h1>
            <p className="text-gray-600">
              Klokken er nu {new Date().toLocaleString('da-DK', {
                timeZone: 'Europe/Copenhagen',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setShowSettings(true)} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Indstillinger
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nye Svar</p>
                  <p className="text-xl font-bold text-orange-600">{nytSvarCount}</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Bell className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Åbne</p>
                  <p className="text-xl font-bold text-red-600">{openTickets}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">I Gang</p>
                  <p className="text-xl font-bold text-yellow-600">{inProgressTickets}</p>
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
                  <p className="text-sm font-medium text-gray-600">Afventer</p>
                  <p className="text-xl font-bold text-blue-600">{awaitingTickets}</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Løst i dag</p>
                  <p className="text-xl font-bold text-green-600">{solvedToday}</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">SLA Brudt</p>
                  <p className="text-xl font-bold text-red-600">{slaBreaches}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
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
              <CreateTicketDialog isOpen={false} onClose={() => {}} />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                  placeholder="Søg tickets..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
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
              <TabsList className="grid w-full grid-cols-8 mb-4">
                <TabsTrigger value="alle">Alle ({alleTicketsCount})</TabsTrigger>
                <TabsTrigger value="nyt-svar" className="text-orange-600 font-bold">
                  🔔 Nye Svar ({nytSvarCount})
                </TabsTrigger>
                <TabsTrigger value="aabne">Åbne ({openTickets})</TabsTrigger>
                <TabsTrigger value="i-gang">I Gang ({inProgressTickets})</TabsTrigger>
                <TabsTrigger value="afventer">Afventer ({awaitingTickets})</TabsTrigger>
                <TabsTrigger value="sla-brudt" className="text-red-600">
                  ⚠️ SLA ({slaBreaches})
                </TabsTrigger>
                <TabsTrigger value="loest">Løst</TabsTrigger>
                <TabsTrigger value="lukket">Lukket</TabsTrigger>
              </TabsList>

              {['alle', 'nyt-svar', 'aabne', 'i-gang', 'afventer', 'sla-brudt', 'loest', 'lukket'].map(tab => (
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
                      {getTicketsByTab(tab).map(ticket => (
                        <div 
                          key={ticket.id} 
                          className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                            ticket.status === 'Nyt svar' ? 'bg-orange-50 border-l-4 border-orange-400' : ''
                          }`}
                          onClick={() => handleTicketSelect(ticket.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-medium text-blue-600">
                                  {ticket.ticket_number}
                                </span>
                                <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                                  {ticket.status}
                                </Badge>
                                {ticket.priority && (
                                  <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
                                    {ticket.priority}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 mb-1">
                                  {ticket.subject}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span>{ticket.customer_name || ticket.customer_email}</span>
                                  <span>•</span>
                                  <span>{formatDanishDate(ticket.created_at)}</span>
                                  {ticket.last_response_at && (
                                    <>
                                      <span>•</span>
                                      <span className="text-green-600">
                                        Sidst: {formatDanishDistance(ticket.last_response_at)}
                                      </span>
                                    </>
                                  )}
                                  {ticket.assignee_name && (
                                    <>
                                      <span>•</span>
                                      <span className="text-blue-600 font-medium">
                                        Tildelt: {ticket.assignee_name}
                                      </span>
                                    </>
                                  )}
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
