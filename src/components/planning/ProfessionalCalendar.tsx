import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  DollarSign,
  User,
  Route,
  AlertCircle
} from 'lucide-react';
import { useOrders, Order } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useRoutes } from '@/hooks/useRoutes';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface DaySchedule {
  date: string;
  dayName: string;
  orders: Order[];
  timeSlots: TimeSlot[];
}

export const ProfessionalCalendar = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { routes } = useRoutes();

  // Generate week schedule
  useEffect(() => {
    const generateWeekSchedule = () => {
      const monday = new Date(selectedWeek);
      monday.setDate(selectedWeek.getDate() - selectedWeek.getDay() + 1);
      
      const schedule: DaySchedule[] = [];
      const dayNames = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];
      
      for (let i = 0; i < 5; i++) {
        const currentDate = new Date(monday);
        currentDate.setDate(monday.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        // Filter orders for this day and employee
        const dayOrders = orders.filter(order => {
          if (order.scheduled_date !== dateString) return false;
          if (selectedEmployee !== 'all' && order.assigned_employee_id !== selectedEmployee) return false;
          return true;
        }).sort((a, b) => {
          const timeA = a.scheduled_time || '00:00';
          const timeB = b.scheduled_time || '00:00';
          return timeA.localeCompare(timeB);
        });

        // Generate time slots (8:00 - 17:00)
        const timeSlots: TimeSlot[] = [];
        for (let hour = 8; hour < 17; hour++) {
          const time = `${hour.toString().padStart(2, '0')}:00`;
          const hasOrder = dayOrders.some(order => order.scheduled_time?.startsWith(`${hour.toString().padStart(2, '0')}:`));
          timeSlots.push({ time, available: !hasOrder });
        }
        
        schedule.push({
          date: dateString,
          dayName: dayNames[i],
          orders: dayOrders,
          timeSlots
        });
      }
      
      setWeekSchedule(schedule);
    };

    generateWeekSchedule();
  }, [selectedWeek, selectedEmployee, orders]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  // Drag and drop handler
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    const orderId = draggableId;
    
    // Parse destination info
    const [destDate, destTime] = destination.droppableId.split('_');
    
    try {
      // Update order with new schedule
      await updateOrder(orderId, {
        scheduled_date: destDate,
        scheduled_time: destTime,
        status: 'Planlagt'
      });
      
      toast.success('Ordre flyttet succesfuldt');
    } catch (error) {
      toast.error('Kunne ikke flytte ordre');
      console.error('Drag and drop error:', error);
    }
  };

  const getOrderColor = (order: Order) => {
    if (order.subscription_id) return 'bg-blue-100 border-blue-300 text-blue-800';
    if (order.priority === 'Kritisk') return 'bg-red-100 border-red-300 text-red-800';
    if (order.priority === 'Høj') return 'bg-orange-100 border-orange-300 text-orange-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const getWeekInfo = () => {
    const monday = new Date(selectedWeek);
    monday.setDate(selectedWeek.getDate() - selectedWeek.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekNum = Math.ceil((selectedWeek.getTime() - new Date(selectedWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    return {
      weekNumber: weekNum,
      dateRange: `${monday.toLocaleDateString('da-DK')} - ${sunday.toLocaleDateString('da-DK')}`
    };
  };

  const weekInfo = getWeekInfo();
  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Uge {weekInfo.weekNumber} - {selectedWeek.getFullYear()}
                </CardTitle>
                <p className="text-muted-foreground">{weekInfo.dateRange}</p>
              </div>
              
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
            
            <div className="flex items-center gap-4">
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
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Professional Calendar Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-4">
          {weekSchedule.map((day, dayIndex) => (
            <Card key={day.date} className="min-h-[600px]">
              <CardHeader className="pb-4">
                <CardTitle className="text-center">
                  <div className="text-lg font-bold">{day.dayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('da-DK', { day: '2-digit', month: '2-digit' })}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {day.orders.length} ordrer
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-2">
                {/* Time slots with orders */}
                {day.timeSlots.map((slot, slotIndex) => {
                  const slotOrders = day.orders.filter(order => 
                    order.scheduled_time?.startsWith(slot.time.substring(0, 2))
                  );
                  
                  return (
                    <Droppable 
                      key={`${day.date}_${slot.time}`} 
                      droppableId={`${day.date}_${slot.time}`}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[60px] p-2 border-2 border-dashed rounded-lg transition-colors ${
                            snapshot.isDraggingOver 
                              ? 'border-primary bg-primary/10' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {slot.time}
                          </div>
                          
                          {slotOrders.map((order, orderIndex) => (
                            <Draggable key={order.id} draggableId={order.id} index={orderIndex}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-2 mb-2 rounded-lg border-2 transition-all ${getOrderColor(order)} ${
                                    snapshot.isDragging ? 'shadow-lg rotate-3' : 'hover:shadow-md'
                                  }`}
                                >
                                  <div className="font-medium text-sm">{order.customer}</div>
                                  <div className="text-xs space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {order.scheduled_time} ({order.estimated_duration || 60} min)
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      {order.price.toLocaleString()} kr
                                    </div>
                                    {order.address && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        <span className="truncate">{order.address}</span>
                                      </div>
                                    )}
                                    {order.assigned_employee_id && (
                                      <div className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {activeEmployees.find(e => e.id === order.assigned_employee_id)?.name}
                                      </div>
                                    )}
                                    {order.subscription_id && (
                                      <Badge variant="secondary" className="text-xs">
                                        Abonnement
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </DragDropContext>

      {/* Calendar Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Forklaring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
              <span className="text-sm">Abonnement ordre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-sm">Kritisk prioritet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
              <span className="text-sm">Høj prioritet</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-sm">Normal/lav prioritet</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};