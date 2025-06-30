
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Users, Ticket, Calendar, DollarSign, Target, Clock, Phone, Mail, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Activity, Star, Zap, Globe, Award } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Navigation />
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-blue-400 rounded-full animate-spin mx-auto" style={{animationDelay: '0.5s', animationDuration: '1.5s'}}></div>
              </div>
              <div className="space-y-2">
                <p className="text-xl font-semibold text-gray-800">Indlæser dit dashboard</p>
                <p className="text-gray-600">Henter real-time data fra alle systemer...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Navigation />
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md mx-auto border-red-200 bg-red-50">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">Datafejl</h3>
                <p className="text-red-600 mb-4">Kunne ikke indlæse dashboard data. Prøv igen om et øjeblik.</p>
                <Button onClick={() => window.location.reload()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                  Genindlæs
                </Button>
              </CardContent>
            </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navigation />
      
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Modern Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 rounded-3xl"></div>
          <div className="relative bg-white/40 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg">
                    <Activity className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent">
                      Kommando Central
                    </h1>
                    <p className="text-gray-600 text-lg">Dit ultimative CRM & planlægnings dashboard</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-800">Live Data</span>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-700">
                  <Zap className="h-3 w-3 mr-1" />
                  Real-time
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Ultra-Professional Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Leads Card */}
          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-blue-100">Aktive Leads</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Stigende
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Users className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-white">{stats.activeLeads}</div>
                <div className="flex items-center text-sm text-blue-100">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>Live fra CRM system</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue Card */}
          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-green-600 to-teal-600"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-green-100">Månedlig Omsætning</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Denne måned
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-white">{stats.monthlyRevenue.toLocaleString('da-DK')} kr</div>
                <div className="flex items-center text-sm text-green-100">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  <span>Fra bekræftede ordrer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Tickets Card */}
          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-orange-100">Åbne Tickets</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    Kræver handling
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Ticket className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-white">{stats.openTickets}</div>
                <div className="flex items-center text-sm text-orange-100">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Real-time fra support</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route Efficiency Card */}
          <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-500"></div>
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium text-purple-100">Rute Effektivitet</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    AI-Optimeret
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Target className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-white">{stats.routeEfficiency}%</div>
                <div className="flex items-center text-sm text-purple-100">
                  <Globe className="h-4 w-4 mr-1" />
                  <span>Intelligente ruter</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leads Overview Chart */}
          <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">Leads Performance</CardTitle>
                    <CardDescription className="text-gray-600">Månedlige leads og konverteringer</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Star className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={leadsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="convertedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
                    }} 
                  />
                  <Bar dataKey="leads" fill="url(#leadsGradient)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" fill="url(#convertedGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Support Tickets Pie Chart */}
          <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Ticket className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">Support Status</CardTitle>
                    <CardDescription className="text-gray-600">Live ticket fordeling</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-800">Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={supportData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {supportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {supportData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: entry.color }} />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">{entry.name}</span>
                      <div className="text-xs text-gray-500">{entry.value} tickets</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue and Route Efficiency Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Omsætning & Prognoser</CardTitle>
                  <CardDescription className="text-gray-600">Månedlig omsætning vs. forecasts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    formatter={(value) => [`${value?.toLocaleString('da-DK')} kr`, '']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
                    }} 
                  />
                  <Area type="monotone" dataKey="forecast" stackId="1" stroke="#94a3b8" fill="url(#forecastGradient)" />
                  <Area type="monotone" dataKey="revenue" stackId="2" stroke="#10b981" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Route Efficiency Chart */}
          <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Rute Optimering</CardTitle>
                  <CardDescription className="text-gray-600">AI-dreven effektivitet</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={routeEfficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px', 
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' 
                    }} 
                  />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }} 
                    activeDot={{ r: 8, fill: '#8b5cf6' }} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="distance" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    strokeDasharray="8 4" 
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Professional Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Priority Tasks */}
          <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Prioriteret</h3>
                </div>
                <Badge variant="destructive" className="bg-red-500">
                  {prioritizedTasks.length}
                </Badge>
              </div>
              <div className="space-y-4">
                {prioritizedTasks.map((task, index) => (
                  <div key={index} className={`p-4 ${task.color} rounded-xl border border-gray-100 transition-all duration-200 hover:shadow-md`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{task.task}</span>
                      <Badge variant={task.badge as any} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Aktivitet</h3>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-800">Real-time</span>
                </div>
              </div>
              <div className="space-y-4">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => {
                  const IconComponent = getIcon(activity.icon);
                  return (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
                      <div className={`p-2 rounded-lg ${activity.color === 'text-green-500' ? 'bg-green-100' : activity.color === 'text-blue-500' ? 'bg-blue-100' : 'bg-orange-100'}`}>
                        <IconComponent className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-600 truncate">{activity.description}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Ingen seneste aktivitet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl bg-white/60 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Hurtige Handlinger</h3>
                </div>
              </div>
              <div className="space-y-4">
                <Link to="/leads" className="block">
                  <Button className="w-full justify-start bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12">
                    <Users className="h-5 w-5 mr-3" />
                    Opret Nyt Lead
                  </Button>
                </Link>
                <Link to="/support" className="block">
                  <Button variant="outline" className="w-full justify-start border-2 hover:bg-gray-50 transition-all duration-200 h-12">
                    <Ticket className="h-5 w-5 mr-3" />
                    Åbn Support Ticket
                  </Button>
                </Link>
                <Link to="/planning" className="block">
                  <Button variant="outline" className="w-full justify-start border-2 hover:bg-gray-50 transition-all duration-200 h-12">
                    <Calendar className="h-5 w-5 mr-3" />
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
