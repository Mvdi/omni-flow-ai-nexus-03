
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Users, Ticket, Calendar, DollarSign, Target, Clock, Phone, Mail, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';

const Index = () => {
  // Sample data for charts
  const leadsData = [
    { name: 'Jan', leads: 45, converted: 12 },
    { name: 'Feb', leads: 52, converted: 18 },
    { name: 'Mar', leads: 48, converted: 15 },
    { name: 'Apr', leads: 61, converted: 22 },
    { name: 'Maj', leads: 55, converted: 19 },
    { name: 'Jun', leads: 67, converted: 28 },
  ];

  const supportData = [
    { name: 'Åbne', value: 23, color: '#ef4444' },
    { name: 'I gang', value: 15, color: '#f59e0b' },
    { name: 'Løst', value: 142, color: '#10b981' },
    { name: 'Afventer', value: 8, color: '#6b7280' },
  ];

  const revenueData = [
    { name: 'Jan', revenue: 125000, forecast: 130000 },
    { name: 'Feb', revenue: 142000, forecast: 135000 },
    { name: 'Mar', revenue: 138000, forecast: 140000 },
    { name: 'Apr', revenue: 156000, forecast: 145000 },
    { name: 'Maj', revenue: 149000, forecast: 150000 },
    { name: 'Jun', revenue: 167000, forecast: 155000 },
  ];

  const routeEfficiencyData = [
    { name: 'Uge 1', efficiency: 87, distance: 245 },
    { name: 'Uge 2', efficiency: 92, distance: 223 },
    { name: 'Uge 3', efficiency: 89, distance: 237 },
    { name: 'Uge 4', efficiency: 94, distance: 218 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Velkommen til dit alt-i-én CRM & planlægningssystem</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Aktive Leads</CardTitle>
              <Users className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">147</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12% fra sidste måned
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Månedlig Omsætning</CardTitle>
              <DollarSign className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">167.000 kr</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +8% fra sidste måned
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Åbne Tickets</CardTitle>
              <Ticket className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                -3 fra i går
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Rute Effektivitet</CardTitle>
              <Target className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +2% fra sidste uge
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Leads Overview */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Leads Oversigt
              </CardTitle>
              <CardDescription>Månedlige leads og konverteringer</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#3b82f6" radius={4} />
                  <Bar dataKey="converted" fill="#10b981" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Support Tickets */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-orange-600" />
                Support Tickets
              </CardTitle>
              <CardDescription>Status fordeling af aktuelle tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={supportData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {supportData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {supportData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-gray-600">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Omsætning vs. Forecast
              </CardTitle>
              <CardDescription>Månedlig omsætning og prognoser</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} kr`, '']} />
                  <Area type="monotone" dataKey="forecast" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="revenue" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Route Efficiency */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Rute Optimering
              </CardTitle>
              <CardDescription>Ugentlig effektivitet og kørselsafstand</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={routeEfficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="distance" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Prioriterede Opgaver</h3>
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700">3 høj prioritet tickets</span>
                  <Badge variant="destructive">Høj</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm text-gray-700">12 leads kræver opfølgning</span>
                  <Badge variant="secondary">Medium</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-700">Ugens ruter skal optimeres</span>
                  <Badge variant="outline">Lav</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Seneste Aktivitet</h3>
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">Lead konverteret:</span>
                    <span className="text-gray-600 block">Jens Hansen - 15.000 kr</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">Ny support mail:</span>
                    <span className="text-gray-600 block">Problem med installation</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium">Opkald planlagt:</span>
                    <span className="text-gray-600 block">Maria Nielsen - i morgen kl. 10</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Hurtige Handlinger</h3>
                <Target className="h-5 w-5 text-purple-500" />
              </div>
              <div className="space-y-3">
                <Link to="/leads">
                  <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                    <Users className="h-4 w-4 mr-2" />
                    Opret Nyt Lead
                  </Button>
                </Link>
                <Link to="/support">
                  <Button variant="outline" className="w-full justify-start">
                    <Ticket className="h-4 w-4 mr-2" />
                    Åbn Support Ticket
                  </Button>
                </Link>
                <Link to="/planning">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Planlæg Ruter
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
