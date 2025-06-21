
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Filter, Search, MoreVertical } from 'lucide-react';

const Leads = () => {
  const kanbanColumns = [
    { id: 'new', title: 'Nye Leads', color: 'bg-blue-500', count: 12 },
    { id: 'contacted', title: 'Kontaktet', color: 'bg-yellow-500', count: 8 },
    { id: 'qualified', title: 'Kvalificeret', color: 'bg-orange-500', count: 5 },
    { id: 'proposal', title: 'Tilbud Sendt', color: 'bg-purple-500', count: 3 },
    { id: 'negotiation', title: 'Forhandling', color: 'bg-pink-500', count: 2 },
    { id: 'closed-won', title: 'Lukket - Vundet', color: 'bg-green-500', count: 15 },
    { id: 'closed-lost', title: 'Lukket - Tabt', color: 'bg-gray-500', count: 7 },
  ];

  const sampleLeads = [
    { id: 1, name: 'Jens Hansen', company: 'Hansen & Co', value: '25.000 kr', priority: 'Høj', lastContact: '2 timer siden' },
    { id: 2, name: 'Maria Nielsen', company: 'Nielsen Solutions', value: '45.000 kr', priority: 'Medium', lastContact: '1 dag siden' },
    { id: 3, name: 'Lars Andersen', company: 'Andersen Industries', value: '80.000 kr', priority: 'Høj', lastContact: '3 timer siden' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <Users className="h-7 w-7 text-blue-600" />
              CRM - Leads Management
            </h1>
            <p className="text-gray-600">Administrer dine leads gennem hele salgsprocessen</p>
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
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nyt Lead
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 mb-6">
          {kanbanColumns.map((column) => (
            <Card key={column.id} className="shadow-sm border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <CardTitle className="text-sm font-medium text-gray-900">
                      {column.title}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {column.count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {column.id === 'new' && sampleLeads.map((lead) => (
                  <div key={lead.id} className="p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900">{lead.name}</h4>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{lead.company}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">{lead.value}</span>
                      <Badge 
                        variant={lead.priority === 'Høj' ? 'destructive' : 'secondary'} 
                        className="text-xs"
                      >
                        {lead.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{lead.lastContact}</p>
                  </div>
                ))}
                {column.id !== 'new' && (
                  <div className="p-6 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-sm">Træk leads hertil</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Insights */}
        <Card className="shadow-sm border-0 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              AI Anbefalinger
            </CardTitle>
            <CardDescription>
              Automatiske indsigter til optimering af din salgsproces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Prioritér Kontakt</h4>
                <p className="text-xs text-gray-600">3 leads har været i "Kontaktet" fase i over 5 dage</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Opfølgning Påkrævet</h4>
                <p className="text-xs text-gray-600">5 leads venter på tilbud i mere end 3 dage</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Potentiel Revenue</h4>
                <p className="text-xs text-gray-600">Estimeret månedlig closing: 425.000 kr</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Leads;
