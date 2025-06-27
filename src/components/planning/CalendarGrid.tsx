
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Euro } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';

interface CalendarGridProps {
  currentWeek?: Date;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ currentWeek = new Date() }) => {
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  
  const { orders } = useOrders();
  const { employees } = useEmployees();

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
    for (let i = 0; i < 5; i++) { // Only weekdays
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDates.push(day);
    }
    return weekDates;
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

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const weekDates = getWeekDates(selectedWeek);
  const weekNumber = getWeekNumber(selectedWeek);

  // Generate time slots from 7:00 to 18:00
  const timeSlots = [];
  for (let hour = 7; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  // Filter orders for the current week
  const weekOrders = orders.filter(order => {
    if (!order.scheduled_date) return false;
    const orderDate = new Date(order.scheduled_date);
    return weekDates.some(weekDate => 
      formatDate(orderDate) === formatDate(weekDate)
    );
  });

  // Group orders by date and time
  const ordersByDateTime = weekOrders.reduce((acc, order) => {
    const dateKey = order.scheduled_date!;
    const timeKey = order.scheduled_time?.slice(0, 5) || '08:00';
    
    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][timeKey]) acc[dateKey][timeKey] = [];
    
    acc[dateKey][timeKey].push(order);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : 'Ikke tildelt';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Kalender - Uge {weekNumber}, {selectedWeek.getFullYear()}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {weekDates[0].toLocaleDateString('da-DK')} - {weekDates[4].toLocaleDateString('da-DK')}
              </p>
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
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className="grid grid-cols-6 border-b bg-gray-50">
                <div className="p-3 font-medium text-gray-700 border-r">Tid</div>
                {weekDates.map((date, index) => (
                  <div key={index} className="p-3 border-r last:border-r-0">
                    <div className="font-medium text-gray-900">
                      {date.toLocaleDateString('da-DK', { weekday: 'short' })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {date.getDate()}/{date.getMonth() + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              {timeSlots.map((timeSlot, timeIndex) => (
                <div key={timeSlot} className={`grid grid-cols-6 border-b ${timeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                  {/* Time Column */}
                  <div className="p-3 border-r font-medium text-gray-700 bg-gray-50">
                    {timeSlot}
                  </div>
                  
                  {/* Day Columns */}
                  {weekDates.map((date, dayIndex) => {
                    const dateKey = formatDate(date);
                    const dayOrders = ordersByDateTime[dateKey]?.[timeSlot] || [];
                    const isToday = formatDate(date) === formatDate(new Date());
                    
                    return (
                      <div 
                        key={dayIndex} 
                        className={`p-2 border-r last:border-r-0 min-h-[60px] ${isToday ? 'bg-blue-25' : ''}`}
                      >
                        {dayOrders.map((order, orderIndex) => (
                          <div
                            key={order.id}
                            className="mb-1 p-2 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            style={{ 
                              backgroundColor: getStatusColor(order.status) + '20',
                              borderColor: getStatusColor(order.status)
                            }}
                          >
                            <div className="space-y-1">
                              <div className="font-medium text-sm truncate">{order.customer}</div>
                              <div className="text-xs text-gray-600 truncate">{order.order_type}</div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {getEmployeeName(order.assigned_employee_id)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Euro className="h-3 w-3" />
                                  {order.price}
                                </span>
                              </div>
                              {order.estimated_duration && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {order.estimated_duration} min
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Status farver:</span>
            {statusOptions.map(status => (
              <div key={status.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-sm">{status.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
