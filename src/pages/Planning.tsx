
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Route, MapPin, Clock, Users, Target, Zap } from 'lucide-react';

const Planning = () => {
  const currentWeek = [
    { day: 'Mandag', date: '19/6', routes: 3, distance: '145 km', efficiency: '92%' },
    { day: 'Tirsdag', date: '20/6', routes: 4, distance: '167 km', efficiency: '89%' },
    { day: 'Onsdag', date: '21/6', routes: 2, distance: '98 km', efficiency: '95%' },
    { day: 'Torsdag', date: '22/6', routes: 3, distance: '134 km', efficiency: '91%' },
    { day: 'Fredag', date: '23/6', routes: 5, distance: '189 km', efficiency: '87%' },
  ];

  const routes = [
    {
      id: 'R001',
      employee: 'Lars Hansen',
      area: 'København Nord',
      customers: 8,
      estimatedTime: '6.5 timer',
      distance: '67 km',
      revenue: '12.400 kr',
      status: 'Optimeret'
    },
    {
      id: 'R002',
      employee: 'Maria Nielsen',
      area: 'Frederiksberg',
      customers: 6,
      estimatedTime: '5.2 timer',
      distance: '45 km',
      revenue: '9.800 kr',
      status: 'I gang'
    },
    {
      id: 'R003',
      employee: 'Jens Andersen',
      area: 'Amager',
      customers: 10,
      estimatedTime: '7.8 timer',
      distance: '78 km',
      revenue: '15.600 kr',
      status: 'Planlagt'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <Calendar className="h-7 w-7 text-purple-600" />
              Intelligent Ruteplanlægning
            </h1>
            <p className="text-gray-600">AI-drevet optimering af ruter for maksimal effektivitet</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <MapPin className="h-4 w-4 mr-2" />
              Se Kort
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Zap className="h-4 w-4 mr-2" />
              Auto-Optimér
            </Button>
          </div>
        </div>

        {/* Week Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {currentWeek.map((day) => (
            <Card key={day.day} className="shadow-sm border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">{day.day}</CardTitle>
                <CardDescription className="text-sm text-gray-600">{day.date}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Ruter:</span>
                    <Badge variant="secondary">{day.routes}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Distance:</span>
                    <span className="text-sm font-medium">{day.distance}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Effektivitet:</span>
                    <span className="text-sm font-medium text-green-600">{day.efficiency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold text-gray-900">733 km</p>
                  <p className="text-xs text-green-600">-12% fra sidste uge</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Route className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Samlet Tid</p>
                  <p className="text-2xl font-bold text-gray-900">31.3h</p>
                  <p className="text-xs text-green-600">-8% fra sidste uge</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Kunder Besøgt</p>
                  <p className="text-2xl font-bold text-gray-900">187</p>
                  <p className="text-xs text-green-600">+5% fra sidste uge</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ugens Omsætning</p>
                  <p className="text-2xl font-bold text-gray-900">347.800 kr</p>
                  <p className="text-xs text-green-600">+15% fra sidste uge</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Routes */}
        <Card className="shadow-sm border-0 mb-6">
          <CardHeader>
            <CardTitle>Dagens Ruter</CardTitle>
            <CardDescription>Oversigt over optimerede ruter for i dag</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {routes.map((route) => (
                <div key={route.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-medium text-purple-600">{route.id}</span>
                      <Badge 
                        variant={
                          route.status === 'Optimeret' ? 'default' : 
                          route.status === 'I gang' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {route.status}
                      </Badge>
                    </div>
                    <span className="text-lg font-semibold text-green-600">{route.revenue}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Medarbejder</p>
                      <p className="font-medium">{route.employee}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Område</p>
                      <p className="font-medium">{route.area}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Kunder</p>
                      <p className="font-medium">{route.customers} besøg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estimeret tid</p>
                      <p className="font-medium">{route.estimatedTime}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-gray-600">
                    Distance: <span className="font-medium">{route.distance}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Optimization Insights */}
        <Card className="shadow-sm border-0 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              Optimerings Anbefalinger
            </CardTitle>
            <CardDescription>
              AI-baserede forslag til forbedring af ruteplanlægning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Rute Sammenlægning</h4>
                <p className="text-xs text-gray-600">Kan spare 23 km ved at sammenlægge rute R002 og R004</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Tidsoptimering</h4>
                <p className="text-xs text-gray-600">Skift starttidspunkt for at undgå rushtrafik (save 45 min)</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Kapacitetsudnyttelse</h4>
                <p className="text-xs text-gray-600">Kan tilføje 3 ekstra besøg på rute R001 uden at overskride tid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Planning;
