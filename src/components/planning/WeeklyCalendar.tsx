import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Users, Zap, RefreshCw, Settings, Plus, Ban, ChevronLeft, ChevronRight, Euro, Bug, Brain } from 'lucide-react';
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
import { TestOrderGenerator } from './TestOrderGenerator';
import { OrderDebugInfo } from './OrderDebugInfo';
import { VRPOptimizer } from '@/utils/vrpOptimizer';

interface WeeklyCalendarProps {
  currentWeek?: Date;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ currentWeek = new Date() }) => {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [isReplanning, setIsReplanning] = useState(false);
  const [isVRPOptimizing, setIsVRPOptimizing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showOptimizationPanel, setShowOptimizationPanel] = useState(false);
  const [showRouteVisualization, setShowRouteVisualization] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  const { orders, refetch: refetchOrders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { routes, refetch: refetchRoutes, createRoute } = useRoutes();
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
    console.log('Filtering order:', {
      id: order.id.slice(0, 8),
      customer: order.customer,
      scheduled_week: order.scheduled_week,
      current_week_number: weekNumber,
      scheduled_date: order.scheduled_date,
      assigned_employee: order.assigned_employee_id,
      selected_employee: selectedEmployee
    });

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

  console.log('Week orders after filtering:', weekOrders.length, 'for week', weekNumber);

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

  const handleMultiDayVRPOptimization = async () => {
    if (weekOrders.length === 0) {
      toast.error('Ingen ordrer fundet for optimering');
      return;
    }

    if (workSchedules.length === 0) {
      toast.error('Ingen arbejdstider defineret. Gå til Indstillinger for at konfigurere medarbejder arbejdstider.');
      return;
    }

    setIsVRPOptimizing(true);
    
    try {
      console.log('Starting Multi-Day VRP optimization for', weekOrders.length, 'orders with dynamic work schedules');
      
      // Convert orders to VRP format
      const vrpOrders = weekOrders.map(order => ({
        id: order.id,
        customer: order.customer,
        address: order.address || '',
        latitude: order.latitude,
        longitude: order.longitude,
        estimated_duration: order.estimated_duration || 120, // Use actual duration
        priority: order.priority,
        price: order.price,
        preferred_time: order.scheduled_time,
        scheduled_date: order.scheduled_date, // Include fixed dates
        scheduled_time: order.scheduled_time, // Include fixed times
      }));

      // Filter active employees
      const activeEmployees = employees.filter(emp => emp.is_active).map(emp => ({
        id: emp.id,
        name: emp.name,
        start_location: emp.start_location,
        latitude: emp.latitude,
        longitude: emp.longitude,
        max_hours_per_day: emp.max_hours_per_day || 8,
        hourly_rate: emp.hourly_rate,
        specialties: emp.specialties
      }));

      if (activeEmployees.length === 0) {
        toast.error('Ingen aktive medarbejdere fundet');
        return;
      }

      // Convert work schedules to VRP format
      const vrpWorkSchedules = workSchedules.map(ws => ({
        employee_id: ws.employee_id,
        day_of_week: ws.day_of_week,
        start_time: ws.start_time,
        end_time: ws.end_time,
        is_working_day: ws.is_working_day
      }));

      console.log('VRP Input:', {
        orders: vrpOrders.length,
        employees: activeEmployees.length,
        workSchedules: vrpWorkSchedules.length,
        weekStart: formatDate(weekDates[0])
      });

      // Run Multi-Day VRP optimization with dynamic work schedules
      const optimizedRoutes = VRPOptimizer.optimizeWeeklyRoutes(
        vrpOrders,
        activeEmployees,
        vrpWorkSchedules,
        formatDate(weekDates[0])
      );

      console.log('Multi-Day VRP optimization completed:', optimizedRoutes.length, 'routes');

      // Apply optimized schedules
      let updatedOrders = 0;
      let createdRoutes = 0;

      for (const route of optimizedRoutes) {
        // Create route in database
        const routeData = {
          name: `${route.orders[0]?.customer || 'Multi-dag Rute'} - ${route.date}`,
          employee_id: route.employee_id,
          route_date: route.date,
          estimated_distance_km: route.total_distance,
          estimated_duration_hours: route.total_duration / 60,
          total_revenue: route.total_revenue,
          status: 'Planlagt',
          ai_optimized: true,
          optimization_score: route.optimization_score
        };

        const createdRoute = await createRoute(routeData);
        if (createdRoute) {
          createdRoutes++;

          // Update orders with optimized multi-day schedule
          for (const optimizedOrder of route.orders) {
            await updateOrder(optimizedOrder.id, {
              scheduled_date: optimizedOrder.scheduled_date, // Multi-day scheduling
              scheduled_time: optimizedOrder.scheduled_time,
              route_id: createdRoute.id,
              order_sequence: optimizedOrder.order_sequence,
              travel_time_minutes: optimizedOrder.travel_time_to_here,
              ai_suggested_time: optimizedOrder.scheduled_time,
              assigned_employee_id: route.employee_id
            });
            updatedOrders++;
          }
        }
      }

      toast.success(
        `🚀 Multi-Dag VRP Optimering færdig! ${updatedOrders} ordrer optimeret på ${createdRoutes} ruter fordelt over hele ugen. ` +
        `Gennemsnitlig effektivitet: ${Math.round(optimizedRoutes.reduce((sum, r) => sum + r.optimization_score, 0) / optimizedRoutes.length)}%`
      );

      // Refresh data
      await Promise.all([refetchOrders(), refetchRoutes()]);

    } catch (error) {
      console.error('Multi-Day VRP optimization error:', error);
      toast.error('Fejl ved Multi-Dag VRP optimering');
    } finally {
      setIsVRPOptimizing(false);
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

              {/* NEW: Multi-Day VRP Optimization Button */}
              <Button 
                onClick={handleMultiDayVRPOptimization}
                disabled={isVRPOptimizing || weekOrders.length === 0}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {isVRPOptimizing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {isVRPOptimizing ? 'Multi-Dag VRP...' : 'Multi-Dag VRP'}
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
                {isReplanning ? 'AI Optimerer...' : 'Legacy Optimering'}
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
