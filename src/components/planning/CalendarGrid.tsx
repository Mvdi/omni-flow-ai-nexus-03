import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, User, MapPin, Euro, Ban, Settings, Trash2 } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { OrderDialog } from '@/components/orders/OrderDialog';
import { BlockTimeSlotDialog } from './BlockTimeSlotDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalendarGridProps {
  currentWeek?: Date;
  selectedEmployee?: string;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ 
  currentWeek = new Date(),
  selectedEmployee = 'all'
}) => {
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{date: string, time: string} | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<any>(null);
  
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { blockedSlots, createBlockedSlot, deleteBlockedSlot } = useBlockedTimeSlots();

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

  const weekDates = getWeekDates(currentWeek);
  const weekNumber = getWeekNumber(currentWeek);

  // Generate time slots from 7:00 to 18:00
  const timeSlots = [];
  for (let hour = 7; hour <= 18; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  // Filter orders for the current week and selected employee
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

  // Group orders by date and time
  const ordersByDateTime = weekOrders.reduce((acc, order) => {
    const dateKey = order.scheduled_date!;
    const timeKey = order.scheduled_time?.slice(0, 5) || '08:00';
    
    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][timeKey]) acc[dateKey][timeKey] = [];
    
    acc[dateKey][timeKey].push(order);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  // Group blocked slots by date and time
  const blockedSlotsByDateTime = blockedSlots.reduce((acc, slot) => {
    const dateKey = slot.blocked_date;
    const timeKey = slot.start_time.slice(0, 5);
    
    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][timeKey]) acc[dateKey][timeKey] = [];
    
    acc[dateKey][timeKey].push(slot);
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

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

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  const handleEmptySlotClick = (date: string, time: string) => {
    // Check if this slot is already blocked
    const isBlocked = isTimeSlotBlocked(date, time);
    if (isBlocked) return;

    setSelectedTimeSlot({ date, time });
    setIsBlockDialogOpen(true);
  };

  const handleBlockedSlotClick = (slot: any) => {
    setBlockToDelete(slot);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBlock = async () => {
    if (blockToDelete) {
      await deleteBlockedSlot(blockToDelete.id);
      setDeleteDialogOpen(false);
      setBlockToDelete(null);
      toast.success('Blokering fjernet');
    }
  };

  const handleOrderSave = async (orderData: any) => {
    if (selectedOrder) {
      // Pass the current week to ensure proper week calculation
      const updatedData = {
        ...orderData,
        currentWeek: formatDate(currentWeek)
      };
      await updateOrder(selectedOrder.id, updatedData);
    }
    setIsOrderDialogOpen(false);
    setSelectedOrder(null);
  };

  const handleBlockSlot = async (reason: string, startTime: string, endTime: string) => {
    if (!selectedTimeSlot) return;
    
    await createBlockedSlot({
      blocked_date: selectedTimeSlot.date,
      start_time: startTime,
      end_time: endTime,
      reason: reason
    });
    
    setIsBlockDialogOpen(false);
    setSelectedTimeSlot(null);
  };

  // Check if a time slot is blocked (more precise checking)
  const isTimeSlotBlocked = (date: string, time: string) => {
    const dayBlockedSlots = blockedSlotsByDateTime[date] || {};
    
    // Check if this exact time is blocked OR if this time falls within any blocked period
    for (const [blockedStartTime, slots] of Object.entries(dayBlockedSlots)) {
      for (const slot of slots) {
        const slotStart = slot.start_time.slice(0, 5);
        const slotEnd = slot.end_time.slice(0, 5);
        
        // Check if current time falls within this blocked period
        if (time >= slotStart && time < slotEnd) {
          return true;
        }
      }
    }
    return false;
  };

  return (
    <div className="space-y-4">
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
                    const isBlocked = isTimeSlotBlocked(dateKey, timeSlot);
                    
                    return (
                      <div 
                        key={dayIndex} 
                        className={`p-2 border-r last:border-r-0 min-h-[60px] cursor-pointer hover:bg-gray-50 ${
                          isToday ? 'bg-blue-25' : ''
                        } ${
                          isBlocked ? 'bg-red-50' : ''
                        }`}
                        onClick={() => {
                          if (dayOrders.length === 0 && !isBlocked) {
                            handleEmptySlotClick(dateKey, timeSlot);
                          }
                        }}
                      >
                        {isBlocked && (
                          <div className="mb-1 p-2 rounded-lg bg-red-100 border border-red-300 relative group">
                            <div 
                              className="flex items-center gap-1 text-xs text-red-700 cursor-pointer hover:bg-red-200 rounded p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                const blockedSlot = Object.entries(blockedSlotsByDateTime[dateKey] || {})
                                  .flatMap(([time, slots]) => 
                                    slots.filter(slot => timeSlot >= slot.start_time.slice(0, 5) && timeSlot < slot.end_time.slice(0, 5))
                                  )[0];
                                if (blockedSlot) handleBlockedSlotClick(blockedSlot);
                              }}
                            >
                              <Ban className="h-3 w-3" />
                              <span className="flex-1">Blokeret</span>
                              <Trash2 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-red-600" />
                            </div>
                            {/* Show reason from blocked slot */}
                            {Object.entries(blockedSlotsByDateTime[dateKey] || {}).map(([time, slots]) => 
                              slots.filter(slot => timeSlot >= slot.start_time.slice(0, 5) && timeSlot < slot.end_time.slice(0, 5))
                                .map(slot => slot.reason).filter(Boolean).slice(0, 1)
                                .map((reason, idx) => (
                                  <div key={idx} className="text-xs text-red-600 mt-1 px-1">
                                    {reason}
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                        
                        {dayOrders.map((order, orderIndex) => (
                          <div
                            key={order.id}
                            className="mb-1 p-2 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                            style={{ 
                              backgroundColor: selectedEmployee === 'all' 
                                ? getEmployeeColor(order.assigned_employee_id) + '20'
                                : getStatusColor(order.status) + '20',
                              borderColor: selectedEmployee === 'all' 
                                ? getEmployeeColor(order.assigned_employee_id)
                                : getStatusColor(order.status)
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order);
                            }}
                          >
                            <div className="space-y-1">
                              <div className="font-medium text-sm truncate">{order.customer}</div>
                              <div className="text-xs text-gray-600 truncate">
                                {order.order_type || 'Ingen type'}
                              </div>
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
                        
                        {dayOrders.length === 0 && !isBlocked && (
                          <div className="text-xs text-gray-400 text-center py-4">
                            Klik for at blokere
                          </div>
                        )}
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
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">Status farver:</span>
            {selectedEmployee === 'all' ? (
              <>
                {employees.filter(e => e.is_active).map((employee, index) => (
                  <div key={employee.id} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getEmployeeColor(employee.id) }}
                    />
                    <span className="text-sm">{employee.name}</span>
                  </div>
                ))}
              </>
            ) : (
              statusOptions.map(status => (
                <div key={status.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm">{status.name}</span>
                </div>
              ))
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-300" />
              <span className="text-sm">Blokeret</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern Blokering</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på, at du vil fjerne denne blokering? Dette kan ikke fortrydes.
              {blockToDelete && blockToDelete.reason && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                  <strong>Årsag:</strong> {blockToDelete.reason}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBlock} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Fjern Blokering
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Order Edit Dialog */}
      <OrderDialog
        isOpen={isOrderDialogOpen}
        onClose={() => {
          setIsOrderDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSave={handleOrderSave}
        currentWeek={currentWeek}
      />

      {/* Block Time Slot Dialog */}
      <BlockTimeSlotDialog
        isOpen={isBlockDialogOpen}
        onClose={() => {
          setIsBlockDialogOpen(false);
          setSelectedTimeSlot(null);
        }}
        timeSlot={selectedTimeSlot}
        onBlock={handleBlockSlot}
      />
    </div>
  );
};
