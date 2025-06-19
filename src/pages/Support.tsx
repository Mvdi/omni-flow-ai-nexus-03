
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Plus, Filter, Search, Mail, Clock, User, AlertTriangle } from 'lucide-react';

const Support = () => {
  const tickets = [
    { 
      id: '#T-001', 
      subject: 'Problem med installation af software', 
      customer: 'Jens Hansen', 
      priority: 'Høj', 
      status: 'Åben', 
      assignee: 'Maria K.', 
      created: '2 timer siden',
      lastUpdate: '30 min siden'
    },
    { 
      id: '#T-002', 
      subject: 'Faktura spørgsmål - månedlig abonnement', 
      customer: 'Nielsen & Co', 
      priority: 'Medium', 
      status: 'I gang', 
      assignee: 'Lars P.', 
      created: '4 timer siden',
      lastUpdate: '1 time siden'
    },
    { 
      id: '#T-003', 
      subject: 'Anmodning om feature tilføjelse', 
      customer: 'Tech Solutions', 
      priority: 'Lav', 
      status: 'Afventer kunde', 
      assignee: 'Anna L.', 
      created: '1 dag siden',
      lastUpdate: '6 timer siden'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Åben': return 'bg-red-100 text-red-800';
      case 'I gang': return 'bg-yellow-100 text-yellow-800';
      case 'Afventer kunde': return 'bg-blue-100 text-blue-800';
      case 'Løst': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrér
            </Button>
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Søg
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Nyt Ticket
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Åbne Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">23</p>
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
                  <p className="text-2xl font-bold text-gray-900">15</p>
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
                  <p className="text-2xl font-bold text-gray-900">8</p>
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

        {/* Tickets List */}
        <Card className="shadow-lg border-0 mb-8">
          <CardHeader>
            <CardTitle>Aktive Tickets</CardTitle>
            <CardDescription>Oversigt over alle nuværende support tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-medium text-blue-600">{ticket.id}</span>
                      <Badge variant={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                      <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{ticket.assignee}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-2">{ticket.subject}</h3>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Kunde: {ticket.customer}</span>
                    <div className="flex items-center gap-4">
                      <span>Oprettet: {ticket.created}</span>
                      <span>Sidste opdatering: {ticket.lastUpdate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Support Assistant */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-orange-50 to-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              Support AI Assistant
            </CardTitle>
            <CardDescription>
              Intelligente anbefalinger til ticket håndtering og prioritering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Anbefalet Svar</h4>
                <p className="text-xs text-gray-600">AI har foreslået standardsvar til 5 tickets</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Prioritet Ændring</h4>
                <p className="text-xs text-gray-600">2 tickets bør opgraderes til høj prioritet</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Automatisk Kategorisering</h4>
                <p className="text-xs text-gray-600">8 nye tickets er automatisk kategoriseret</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;
