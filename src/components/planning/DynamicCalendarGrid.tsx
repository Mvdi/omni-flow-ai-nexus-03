
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Euro, MapPin, Navigation, Car } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';

interface DynamicCalendarGridProps {
  currentWeek?: Date;
  selectedEmployee?: string;
}

export const DynamicCalendarGrid: React.FC<DynamicCalendarGridProps> = ({ 
  currentWeek = new Date(),
  selectedEmployee = 'all'
}) => {
  const { orders } = useOrders();
  const { employees } = useEmployees();

  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 5; i++) { // Only weekdays
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

  const weekDates = getWeekDates(currentWeek);
  const weekNumber = getWeekNumber(currentWeek);

  // Filter and organize orders by date and employee
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

  // Group orders by date and sort by time
  const ordersByDate = weekOrders.reduce((acc, order) => {
    if (!order.scheduled_date) return acc;
    
    const dateKey = order.scheduled_date;
    if (!acc[dateKey]) acc[dateKey] = [];
    
    acc[dateKey].push(order);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort orders by time within each date
  Object.keys(ordersByDate).forEach(dateKey => {
    ordersByDate[dateKey].sort((a, b) => {
      const timeA = a.scheduled_time || '08:00';
      const timeB = b.scheduled_time || '08:00';
      return timeA.localeCompare(timeB);
    });
  });

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : 'Ikke tildelt';
  };

  const getEmployeeColor = (employeeId: string) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return '#6B7280';
    const index = employees.findIndex(e => e.id === employeeId);
    return colors[index % colors.length];
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const calculateTravelTime = (prevOrder: any, currentOrder: any) => {
    if (!prevOrder) return 15; // Initial travel from home
    return currentOrder.travel_time_minutes || 15; // Default 15 min travel
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className="grid grid-cols-5 border-b bg-gray-50">
                {weekDates.map((date, index) => (
                  <div key={index} className="p-4 border-r last:border-r-0">
                    <div className="font-medium text-gray-900">
                      {date.toLocaleDateString('da-DK', { weekday: 'long' })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {date.getDate()}/{date.getMonth() + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Time Rows */}
              <div className="grid grid-cols-5 min-h-[600px]">
                {weekDates.map((date, dayIndex) => {
                  const dateKey = formatDate(date);
                  const dayOrders = ordersByDate[dateKey] || [];
                  const isToday = formatDate(date) === formatDate(new Date());
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className={`border-r last:border-r-0 p-3 space-y-2 ${
                        isToday ? 'bg-blue-25' : 'bg-white'
                      }`}
                    >
                      {dayOrders.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                          Ingen ordrer planlagt
                        </div>
                      ) : (
                        dayOrders.map((order, orderIndex) => {
                          const employeeColor = getEmployeeColor(order.assigned_employee_id);
                          const startTime = formatTime(order.scheduled_time || '08:00');
                          const duration = order.estimated_duration || 60;
                          const endTime = calculateEndTime(startTime, duration);
                          const travelTime = calculateTravelTime(dayOrders[orderIndex - 1], order);
                          
                          return (
                            <div key={order.id} className="space-y-1">
                              {/* Travel Time Block (if not first order) */}
                              {orderIndex > 0 && (
                                <div className="p-2 rounded-lg bg-gray-100 border border-gray-300">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <Car className="h-3 w-3" />
                                    <span>Kørsel ({travelTime} min)</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Order Block */}
                              <div
                                className="p-3 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                style={{ 
                                  backgroundColor: employeeColor + '20',
                                  borderColor: employeeColor,
                                  borderLeftWidth: '4px'
                                }}
                              >
                                <div className="space-y-2">
                                  {/* Time Range */}
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-gray-900">
                                      {startTime} - {endTime}
                                    </div>
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs"
                                      style={{ backgroundColor: employeeColor + '30' }}
                                    >
                                      {duration} min
                                    </Badge>
                                  </div>
                                  
                                  {/* Customer */}
                                  <div className="font-medium text-gray-900">
                                    {order.customer}
                                  </div>
                                  
                                  {/* Service Type */}
                                  <div className="text-sm text-gray-600">
                                    {order.order_type || 'Service'}
                                  </div>
                                  
                                  {/* Address */}
                                  {order.address && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <MapPin className="h-3 w-3" />
                                      <span className="truncate">{order.address}</span>
                                    </div>
                                  )}
                                  
                                  {/* Employee and Price */}
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {getEmployeeName(order.assigned_employee_id)}
                                    </span>
                                    <span className="flex items-center gap-1 font-medium">
                                      <Euro className="h-3 w-3" />
                                      {order.price} kr
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-sm font-medium">Legend:</span>
            {selectedEmployee === 'all' ? (
              <>
                {employees.filter(e => e.is_active).map((employee, index) => (
                  <div key={employee.id} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-3 rounded"
                      style={{ backgroundColor: getEmployeeColor(employee.id) }}
                    />
                    <span className="text-sm">{employee.name}</span>
                  </div>
                ))}
              </>
            ) : null}
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded bg-gray-300" />
              <span className="text-sm">Kørsel</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
