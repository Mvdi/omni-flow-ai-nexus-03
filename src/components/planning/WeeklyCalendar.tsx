import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Users, Zap, RefreshCw, Settings, Plus, Ban, ChevronLeft, ChevronRight, Euro } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useRoutes } from '@/hooks/useRoutes';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarGrid } from './CalendarGrid';
import { RouteOptimizationPanel } from './RouteOptimizationPanel';
import { RouteVisualization } from './RouteVisualization';

interface WeeklyCalendarProps {
  currentWeek?: Date;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ currentWeek = new Date() }) => {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [isReplanning, setIsReplanning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  const [showRouteVisualization, setShowRouteVisualization] = useState(false);
  
  const { orders, refetch: refetchOrders } = useOrders();
  const { employees } = useEmployees();
  const { routes, refetch: refetchRoutes } = useRoutes();
  const { workSchedules } = useWorkSchedules();
  const { blockedSlots } = useBlockedTimeSlots();

  // Use the new auto-refresh hook
  useAutoRefresh({
    enabled: autoRefresh,
    interval: 30000,
    onRefresh: () => {
      refetchOrders();
      refetchRoutes();
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
    if (!order.scheduled_date) return false;
    const orderDate = new Date(order.scheduled_date);
    const isInWeek = weekDates.some(weekDate => 
      formatDate(orderDate) === formatDate(weekDate)
    );
    
    if (!isInWeek) return false;
    
    if (selectedEmployee === 'all') return true;
    return order.assigned_employee_id === selectedEmployee;
  });

  // Filter blocked slots for the SELECTED week
  const weekBlockedSlots = blockedSlots.filter(slot => 
    weekDates.some(date => formatDate(date) === slot.blocked_date)
  );

  const handleIntelligentReplan = async () => {
    setIsReplanning(true);
    
    try {
      const weekStart = formatDate(weekDates[0]);
      const weekEnd = formatDate(weekDates[6]);
      
      console.log('Starting intelligent replanning:', weekStart, 'to', weekEnd);
      
      const { data, error } = await supabase.functions.invoke('intelligent-route-planner', {
        body: { 
          weekStart, 
          weekEnd,
          employeeId: selectedEmployee !== 'all' ? selectedEmployee : undefined
        }
      });

      if (error) {
        console.error('Intelligent replan error:', error);
        throw error;
      }

      console.log('Intelligent replan result:', data);
      
      toast.success(data.message || `Intelligent optimering: ${data.ordersOptimized} ordrer på ${data.routesCreated} ruter med ${Math.round(data.averageOptimizationScore)}% effektivitet`);
      
      // Refresh data
      await Promise.all([refetchOrders(), refetchRoutes()]);
      
    } catch (error) {
      console.error('Error during intelligent replanning:', error);
      toast.error('Fejl ved intelligent ruteplanlægning');
    } finally {
      setIsReplanning(false);
    }
  };

  const handleOptimizationComplete = () => {
    refetchOrders();
    refetchRoutes();
  };

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

              {/* View Toggle Buttons */}
              <Button 
                variant={showRouteVisualization ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowRouteVisualization(!showRouteVisualization);
                  setShowOptimizationPanel(false);
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
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                AI Optimering
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
              
              <Button 
                onClick={handleIntelligentReplan}
                disabled={isReplanning}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isReplanning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isReplanning ? 'AI Optimerer...' : 'Intelligent Optimering'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Conditional Panels */}
      {showOptimizationPanel && (
        <RouteOptimizationPanel
          selectedWeek={selectedWeek}
          selectedEmployee={selectedEmployee}
          onOptimizationComplete={handleOptimizationComplete}
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
                <p className="text-sm font-medium text-gray-600">Blokerede tidspunkter</p>
                <p className="text-2xl font-bold text-gray-900">{weekBlockedSlots.length}</p>
              </div>
              <Ban className="h-8 w-8 text-red-600" />
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
              <Euro className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Grid - pass both selectedWeek and selectedEmployee */}
      <CalendarGrid 
        currentWeek={selectedWeek} 
        selectedEmployee={selectedEmployee}
      />
    </div>
  );
};
