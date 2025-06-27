
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useRoutes } from '@/hooks/useRoutes';
import { Calendar, ChevronLeft, ChevronRight, User, MapPin, Clock, Zap } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from 'date-fns';
import { da } from 'date-fns/locale';

const HOURS = Array.from({ length: 11 }, (_, i) => i + 7); // 7:00 to 17:00
const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];

export const WeeklyCalendar = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { orders, loading: ordersLoading } = useOrders();
  const { employees, loading: employeesLoading } = useEmployees();
  const { routes, optimizeRoute } = useRoutes();

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getOrdersForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return orders.filter(order => order.scheduled_date === dateStr);
  };

  const getOrdersForTimeSlot = (date: Date, hour: number) => {
    const dayOrders = getOrdersForDay(date);
    return dayOrders.filter(order => {
      if (!order.scheduled_time) return false;
      const orderHour = parseInt(order.scheduled_time.split(':')[0]);
      return orderHour === hour;
    });
  };

  const getEmployeeColor = (employeeId: string) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800', 
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ];
    const index = employees.findIndex(emp => emp.id === employeeId);
    return colors[index % colors.length] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Kritisk': return 'border-l-4 border-red-500';
      case 'Høj': return 'border-l-4 border-orange-500';
      case 'Normal': return 'border-l-4 border-blue-500';
      case 'Lav': return 'border-l-4 border-gray-500';
      default: return 'border-l-4 border-blue-500';
    }
  };

  const handleOptimizeWeek = async () => {
    const weekRoutes = routes.filter(route => {
      const routeDate = new Date(route.route_date);
      return routeDate >= weekStart && routeDate <= addDays(weekStart, 6);
    });

    for (const route of weekRoutes) {
      await optimizeRoute(route.id);
    }
  };

  if (ordersLoading || employeesLoading) {
    return <div className="p-6">Indlæser kalender...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-semibold">
            Uge {format(weekStart, 'w', { locale: da })} - {format(weekStart, 'yyyy')}
          </h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentWeek(new Date())}
          >
            I dag
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleOptimizeWeek}
          >
            <Zap className="h-4 w-4 mr-2" />
            Optimer Uge
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b">
            <div className="p-3 border-r font-medium text-sm text-gray-500">Tid</div>
            {weekDays.map((day, index) => (
              <div 
                key={day.toISOString()} 
                className={`p-3 border-r font-medium text-sm text-center ${
                  isToday(day) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div>{DAYS[index]}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {format(day, 'd/M')}
                </div>
              </div>
            ))}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
                <div className="p-3 border-r text-sm text-gray-500 font-medium">
                  {hour}:00
                </div>
                {weekDays.map(day => {
                  const dayOrders = getOrdersForTimeSlot(day, hour);
                  return (
                    <div 
                      key={`${day.toISOString()}-${hour}`} 
                      className="p-2 border-r min-h-[80px] space-y-1"
                    >
                      {dayOrders.map(order => {
                        const employee = employees.find(emp => emp.id === order.assigned_employee_id);
                        return (
                          <div 
                            key={order.id}
                            className={`p-2 rounded text-xs bg-white border shadow-sm hover:shadow-md cursor-pointer transition-shadow ${getPriorityColor(order.priority)}`}
                          >
                            <div className="font-medium truncate">{order.customer}</div>
                            <div className="text-gray-600 truncate">{order.order_type}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              <span>{order.estimated_duration || 2}t</span>
                            </div>
                            {employee && (
                              <Badge 
                                variant="secondary" 
                                className={`text-xs mt-1 ${getEmployeeColor(employee.id)}`}
                              >
                                <User className="h-3 w-3 mr-1" />
                                {employee.name.split(' ')[0]}
                              </Badge>
                            )}
                            {order.address && (
                              <div className="flex items-center gap-1 text-gray-500 mt-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{order.address}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Medarbejdere</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {employees.map(employee => (
              <Badge 
                key={employee.id}
                variant="secondary"
                className={`${getEmployeeColor(employee.id)} px-3 py-1`}
              >
                <User className="h-4 w-4 mr-2" />
                {employee.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
