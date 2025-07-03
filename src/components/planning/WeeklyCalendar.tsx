
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Users, Zap, RefreshCw, Settings, Plus, Ban, ChevronLeft, ChevronRight, Euro, Bug, Brain, Grid, Layout } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useRoutes } from '@/hooks/useRoutes';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarGrid } from './CalendarGrid';
import { DynamicCalendarGrid } from './DynamicCalendarGrid';
import { TimelineCalendar } from './TimelineCalendar';
import { RouteOptimizationPanel } from './RouteOptimizationPanel';
import { RouteVisualization } from './RouteVisualization';
import { TestOrderGenerator } from './TestOrderGenerator';
import { OrderDebugInfo } from './OrderDebugInfo';
import { LiveView } from './LiveView';
import { VRPOptimizer } from '@/utils/vrpOptimizer';
import { useBackendVRPScheduler } from '@/hooks/useBackendVRPScheduler';

interface WeeklyCalendarProps {
  currentWeek?: Date;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ currentWeek = new Date() }) => {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  const [showRouteVisualization, setShowRouteVisualization] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showLiveView, setShowLiveView] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'dynamic' | 'grid'>('timeline');
  
  const { orders, refetch: refetchOrders } = useOrders();
  const { employees } = useEmployees();
  const { routes, refetch: refetchRoutes } = useRoutes();
  const { workSchedules } = useWorkSchedules();
  const { blockedSlots } = useBlockedTimeSlots();
  
  // Use enhanced VRP scheduler with Mapbox integration (manual mode)
  const { isOptimizing, solverHealthy, runOptimization } = useBackendVRPScheduler();

  // DISABLED auto-refresh optimization to prevent unwanted changes
  useAutoRefresh({
    enabled: autoRefresh,
    interval: 30000,
    onRefresh: () => {
      // Only refresh data, NEVER trigger optimization automatically
      refetchOrders();
      refetchRoutes();
      // DO NOT call runOptimization() here - only manual optimization allowed
    }
  });

  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDates.push(day);
    }
    return weekDates;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const weekDates = getWeekDates(selectedWeek);
  const weekNumber = getWeekNumber(selectedWeek);

  // Filter orders for the SELECTED week and employee
  const weekOrders = orders.filter(order => {
    if (order.scheduled_week === weekNumber) {
      if (selectedEmployee === 'all') return true;
      return order.assigned_employee_id === selectedEmployee;
    }

    if (!order.scheduled_week && order.scheduled_date) {
      const orderDate = new Date(order.scheduled_date);
      const isInWeek = weekDates.some(weekDate => 
        formatDate(orderDate) === formatDate(weekDate)
      );
      
      if (!isInWeek) return false;
      
      if (selectedEmployee === 'all') return true;
      return order.assigned_employee_id === selectedEmployee;
    }

    return false;
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Uge {weekNumber} - {selectedWeek.getFullYear()}
                </CardTitle>
                <CardDescription>
                  {weekDates[0].toLocaleDateString('da-DK')} - {weekDates[6].toLocaleDateString('da-DK')}
                  <br />
                  <span className="text-green-600 text-sm">🤖 Automatisk dynamisk planlægning aktiv</span>
                </CardDescription>
              </div>
              
              {/* Week Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                  I dag
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Employee Filter */}
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Vælg medarbejder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medarbejdere</SelectItem>
                  {activeEmployees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button 
                  variant={viewMode === 'timeline' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="rounded-r-none"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Timeline
                </Button>
                <Button 
                  variant={viewMode === 'dynamic' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('dynamic')}
                  className="rounded-none"
                >
                  <Layout className="h-4 w-4 mr-2" />
                  Dynamisk
                </Button>
                <Button 
                  variant={viewMode === 'grid' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Gitter
                </Button>
              </div>

              {/* Debug Toggle */}
              <Button 
                variant={showDebugInfo ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug
              </Button>

              {/* View Toggle Buttons */}
              <Button 
                variant={showLiveView ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowLiveView(!showLiveView);
                  setShowRouteVisualization(false);
                  setShowOptimizationPanel(false);
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Live View
              </Button>

              <Button 
                variant={showRouteVisualization ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowRouteVisualization(!showRouteVisualization);
                  setShowOptimizationPanel(false);
                  setShowLiveView(false);
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Rute Visualisering
              </Button>

              <Button 
                variant={showOptimizationPanel ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowOptimizationPanel(!showOptimizationPanel);
                  setShowRouteVisualization(false);
                  setShowLiveView(false);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Indstillinger
              </Button>

              {/* Auto-refresh toggle */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-opdater
              </Button>

              {/* Manual Route Planning Button */}
              <Button 
                variant="default" 
                size="sm"
                onClick={async () => {
                  try {
                    console.log('🎯 Manual optimization triggered by user');
                    const result = await runOptimization();
                    if (result && result.scheduledOrders > 0) {
                      toast.success(
                        `✅ ${result.scheduledOrders} ordrer planlagt på ${result.daysUsed} dage (${Math.round(result.score)}% effektivitet)`
                      );
                      refetchOrders();
                      refetchRoutes();
                    } else if (result && result.scheduledOrders === 0) {
                      toast.success('🔒 Alle ordrer er allerede korrekt planlagt');
                    }
                  } catch (error) {
                    console.error('Manual optimization failed:', error);
                    toast.error('Planlægning fejlede - prøv igen');
                  }
                }}
                disabled={isOptimizing}
              >
                <Brain className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-pulse' : ''}`} />
                {isOptimizing ? 'Planlægger...' : 'Genplanlæg Kun Nye Ordrer'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Debug Info Panel */}
      {showDebugInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TestOrderGenerator />
          <OrderDebugInfo />
        </div>
      )}

      {/* Conditional Panels */}
      {showOptimizationPanel && (
        <RouteOptimizationPanel
          selectedWeek={selectedWeek}
          selectedEmployee={selectedEmployee}
          onOptimizationComplete={() => {
            refetchOrders();
            refetchRoutes();
          }}
        />
      )}

      {showLiveView && (
        <LiveView
          selectedWeek={selectedWeek}
          selectedEmployee={selectedEmployee}
        />
      )}

      {showRouteVisualization && (
        <RouteVisualization
          selectedWeek={selectedWeek}
          selectedEmployee={selectedEmployee}
        />
      )}

      {/* Enhanced Week Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {selectedEmployee === 'all' ? 'Ordrer denne uge' : `${employees.find(e => e.id === selectedEmployee)?.name || 'Medarbejder'} ordrer`}
                </p>
                <p className="text-2xl font-bold text-gray-900">{weekOrders.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktive ruter</p>
                <p className="text-2xl font-bold text-gray-900">
                  {routes.filter(route => 
                    weekDates.some(date => formatDate(date) === route.route_date) &&
                    (selectedEmployee === 'all' || route.employee_id === selectedEmployee)
                  ).length}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total arbejdstid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(weekOrders.reduce((sum, order) => sum + (order.estimated_duration || 0), 0) / 60)} timer
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ugens omsætning</p>
                <p className="text-2xl font-bold text-gray-900">
                  {weekOrders.reduce((sum, order) => sum + order.price, 0).toLocaleString()} kr
                </p>
              </div>
              <Euro className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Calendar Views */}
      {viewMode === 'timeline' ? (
        <TimelineCalendar 
          currentWeek={selectedWeek} 
          selectedEmployee={selectedEmployee}
        />
      ) : viewMode === 'dynamic' ? (
        <DynamicCalendarGrid 
          currentWeek={selectedWeek} 
          selectedEmployee={selectedEmployee}
        />
      ) : (
        <CalendarGrid 
          currentWeek={selectedWeek} 
          selectedEmployee={selectedEmployee}
        />
      )}
    </div>
  );
};
