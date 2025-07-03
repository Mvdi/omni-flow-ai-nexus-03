import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User,
  Ban,
  Plus,
  Zap,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useOrders, Order } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useAuth } from '@/hooks/useAuth';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
  isBlocked: boolean;
  isWorking: boolean;
}

interface DayColumn {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  orders: Order[];
  revenue: number;
}

export const FensterCalendar = () => {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [weekColumns, setWeekColumns] = useState<DayColumn[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{date: string, time: string} | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState(15);
  const [deleteBlockDialog, setDeleteBlockDialog] = useState(false);
  const [selectedBlockToDelete, setSelectedBlockToDelete] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'week' | '5day' | 'day'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [optimizationStatus, setOptimizationStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  
  const { orders, updateOrder, refetch: refetchOrders } = useOrders();
  const { employees } = useEmployees();
  const { workSchedules } = useWorkSchedules();
  const { blockedSlots, createBlockedSlot, deleteBlockedSlot } = useBlockedTimeSlots();
  const { user } = useAuth();

  // Enhanced PRP-style optimization
  const triggerEnhancedOptimization = async () => {
    if (!user) return;
    
    setOptimizationStatus('running');
    try {
      const response = await supabase.functions.invoke('enhanced-intelligent-planner', {
        body: { 
          userId: user.id,
          triggerType: 'manual',
          optimizationType: 'weekly'
        }
      });
      
      if (response.data?.success) {
        toast.success(`✅ PRP Optimering færdig: ${response.data.stats?.ordersOptimized || 0} ordrer optimeret`);
        setOptimizationStatus('completed');
        refetchOrders();
      } else {
        throw new Error(response.data?.error || 'Optimering fejlede');
      }
    } catch (error) {
      console.error('Enhanced optimization error:', error);
      toast.error('Optimering fejlede');
      setOptimizationStatus('idle');
    }
  };

  const triggerDailyScheduler = async () => {
    if (!user) return;
    
    try {
      const response = await supabase.functions.invoke('fenster-daily-scheduler');
      
      if (response.data?.success) {
        toast.success(`🤖 Daglig planlægning: ${response.data.stats?.ordersCreated || 0} nye ordrer oprettet`);
        refetchOrders();
      }
    } catch (error) {
      console.error('Daily scheduler error:', error);
      toast.error('Daglig planlægning fejlede');
    }
  };

  // Auto-trigger enhanced optimization on mount
  useEffect(() => {
    if (user && orders.length > 0) {
      // Check for unplanned orders and auto-optimize
      const unplannedOrders = orders.filter(order => 
        order.status === 'Ikke planlagt' || !order.assigned_employee_id
      );
      
      if (unplannedOrders.length > 0) {
        setTimeout(() => triggerEnhancedOptimization(), 1000);
      }
    }
  }, [user, orders.length]);

  // Generate time slots based on work schedules
  useEffect(() => {
    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      
      // Get work schedule for selected employee or use global schedule
      let startHour = 7;
      let endHour = 16;
      
      if (selectedEmployee !== 'all') {
        const employee = employees.find(e => e.id === selectedEmployee);
        if (employee) {
          // Get work schedule for Monday (1) as default - can be enhanced to check day-specific schedules
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
      
      // Generate 15-minute intervals for proper duration display
      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          if (hour === endHour && minute > 0) break;
          
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push({
            time: timeString,
            hour,
            minute,
            isBlocked: false,
            isWorking: true
          });
        }
      }
      
      setTimeSlots(slots);
    };

    generateTimeSlots();
  }, [selectedEmployee, employees, workSchedules]);

  // Generate columns based on view mode
  useEffect(() => {
    const generateColumns = () => {
      let columns: DayColumn[] = [];
      const today = new Date();
      
      if (viewMode === 'day') {
        // Single day view
        const dateString = selectedDate.toISOString().split('T')[0];
        const dayOrders = orders.filter(order => {
          if (order.scheduled_date !== dateString) return false;
          if (selectedEmployee !== 'all') {
            return order.assigned_employee_id === selectedEmployee;
          }
          return true;
        }).sort((a, b) => {
          const timeA = a.scheduled_time || '00:00';
          const timeB = b.scheduled_time || '00:00';
          return timeA.localeCompare(timeB);
        });

        columns.push({
          date: dateString,
          dayName: selectedDate.toLocaleDateString('da-DK', { weekday: 'short' }).toUpperCase(),
          dayNumber: selectedDate.getDate(),
          isToday: dateString === today.toISOString().split('T')[0],
          orders: dayOrders,
          revenue: dayOrders.reduce((sum, order) => sum + order.price, 0)
        });
      } else {
        // Week or 5-day view
        const monday = new Date(selectedWeek);
        monday.setDate(selectedWeek.getDate() - selectedWeek.getDay() + 1);
        
        const dayNames = ['MAN.', 'TIR.', 'ONS.', 'TOR.', 'FRE.', 'LØR.', 'SØN.'];
        const daysToShow = viewMode === '5day' ? 5 : 7;
        
        for (let i = 0; i < daysToShow; i++) {
          const currentDate = new Date(monday);
          currentDate.setDate(monday.getDate() + i);
          const dateString = currentDate.toISOString().split('T')[0];
          
          const dayOrders = orders.filter(order => {
            if (order.scheduled_date !== dateString) return false;
            if (selectedEmployee !== 'all') {
              return order.assigned_employee_id === selectedEmployee;
            }
            return true;
          }).sort((a, b) => {
            const timeA = a.scheduled_time || '00:00';
            const timeB = b.scheduled_time || '00:00';
            return timeA.localeCompare(timeB);
          });

          columns.push({
            date: dateString,
            dayName: dayNames[i],
            dayNumber: currentDate.getDate(),
            isToday: dateString === today.toISOString().split('T')[0],
            orders: dayOrders,
            revenue: dayOrders.reduce((sum, order) => sum + order.price, 0)
          });
        }
      }
      
      setWeekColumns(columns);
    };

    generateColumns();
  }, [selectedWeek, selectedDate, selectedEmployee, orders, viewMode]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  // Enhanced drag and drop with manual edit tracking
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const orderId = draggableId;
    
    // Parse destination info (date_time format)
    const [destDate, destTime] = destination.droppableId.split('_');
    
    try {
      // Update order with manual edit flag
      await updateOrder(orderId, {
        scheduled_date: destDate,
        scheduled_time: destTime,
        status: 'Planlagt'
        // edited_manually will be set automatically by database trigger
      });
      
      toast.success('📍 Ordre flyttet manuelt - vil ikke blive auto-optimeret');
      
      // Trigger re-optimization for the affected day (excluding manually edited orders)
      if (user) {
        supabase.functions.invoke('enhanced-intelligent-planner', {
          body: { 
            userId: user.id,
            triggerType: 'manual_edit_reoptimize',
            optimizationType: 'daily',
            targetDate: destDate
          }
        }).catch(console.error);
      }
    } catch (error) {
      toast.error('Kunne ikke flytte ordre');
      console.error('Drag and drop error:', error);
    }
  };

  // Block time slot with custom duration
  const handleBlockTimeSlot = async () => {
    if (!selectedTimeSlot || !blockReason.trim()) return;

    try {
      const endTime = addMinutesToTime(selectedTimeSlot.time, blockDuration);
      
      await createBlockedSlot({
        blocked_date: selectedTimeSlot.date,
        start_time: selectedTimeSlot.time,
        end_time: endTime,
        reason: blockReason,
        employee_id: selectedEmployee !== 'all' ? selectedEmployee : null
      });
      
      toast.success(`Tidsrum blokeret i ${blockDuration} minutter`);
      setBlockDialogOpen(false);
      setBlockReason('');
      setBlockDuration(15);
    } catch (error) {
      toast.error('Kunne ikke blokere tidsrum');
    }
  };

  // Delete blocked time slot
  const handleDeleteBlock = async () => {
    if (!selectedBlockToDelete) return;

    try {
      await deleteBlockedSlot(selectedBlockToDelete.id);
      toast.success('Blokeret tidsrum slettet');
      setDeleteBlockDialog(false);
      setSelectedBlockToDelete(null);
    } catch (error) {
      toast.error('Kunne ikke slette blokeret tidsrum');
    }
  };

  const addMinutesToTime = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

  const getOrderForTimeSlot = (date: string, time: string) => {
    const column = weekColumns.find(col => col.date === date);
    if (!column) return null;
    
    return column.orders.find(order => {
      if (!order.scheduled_time) return false;
      const orderTime = order.scheduled_time.substring(0, 5);
      
      // Check if this time slot is within the order's duration
      const orderStartMinutes = timeToMinutes(orderTime);
      const slotMinutes = timeToMinutes(time);
      const orderDuration = order.estimated_duration || 60;
      
      return slotMinutes >= orderStartMinutes && slotMinutes < orderStartMinutes + orderDuration;
    });
  };

  const timeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isOrderStartSlot = (date: string, time: string, order: any): boolean => {
    if (!order.scheduled_time) return false;
    const orderTime = order.scheduled_time.substring(0, 5);
    return orderTime === time;
  };

  const getOrderHeight = (order: any): number => {
    const duration = order.estimated_duration || 60;
    const slots = Math.ceil(duration / 15); // 15-minute intervals
    return slots * 60; // 60px per slot
  };

  const getBlockedSlotForTime = (date: string, time: string) => {
    return blockedSlots.find(slot => 
      slot.blocked_date === date && 
      time >= slot.start_time.substring(0, 5) && 
      time < slot.end_time.substring(0, 5) &&
      (!slot.employee_id || slot.employee_id === selectedEmployee)
    );
  };

  const isTimeSlotBlocked = (date: string, time: string): boolean => {
    return !!getBlockedSlotForTime(date, time);
  };

  const getWeekInfo = () => {
    const weekNum = Math.ceil((selectedWeek.getTime() - new Date(selectedWeek.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return {
      weekNumber: weekNum,
      month: selectedWeek.toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
    };
  };

  const weekInfo = getWeekInfo();
  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <div className="h-full flex flex-col">
      {/* Enhanced PRP Header with view modes and optimization controls */}
      <div className="border-b border-border bg-background">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => viewMode === 'day' ? setSelectedDate(new Date(selectedDate.getTime() - 86400000)) : navigateWeek('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[120px]">
                {viewMode === 'day' ? (
                  <>
                    <h2 className="text-lg font-bold">{selectedDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' })}</h2>
                    <p className="text-xs text-muted-foreground">{selectedDate.toLocaleDateString('da-DK', { weekday: 'long' })}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold capitalize">{weekInfo.month}</h2>
                    <p className="text-xs text-muted-foreground">UGE {weekInfo.weekNumber}</p>
                  </>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => viewMode === 'day' ? setSelectedDate(new Date(selectedDate.getTime() + 86400000)) : navigateWeek('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | '5day' | 'day')}>
              <TabsList className="grid w-[300px] grid-cols-3">
                <TabsTrigger value="day">Dag</TabsTrigger>
                <TabsTrigger value="5day">5-Dage</TabsTrigger>
                <TabsTrigger value="week">Uge</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="flex items-center gap-2">
            {/* PRP Optimization Controls */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={triggerDailyScheduler}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Daglig Sync
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={triggerEnhancedOptimization}
              disabled={optimizationStatus === 'running'}
              className="gap-2"
            >
              {optimizationStatus === 'running' ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Optimerer...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  PRP Optimering
                </>
              )}
            </Button>
            
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              I dag
            </Button>
            
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-40">
                <SelectValue />
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

        {/* PRP Status Bar */}
        <div className="px-4 py-2 bg-muted/30 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">📊 PRP Fenster-Style Planning:</span>
              <Badge variant={optimizationStatus === 'completed' ? 'default' : 'secondary'} className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {optimizationStatus === 'completed' ? 'Optimeret' : 'Klar til optimering'}
              </Badge>
              {orders.filter(o => o.status === 'Ikke planlagt').length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {orders.filter(o => o.status === 'Ikke planlagt').length} uplanlagte
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground">
              Total omsætning {viewMode === 'day' ? 'i dag' : 'denne uge'}: Kr. {weekColumns.reduce((sum, col) => sum + col.revenue, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Calendar Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 bg-background">
          {/* Dynamic Header Row */}
          <div className={`grid ${viewMode === 'day' ? 'grid-cols-2' : `grid-cols-${weekColumns.length + 1}`} border-b border-border sticky top-0 bg-background z-10`}>
            <div className="p-2 bg-muted text-center text-sm font-medium border-r border-border">
              {viewMode === 'day' ? 'TID' : `UGE ${weekInfo.weekNumber}`}
            </div>
            {weekColumns.map((column) => (
              <div key={column.date} className={`p-2 text-center border-r border-border last:border-r-0 ${column.isToday ? 'bg-primary/10' : 'bg-muted'}`}>
                <div className="text-sm font-medium">{column.dayName}</div>
                <div className="text-lg font-bold">{column.dayNumber}</div>
                <div className="text-xs text-muted-foreground">
                  Kr. {column.revenue.toLocaleString()}
                </div>
                {viewMode === 'day' && column.orders.length > 0 && (
                  <div className="text-xs text-primary font-medium">
                    {column.orders.length} ordrer
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
            {timeSlots.map((slot) => (
              <div key={slot.time} className={`grid ${viewMode === 'day' ? 'grid-cols-2' : `grid-cols-${weekColumns.length + 1}`} border-b border-border min-h-[60px]`}>
                {/* Time Label */}
                <div className="p-2 bg-muted text-center text-sm font-medium border-r border-border">
                  {slot.time}
                </div>

                {weekColumns.map((column) => {
                  const order = getOrderForTimeSlot(column.date, slot.time);
                  const isBlocked = isTimeSlotBlocked(column.date, slot.time);
                  const blockedSlot = getBlockedSlotForTime(column.date, slot.time);
                  
                  return (
                    <Droppable 
                      key={`${column.date}_${slot.time}`}
                      droppableId={`${column.date}_${slot.time}`}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`relative p-1 border-l border-border min-h-[60px] ${
                                snapshot.isDraggingOver ? 'bg-primary/20' : 
                                isBlocked ? 'bg-blue-100' :
                                column.isToday ? 'bg-primary/5' : 'bg-background'
                              }`}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (!order && !isBlocked) {
                                  setSelectedTimeSlot({ date: column.date, time: slot.time });
                                  setBlockDialogOpen(true);
                                }
                              }}
                            >
                              {order && isOrderStartSlot(column.date, slot.time, order) && (
                                <Draggable draggableId={order.id} index={0}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`absolute inset-1 p-3 rounded-lg shadow-sm ${
                                        snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                                      } ${
                                        !order.assigned_employee_id 
                                          ? 'bg-orange-50 border-2 border-orange-300 border-dashed' 
                                          : 'bg-white border border-border'
                                      }`}
                                      style={{
                                        height: `${getOrderHeight(order)}px`,
                                        zIndex: 10
                                      }}
                                    >
                                      {/* Customer name - prominent at top */}
                                      <div className="font-semibold text-foreground text-base mb-1">
                                        {order.customer}
                                      </div>
                                      
                                      {/* Address */}
                                      <div className="text-sm text-muted-foreground mb-2 leading-tight">
                                        {order.address || 'Ingen adresse'}
                                      </div>
                                      
                                      {/* PRP Status indicators */}
                                      <div className="flex gap-1 mb-2">
                                        {order.edited_manually && (
                                          <Badge variant="outline" className="text-xs px-1 py-0">
                                            Manual
                                          </Badge>
                                        )}
                                        {order.optimization_run_id && (
                                          <Badge variant="secondary" className="text-xs px-1 py-0">
                                            Auto
                                          </Badge>
                                        )}
                                        {order.subscription_id && (
                                          <Badge variant="default" className="text-xs px-1 py-0">
                                            Abon
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {/* Bottom row - price and duration */}
                                      <div className="flex justify-between items-center">
                                        <div className="text-sm font-semibold text-foreground">
                                          Kr. {order.price.toLocaleString()}
                                        </div>
                                        {order.estimated_duration && (
                                          <div className="text-sm text-muted-foreground">
                                            {order.estimated_duration} min
                                          </div>
                                        )}
                                      </div>
                                      
                                      {!order.assigned_employee_id && (
                                        <div className="text-xs text-orange-600 font-medium mt-1">Ikke tildelt</div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              )}
                          
                          {isBlocked && blockedSlot && (
                            <div 
                              className="absolute inset-1 bg-blue-200/80 border border-blue-300 rounded p-2 cursor-pointer hover:bg-blue-200"
                              onClick={() => {
                                setSelectedBlockToDelete(blockedSlot);
                                setDeleteBlockDialog(true);
                              }}
                              title={`Blokeret: ${blockedSlot.reason || 'Ingen årsag'}`}
                            >
                              <div className="flex items-center justify-center h-full">
                                <Ban className="h-4 w-4 text-blue-600 mr-1" />
                                <div className="text-xs text-blue-800 font-medium truncate">
                                  {blockedSlot.reason || 'Blokeret'}
                                </div>
                              </div>
                            </div>
                          )}
                          
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

      {/* Block Time Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloker Tidsrum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Dato og tid</Label>
              <Input 
                value={selectedTimeSlot ? `${selectedTimeSlot.date} ${selectedTimeSlot.time}` : ''} 
                disabled 
              />
            </div>
            <div>
              <Label>Varighed</Label>
              <Select value={blockDuration.toString()} onValueChange={(value) => setBlockDuration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutter</SelectItem>
                  <SelectItem value="30">30 minutter</SelectItem>
                  <SelectItem value="60">1 time</SelectItem>
                  <SelectItem value="120">2 timer</SelectItem>
                  <SelectItem value="240">4 timer</SelectItem>
                  <SelectItem value="480">8 timer (hele dagen)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Årsag</Label>
              <Textarea 
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Indtast årsag til blokering..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                Annuller
              </Button>
              <Button onClick={handleBlockTimeSlot} disabled={!blockReason.trim()}>
                Bloker Tidsrum
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Block Dialog */}
      <Dialog open={deleteBlockDialog} onOpenChange={setDeleteBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slet Blokeret Tidsrum</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Er du sikker på at du vil slette denne blokering?</p>
            {selectedBlockToDelete && (
              <div className="bg-blue-50 p-3 rounded">
                <p><strong>Dato:</strong> {selectedBlockToDelete.blocked_date}</p>
                <p><strong>Tid:</strong> {selectedBlockToDelete.start_time} - {selectedBlockToDelete.end_time}</p>
                <p><strong>Årsag:</strong> {selectedBlockToDelete.reason || 'Ingen årsag'}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteBlockDialog(false)}>
                Annuller
              </Button>
              <Button variant="destructive" onClick={handleDeleteBlock}>
                Slet Blokering
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};