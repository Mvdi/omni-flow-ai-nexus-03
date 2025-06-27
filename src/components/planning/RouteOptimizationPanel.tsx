
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, TrendingUp, MapPin, Clock, DollarSign, Users, BarChart3, Settings, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimizationResult {
  success: boolean;
  ordersOptimized: number;
  routesCreated: number;
  totalDistance: number;
  totalRevenue: number;
  averageOptimizationScore: number;
  message: string;
}

interface RouteOptimizationPanelProps {
  selectedWeek: Date;
  selectedEmployee?: string;
  onOptimizationComplete: () => void;
}

export const RouteOptimizationPanel: React.FC<RouteOptimizationPanelProps> = ({
  selectedWeek,
  selectedEmployee,
  onOptimizationComplete
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastResult, setLastResult] = useState<OptimizationResult | null>(null);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    };
  };

  const runIntelligentOptimization = async () => {
    setIsOptimizing(true);
    setOptimizationProgress(0);
    
    try {
      const weekDates = getWeekDates(selectedWeek);
      
      console.log('Starting intelligent optimization:', weekDates);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setOptimizationProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const { data, error } = await supabase.functions.invoke('intelligent-route-planner', {
        body: { 
          weekStart: weekDates.start, 
          weekEnd: weekDates.end,
          employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined
        }
      });

      clearInterval(progressInterval);
      setOptimizationProgress(100);

      if (error) {
        console.error('Optimization error:', error);
        throw error;
      }

      console.log('Optimization result:', data);
      
      setLastResult(data);
      toast.success(data.message || 'Intelligent ruteoptimereing fuldført');
      
      // Refresh the calendar
      onOptimizationComplete();
      
    } catch (error) {
      console.error('Error during optimization:', error);
      toast.error('Fejl ved ruteoptimereing');
    } finally {
      setIsOptimizing(false);
      setTimeout(() => setOptimizationProgress(0), 2000);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-600" />
          Intelligent Ruteoptimereing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="optimize" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="optimize">Optimér</TabsTrigger>
            <TabsTrigger value="results">Resultater</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="optimize" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Geografisk Clustering</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Grupperer ordrer geografisk for optimal kørerute
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Multi-objektiv Optimering</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Minimerer køretid og maksimerer indtjening
                  </p>
                </div>
              </div>
              
              {isOptimizing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Optimerer ruter...</span>
                    <span className="text-sm text-gray-500">{optimizationProgress}%</span>
                  </div>
                  <Progress value={optimizationProgress} className="w-full" />
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    {optimizationProgress < 30 && "Analyserer ordrer og medarbejdere..."}
                    {optimizationProgress >= 30 && optimizationProgress < 60 && "Beregner geografiske klynger..."}
                    {optimizationProgress >= 60 && optimizationProgress < 90 && "Optimerer ruter med AI..."}
                    {optimizationProgress >= 90 && "Gemmer optimerede ruter..."}
                  </div>
                </div>
              )}
              
              <Button 
                onClick={runIntelligentOptimization}
                disabled={isOptimizing}
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {isOptimizing ? (
                  <>
                    <Pause className="h-4 w-4 mr-2 animate-spin" />
                    Optimerer...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Intelligent Optimering
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="results" className="space-y-4">
            {lastResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ordrer Optimeret</span>
                      <Badge variant="secondary">{lastResult.ordersOptimized}</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ruter Oprettet</span>
                      <Badge variant="secondary">{lastResult.routesCreated}</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Distance</span>
                      <span className="text-sm font-bold">{Math.round(lastResult.totalDistance)} km</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Omsætning</span>
                      <span className="text-sm font-bold">{lastResult.totalRevenue.toLocaleString()} kr</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Optimeringseffektivitet</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={lastResult.averageOptimizationScore} 
                          className="w-20 h-2" 
                        />
                        <span className="font-bold text-purple-600">
                          {Math.round(lastResult.averageOptimizationScore)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ingen optimeringsresultater endnu</p>
                <p className="text-sm">Kør en optimering for at se resultater</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-white border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Optimeringsindstillinger
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Algoritme:</span>
                    <span className="font-medium">Intelligent VRP + Geografisk Clustering</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Optimeringsmål:</span>
                    <span className="font-medium">Minimal køretid + Maksimal indtjening</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Constraints:</span>
                    <span className="font-medium">Tidsvinduer + Blokerede slots + Medarbejderkapacitet</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Næste Forbedringer
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Machine Learning for service-tids-prædiktion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Real-time trafikdata integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Dynamisk re-optimering ved ændringer</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
