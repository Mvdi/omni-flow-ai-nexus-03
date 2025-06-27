
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Users, Zap, RefreshCw, Settings, Plus, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useRoutes } from '@/hooks/useRoutes';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WeeklyCalendarProps {
  currentWeek?: Date;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ currentWeek = new Date() }) => {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [isReplanning, setIsReplanning] = useState(false);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  
  const { orders, refetch: refetchOrders } = useOrders();
  const { employees } = useEmployees();
  const { routes, refetch: refetchRoutes } = useRoutes();
  const { workSchedules } = useWorkSchedules();
  const { blockedSlots } = useBlockedTimeSlots();

  // Load status options from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('orderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.statusOptions) {
          setStatusOptions(settings.statusOptions);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setStatusOptions([
          { name: 'Ikke planlagt', color: '#6B7280' },
          { name: 'Planlagt', color: '#3B82F6' },
          { name: 'I gang', color: '#F59E0B' },
          { name: 'Færdig', color: '#10B981' }
        ]);
      }
    } else {
      setStatusOptions([
        { name: 'Ikke planlagt', color: '#6B7280' },
        { name: 'Planlagt', color: '#3B82F6' },
        { name: 'I gang', color: '#F59E0B' },
        { name: 'Færdig', color: '#10B981' }
      ]);
    }
  }, []);

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

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(option => option.name === status);
    return statusOption ? statusOption.color : '#6B7280';
  };

  const weekDates = getWeekDates(selectedWeek);
  const weekNumber = getWeekNumber(selectedWeek);

  // Filter orders for the current week
  const weekOrders = orders.filter(order => {
    if (!order.scheduled_date) return false;
    const orderDate = new Date(order.scheduled_date);
    return weekDates.some(weekDate => 
      formatDate(orderDate) === formatDate(weekDate)
    );
  });

  // Group orders by date and employee
  const ordersByDateAndEmployee = weekOrders.reduce((acc, order) => {
    const dateKey = order.scheduled_date!;
    const employeeKey = order.assigned_employee_id || 'unassigned';
    
    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][employeeKey]) acc[dateKey][employeeKey] = [];
    
    acc[dateKey][employeeKey].push(order);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const handleReplanWeek = async () => {
    setIsReplanning(true);
    
    try {
      const weekStart = formatDate(weekDates[0]);
      const weekEnd = formatDate(weekDates[6]);
      
      console.log('Replanning week:', weekStart, 'to', weekEnd);
      
      const { data, error } = await supabase.functions.invoke('replan-calendar', {
        body: { weekStart, weekEnd }
      });

      if (error) {
        console.error('Replan error:', error);
        throw error;
      }

      console.log('Replan result:', data);
      
      toast.success(data.message || `Planlagt ${data.ordersPlanned} ordrer på ${data.routesCreated} ruter`);
      
      // Refresh data
      await Promise.all([refetchOrders(), refetchRoutes()]);
      
    } catch (error) {
      console.error('Error replanning calendar:', error);
      toast.error('Fejl ved genplanlægning af kalender');
    } finally {
      setIsReplanning(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Uge {weekNumber} - {selectedWeek.getFullYear()}
              </CardTitle>
              <CardDescription>
                {weekDates[0].toLocaleDateString('da-DK')} - {weekDates[6].toLocaleDateString('da-DK')}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
                Forrige
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                Næste
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleReplanWeek}
                disabled={isReplanning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isReplanning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isReplanning ? 'Genplanlægger...' : 'Genplanlæg Kalender'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Week Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ordrer denne uge</p>
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
                <p className="text-sm font-medium text-gray-600">Aktive medarbejdere</p>
                <p className="text-2xl font-bold text-gray-900">{employees.filter(e => e.is_active).length}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blokerede tidspunkter</p>
                <p className="text-2xl font-bold text-gray-900">
                  {blockedSlots.filter(slot => 
                    weekDates.some(date => formatDate(date) === slot.blocked_date)
                  ).length}
                </p>
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
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improved Calendar Grid */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle>Kalender oversigt</CardTitle>
          <CardDescription>
            Vis ordrer organiseret efter dag og medarbejder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {weekDates.filter(date => date.getDay() >= 1 && date.getDay() <= 5).map((date) => {
              const dateKey = formatDate(date);
              const dayOrders = ordersByDateAndEmployee[dateKey] || {};
              const isToday = formatDate(date) === formatDate(new Date());

              return (
                <div
                  key={dateKey}
                  className={`border rounded-lg p-4 ${
                    isToday ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                        {date.toLocaleDateString('da-DK', { weekday: 'long' })}
                      </div>
                      <div className="text-lg text-gray-600">
                        {date.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {Object.values(dayOrders).flat().length} ordrer
                    </Badge>
                  </div>

                  {/* Employee Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.filter(e => e.is_active).map(employee => {
                      const employeeOrders = dayOrders[employee.id] || [];
                      const hasBlockedTime = blockedSlots.some(slot => 
                        slot.employee_id === employee.id && slot.blocked_date === dateKey
                      );

                      return (
                        <div key={employee.id} className="border rounded-lg p-3 bg-gray-50">
                          {/* Employee Header */}
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">{employee.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {employeeOrders.length} ordrer
                            </Badge>
                          </div>

                          {/* Employee Orders */}
                          <div className="space-y-2">
                            {employeeOrders.map(order => (
                              <div
                                key={order.id}
                                className="p-2 rounded bg-white border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{order.customer}</div>
                                    <div className="text-xs text-gray-600 truncate">{order.order_type}</div>
                                    {order.scheduled_time && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        <Clock className="h-3 w-3 inline mr-1" />
                                        {order.scheduled_time.slice(0, 5)}
                                      </div>
                                    )}
                                  </div>
                                  <Badge 
                                    className="ml-2 text-xs" 
                                    style={{ 
                                      backgroundColor: getStatusColor(order.status),
                                      color: 'white'
                                    }}
                                  >
                                    {order.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}

                            {hasBlockedTime && (
                              <div className="p-2 rounded bg-red-50 border border-red-200">
                                <div className="text-red-600 font-medium text-xs">
                                  <Ban className="h-3 w-3 inline mr-1" />
                                  Blokeret tid
                                </div>
                              </div>
                            )}

                            {employeeOrders.length === 0 && !hasBlockedTime && (
                              <div className="text-center py-2 text-gray-400 text-xs">
                                Ingen ordrer planlagt
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unassigned Orders */}
                  {dayOrders.unassigned && dayOrders.unassigned.length > 0 && (
                    <div className="mt-4 p-3 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50">
                      <h4 className="font-medium text-orange-800 mb-2">
                        Ikke tildelte ordrer ({dayOrders.unassigned.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {dayOrders.unassigned.map(order => (
                          <div key={order.id} className="p-2 rounded bg-white border">
                            <div className="font-medium text-sm">{order.customer}</div>
                            <div className="text-xs text-gray-600">{order.order_type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Optimization Status */}
      <Card className="shadow-sm border-0 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">AI Optimering Aktiv</h3>
                <p className="text-sm text-gray-600">
                  Kalenders ruter er optimeret baseret på lokation, prioritet og arbejdstider
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              Uge {weekNumber}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
