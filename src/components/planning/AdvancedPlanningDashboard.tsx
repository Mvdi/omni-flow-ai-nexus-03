import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  MapPin, 
  Clock, 
  DollarSign, 
  Users, 
  Route,
  Calendar,
  Settings,
  Play,
  Pause
} from 'lucide-react';
import { useAdvancedPlanner } from '@/hooks/useAdvancedPlanner';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';

export const AdvancedPlanningDashboard = () => {
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date());
  const [optimizationMode, setOptimizationMode] = useState<'smart' | 'force'>('smart');
  
  const { 
    isOptimizing, 
    lastOptimization, 
    runAdvancedOptimization, 
    getPlanningStats,
    hasOrdersNeedingOptimization 
  } = useAdvancedPlanner();
  
  const { orders } = useOrders();
  const { employees } = useEmployees();
  
  const stats = getPlanningStats();

  const handleOptimize = async () => {
    await runAdvancedOptimization(selectedWeek, optimizationMode === 'force');
  };

  const getWeekDateRange = (date: Date) => {
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    return {
      start: monday.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' }),
      end: friday.toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' })
    };
  };

  const weekRange = getWeekDateRange(selectedWeek);

  return (
    <div className="space-y-6">
      {/* AI Planning Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI Ruteplanlægning</CardTitle>
                <CardDescription className="text-base">
                  Avanceret algoritme-baseret optimering af ruter og ressourcer
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasOrdersNeedingOptimization && (
                <Badge variant="default" className="bg-primary text-primary-foreground">
                  {stats.ordersNeedingOptimization} nye ordrer
                </Badge>
              )}
              <Badge variant="outline" className="text-muted-foreground">
                {stats.optimizationRate}% optimeret
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Uge Planlægning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Vælg uge</label>
              <input
                type="week"
                value={`${selectedWeek.getFullYear()}-W${String(Math.ceil((selectedWeek.getTime() - new Date(selectedWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, week] = e.target.value.split('-W');
                  const newDate = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
                  setSelectedWeek(newDate);
                }}
                className="w-full p-2 border rounded-md"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {weekRange.start} - {weekRange.end}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Optimering Mode</label>
              <Select value={optimizationMode} onValueChange={(value: 'smart' | 'force') => setOptimizationMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">🧠 Smart (kun nye ordrer)</SelectItem>
                  <SelectItem value="force">⚡ Fuld genoptimering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="w-full"
              size="lg"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  AI Optimerer...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  {optimizationMode === 'smart' ? 'Smart Optimering' : 'Fuld Optimering'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Current Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalOrders}</p>
                <p className="text-sm text-muted-foreground">Ordrer</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.activeEmployees}</p>
                <p className="text-sm text-muted-foreground">Medarbejdere</p>
              </div>
              <div className="text-center col-span-2">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalRevenue.toLocaleString()} kr
                </p>
                <p className="text-sm text-muted-foreground">Total Omsætning</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Optimization Result */}
        {lastOptimization && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Sidste Optimering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ordrer optimeret</span>
                <Badge variant="secondary">{lastOptimization.stats.ordersOptimized}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ruter oprettet</span>
                <Badge variant="secondary">{lastOptimization.stats.routesCreated}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Efficienscore</span>
                <Badge variant="default">{lastOptimization.stats.avgEfficiency}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total kørsel</span>
                <span className="text-sm font-medium">{lastOptimization.stats.totalDistance} km</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Indsigter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <MapPin className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium">Geografisk Optimering</p>
                <p className="text-sm text-muted-foreground">Minimerer kørselsafstand</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">Omsætnings-fokus</p>
                <p className="text-sm text-muted-foreground">Prioriterer høj-værdi ordrer</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="font-medium">Tidsoptimering</p>
                <p className="text-sm text-muted-foreground">Maksimerer ressource-udnyttelse</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};