import { useState, useCallback } from 'react';
import { useOrders, Order } from './useOrders';
import { useEmployees } from './useEmployees';
import { useRoutes } from './useRoutes';
import { toast } from 'sonner';

// Smart planner inspired by Fenster system
export const useSmartPlanner = () => {
  const [isPlanning, setIsPlanning] = useState(false);
  const { orders, updateOrder } = useOrders();
  const { employees } = useEmployees();
  const { createRoute } = useRoutes();

  // SMART RULE: Only plan completely new orders (no date, time, or employee)
  const getOrdersNeedingPlanning = useCallback((allOrders: Order[]) => {
    return allOrders.filter(order => {
      // Never touch completed orders
      if (order.status === 'Afsluttet' || order.status === 'Færdig') return false;
      
      // CRITICAL: NEVER touch subscription orders that have ANY scheduling info
      if (order.subscription_id) {
        // Only plan subscription orders that are COMPLETELY blank
        return !order.scheduled_date && !order.scheduled_time && !order.assigned_employee_id;
      }
      
      // For regular orders: only plan if completely unscheduled
      return !order.scheduled_date && !order.scheduled_time && !order.assigned_employee_id;
    });
  }, []);

  // SMART PLANNING: Like Fenster - only plan what needs planning
  const planNewOrders = useCallback(async (showNotification = true) => {
    const ordersNeedingPlanning = getOrdersNeedingPlanning(orders);
    
    if (ordersNeedingPlanning.length === 0) {
      if (showNotification) {
        toast.success('🎯 Alle ordrer er allerede planlagt');
      }
      return { plannedOrders: 0, message: 'Alle ordrer allerede planlagt' };
    }

    setIsPlanning(true);
    let plannedCount = 0;

    try {
      console.log(`📋 Smart planning: ${ordersNeedingPlanning.length} new orders`);

      // Get current week dates (Monday to Friday)
      const today = new Date();
      const currentWeek = [];
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday

      for (let i = 0; i < 5; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        currentWeek.push(day);
      }

      // Group by subscription vs regular orders
      const subscriptionOrders = ordersNeedingPlanning.filter(o => o.subscription_id);
      const regularOrders = ordersNeedingPlanning.filter(o => !o.subscription_id);

      // Plan subscription orders on their fixed dates
      for (const order of subscriptionOrders) {
        // Subscription orders should have start_date from subscription
        // For now, just assign to next available day and time
        const assignedDay = currentWeek[plannedCount % 5];
        const timeSlot = `${8 + Math.floor(plannedCount / 5)}:00`;
        const employee = employees.find(e => e.is_active);

        if (employee) {
          await updateOrder(order.id, {
            scheduled_date: assignedDay.toISOString().split('T')[0],
            scheduled_time: timeSlot,
            assigned_employee_id: employee.id,
            status: 'Planlagt'
          }, false); // No toast
          plannedCount++;
        }
      }

      // Plan regular orders
      for (const order of regularOrders) {
        const dayIndex = plannedCount % 5;
        const assignedDay = currentWeek[dayIndex];
        const timeSlot = `${8 + Math.floor(plannedCount / 5)}:00`;
        const employee = employees[plannedCount % employees.length];

        if (employee) {
          await updateOrder(order.id, {
            scheduled_date: assignedDay.toISOString().split('T')[0],
            scheduled_time: timeSlot,
            assigned_employee_id: employee.id,
            status: 'Planlagt'
          }, false); // No toast
          plannedCount++;
        }
      }

      if (showNotification && plannedCount > 0) {
        toast.success(`✅ Planlagt ${plannedCount} nye ordrer`);
      }

      return { 
        plannedOrders: plannedCount, 
        message: `Planlagt ${plannedCount} nye ordrer` 
      };

    } catch (error) {
      console.error('Smart planning failed:', error);
      if (showNotification) {
        toast.error('Planlægning fejlede');
      }
      return { plannedOrders: 0, message: 'Planlægning fejlede' };
    } finally {
      setIsPlanning(false);
    }
  }, [orders, employees, updateOrder, getOrdersNeedingPlanning]);

  // Check if any orders need planning (for UI indicators)
  const hasOrdersNeedingPlanning = useCallback(() => {
    return getOrdersNeedingPlanning(orders).length > 0;
  }, [orders, getOrdersNeedingPlanning]);

  return {
    isPlanning,
    planNewOrders,
    hasOrdersNeedingPlanning,
    ordersNeedingPlanningCount: getOrdersNeedingPlanning(orders).length
  };
};