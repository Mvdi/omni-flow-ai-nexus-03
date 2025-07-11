import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Euro, MapPin, Car, RotateCcw, Calendar, Truck } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

interface TimelineCalendarProps {
  currentWeek?: Date;
  selectedEmployee?: string;
}

export const TimelineCalendar: React.FC<TimelineCalendarProps> = ({ 
  currentWeek = new Date(),
  selectedEmployee = 'all'
}) => {
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { workSchedules } = useWorkSchedules();

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
      'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 
      'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))',
      'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--destructive))',
      'hsl(var(--warning))'
    ];
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return 'hsl(var(--muted))';
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

  // Generate time slots based on work schedules
  const getTimeSlots = () => {
    let startHour = 7;
    let endHour = 16;
    
    if (selectedEmployee !== 'all') {
      const employee = employees.find(e => e.id === selectedEmployee);
      if (employee) {
        const schedule = workSchedules.find(ws => 
          ws.employee_id === employee.id && ws.day_of_week === 1 && ws.is_working_day
        );
        if (schedule) {
          startHour = parseInt(schedule.start_time.split(':')[0]);
          endHour = parseInt(schedule.end_time.split(':')[0]);
        }
      }
    } else {
      // When viewing all employees, find the earliest start and latest end time
      const allSchedules = workSchedules.filter(ws => ws.is_working_day);
      if (allSchedules.length > 0) {
        const startTimes = allSchedules.map(ws => parseInt(ws.start_time.split(':')[0]));
        const endTimes = allSchedules.map(ws => parseInt(ws.end_time.split(':')[0]));
        startHour = Math.min(...startTimes);
        endHour = Math.max(...endTimes);
      }
    }
    
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };
  
  const timeSlots = getTimeSlots();

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    
    if (!destination) return;
    
    // Extract order ID and find the order
    const orderId = draggableId;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Check if it's a subscription order and prevent date changes
    if (order.subscription_id && destination.droppableId !== source.droppableId) {
      toast.error('Abonnement-ordrer kan ikke flyttes til andre dage - kun tidspunkt kan ændres');
      return;
    }

    // Parse destination
    const [destDate, destTimeSlot] = destination.droppableId.split('_');
    const newScheduledTime = destTimeSlot || order.scheduled_time;
    
    // Update order
    const updateData: any = {
      scheduled_time: newScheduledTime
    };

    // Only update date if it's not a subscription order
    if (!order.subscription_id) {
      updateData.scheduled_date = destDate;
    }

    try {
      await updateOrder(orderId, updateData);
      toast.success('Ordre flyttet');
    } catch (error) {
      toast.error('Kunne ikke flytte ordre');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Timeline Planlægning</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header Row */}
                <div className="grid grid-cols-6 border-b bg-muted/50">
                  <div className="p-3 border-r font-medium text-sm">Tid</div>
                  {weekDates.map((date, index) => (
                    <div key={index} className="p-3 border-r last:border-r-0">
                      <div className="font-medium text-foreground">
                        {date.toLocaleDateString('da-DK', { weekday: 'short' })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {date.getDate()}/{date.getMonth() + 1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline Grid */}
                {timeSlots.map((timeSlot) => (
                  <div key={timeSlot} className="grid grid-cols-6 border-b hover:bg-muted/30">
                    {/* Time Column */}
                    <div className="p-3 border-r bg-muted/20 text-sm font-medium text-center">
                      {timeSlot}
                    </div>
                    
                    {/* Day Columns */}
                    {weekDates.map((date, dayIndex) => {
                      const dateKey = formatDate(date);
                      const dayOrders = ordersByDate[dateKey] || [];
                      const isToday = formatDate(date) === formatDate(new Date());
                      const droppableId = `${dateKey}_${timeSlot}`;
                      
                      // Find orders that should be in this time slot
                      const slotOrders = dayOrders.filter(order => {
                        const orderTime = formatTime(order.scheduled_time || '08:00');
                        return orderTime === timeSlot;
                      });
                      
                      return (
                        <Droppable key={droppableId} droppableId={droppableId}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-2 border-r last:border-r-0 min-h-[60px] ${
                                isToday ? 'bg-primary/5' : 'bg-background'
                              } ${
                                snapshot.isDraggingOver ? 'bg-primary/10' : ''
                              }`}
                            >
                              {slotOrders.map((order, orderIndex) => {
                                const employeeColor = getEmployeeColor(order.assigned_employee_id);
                                const duration = order.estimated_duration || 60;
                                
                                return (
                                  <Draggable 
                                    key={order.id} 
                                    draggableId={order.id} 
                                    index={orderIndex}
                                  >
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                         className={`p-3 mb-1 rounded-lg border shadow-sm cursor-grab bg-white ${
                                           snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                                         } ${
                                           order.subscription_id ? 'border-dashed border-2' : 'border-solid'
                                         }`}
                                         style={{
                                           borderColor: employeeColor,
                                           ...provided.draggableProps.style
                                         }}
                                       >
                                         {/* Customer name - prominent at top */}
                                         <div className="font-semibold text-foreground text-base mb-1">
                                           {order.customer}
                                         </div>
                                         
                                         {/* Address */}
                                         <div className="text-sm text-muted-foreground mb-3 leading-tight">
                                           {order.address || 'Ingen adresse'}
                                         </div>
                                         
                                         {/* Bottom row - price and duration only */}
                                         <div className="flex justify-between items-center">
                                           <div className="text-sm font-semibold text-foreground">
                                             Kr. {order.price.toLocaleString()}
                                           </div>
                                           <div className="text-sm text-muted-foreground">
                                             {duration} min
                                           </div>
                                         </div>
                                         
                                         {/* Subscription indicator */}
                                         {order.subscription_id && (
                                           <Badge variant="outline" className="text-xs w-fit mt-2">
                                             <RotateCcw className="h-3 w-3 mr-1" />
                                             Abon
                                           </Badge>
                                         )}
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-sm font-medium">Forklaring:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border-2 border-dashed border-primary/50" />
              <span className="text-sm">Abonnement (fast dato)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 rounded border border-muted-foreground" />
              <span className="text-sm">Fleksibel ordre</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};