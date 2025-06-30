
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Users, Ticket, Calendar, DollarSign, Target, Clock, Phone, Mail, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { useDashboardData } from '@/hooks/useDashboardData';

const Index = () => {
  const { 
    stats, 
    leadsChartData, 
    supportData, 
    revenueData, 
    routeEfficiencyData, 
    prioritizedTasks, 
    recentActivity,
    isLoading,
    error 
  } = useDashboardData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Indlæser dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-red-600">
            Fejl ved indlæsning af dashboard data. Prøv igen senere.
          </div>
        </div>
      </div>
    );
  }

  const getIcon = (iconName: string) => {
    const icons = {
      CheckCircle2,
      Mail,
      Phone
    };
    const IconComponent = icons[iconName as keyof typeof icons] || Mail;
    return IconComponent;
  };

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
              <div className="text-2xl font-bold">{stats.activeLeads}</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Live data fra CRM
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Månedlig Omsætning</CardTitle>
              <DollarSign className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString('da-DK')} kr</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Fra ordrer denne måned
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Åbne Tickets</CardTitle>
              <Ticket className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openTickets}</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                Real-time fra support
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Rute Effektivitet</CardTitle>
              <Target className="h-4 w-4 opacity-90" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.routeEfficiency}%</div>
              <div className="flex items-center text-xs opacity-90">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                AI-optimerede ruter
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
                <BarChart data={leadsChartData}>
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
                  <Tooltip formatter={(value) => [`${value?.toLocaleString('da-DK')} kr`, '']} />
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
                {prioritizedTasks.map((task, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 ${task.color} rounded-lg`}>
                    <span className="text-sm text-gray-700">{task.task}</span>
                    <Badge variant={task.badge as any}>{task.priority}</Badge>
                  </div>
                ))}
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
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => {
                  const IconComponent = getIcon(activity.icon);
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <IconComponent className={`h-4 w-4 ${activity.color} mt-0.5 flex-shrink-0`} />
                      <div className="text-sm">
                        <span className="font-medium">{activity.title}</span>
                        <span className="text-gray-600 block">{activity.description}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Ingen seneste aktivitet
                  </div>
                )}
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
