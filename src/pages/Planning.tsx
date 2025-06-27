
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyCalendar } from '@/components/planning/WeeklyCalendar';
import { EmployeeOverview } from '@/components/planning/EmployeeOverview';
import { Calendar, Users, Route, MapPin, Clock, Target, Zap, TrendingUp } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useRoutes } from '@/hooks/useRoutes';

const Planning = () => {
  const { orders } = useOrders();
  const { employees } = useEmployees();
  const { routes } = useRoutes();

  // Calculate metrics
  const thisWeekOrders = orders.filter(order => {
    const orderDate = new Date(order.scheduled_date || '');
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return orderDate >= weekStart && orderDate <= weekEnd;
  });

  const totalRevenue = thisWeekOrders.reduce((sum, order) => sum + order.price, 0);
  const totalDistance = routes.reduce((sum, route) => sum + (route.estimated_distance_km || 0), 0);
  const totalDuration = routes.reduce((sum, route) => sum + (route.estimated_duration_hours || 0), 0);
  const optimizedRoutes = routes.filter(route => route.ai_optimized).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              Intelligent Ruteplanlægning
            </h1>
            <p className="text-gray-600">AI-drevet optimering af ruter for maksimal effektivitet</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ugens Omsætning</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} kr</p>
                  <p className="text-xs text-green-600">+15% fra sidste uge</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Distance</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(totalDistance)} km</p>
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
                  <p className="text-2xl font-bold text-gray-900">{Math.round(totalDuration)}t</p>
                  <p className="text-xs text-green-600">-8% fra sidste uge</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">AI Optimeret</p>
                  <p className="text-2xl font-bold text-gray-900">{optimizedRoutes}</p>
                  <p className="text-xs text-blue-600">af {routes.length} ruter</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" />
              Kalender
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Users className="h-4 w-4 mr-2" />
              Medarbejdere
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analyse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <WeeklyCalendar />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeOverview />
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analyse</CardTitle>
                <CardDescription>Detaljeret analyse af ruteplanlægning og effektivitet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p>Analytics dashboard kommer snart...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* AI Optimization Insights */}
        <Card className="shadow-sm border-0 bg-gradient-to-r from-purple-50 to-blue-50 mt-6">
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
                <p className="text-xs text-gray-600">Kan spare 23 km ved at sammenlægge ruter i samme område</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Tidsoptimering</h4>
                <p className="text-xs text-gray-600">Skift starttidspunkt for at undgå rushtrafik (save 45 min)</p>
              </div>
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-gray-900 mb-2">Kapacitetsudnyttelse</h4>
                <p className="text-xs text-gray-600">Kan tilføje ekstra besøg uden at overskride arbejdstid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Planning;
