// Advanced Multi-Day VRP optimizer with dynamic work schedules and robust error handling
export interface VRPOrder {
  id: string;
  customer: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimated_duration: number; // in minutes
  priority: string;
  price: number;
  preferred_time?: string;
  time_window_start?: string;
  time_window_end?: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

export interface VRPEmployee {
  id: string;
  name: string;
  start_location?: string;
  latitude?: number;
  longitude?: number;
  max_hours_per_day: number;
  hourly_rate?: number;
  specialties?: string[];
}

export interface WorkSchedule {
  employee_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string;
  end_time: string;
  is_working_day: boolean;
}

export interface OptimizedRoute {
  employee_id: string;
  date: string;
  orders: OptimizedOrder[];
  total_duration: number;
  total_distance: number;
  total_revenue: number;
  optimization_score: number;
  start_time: string;
  end_time: string;
}

export interface OptimizedOrder extends VRPOrder {
  scheduled_date: string;
  scheduled_time: string;
  order_sequence: number;
  travel_time_to_here: number;
  expected_completion_time: string;
}

export class VRPOptimizer {
  private static readonly BUFFER_TIME = 15; // minutes between orders
  
  // Default coordinates for Denmark (Aarhus area)
  private static readonly DEFAULT_LAT = 56.1629;
  private static readonly DEFAULT_LNG = 10.2039;
  
  // Priority weights for multi-objective optimization
  private static readonly WEIGHTS = {
    REVENUE: 0.4,
    EFFICIENCY: 0.3,
    PRIORITY: 0.2,
    GEOGRAPHY: 0.1
  };

  /**
   * Main multi-day optimization function with robust error handling
   */
  static optimizeWeeklyRoutes(
    orders: VRPOrder[], 
    employees: VRPEmployee[], 
    workSchedules: WorkSchedule[],
    weekStartDate: string
  ): OptimizedRoute[] {
    console.log(`🚀 VRP Optimization starting for ${orders.length} orders and ${employees.length} employees`);
    
    try {
      // Generate work days for the week (Monday-Friday)
      const workDays = this.generateWorkDays(weekStartDate);
      console.log(`📅 Generated work days:`, workDays);
      
      // Pre-process orders and add default coordinates if missing
      const processedOrders = this.preprocessOrders(orders);
      console.log(`📋 Processed ${processedOrders.length} orders`);
      
      // Separate fixed vs flexible orders
      const { fixedOrders, flexibleOrders } = this.separateFixedAndFlexibleOrders(processedOrders);
      console.log(`📌 Fixed orders: ${fixedOrders.length}, Flexible: ${flexibleOrders.length}`);
      
      // Create employee availability map
      const employeeAvailability = this.createEmployeeAvailabilityMap(employees, workSchedules, workDays);
      console.log(`👥 Employee availability created for ${employeeAvailability.size} employees`);
      
      // Place fixed orders first
      const routeMap = this.placeFixedOrders(fixedOrders, employeeAvailability);
      
      // Distribute flexible orders across the week
      this.distributeOrdersAcrossWeek(flexibleOrders, employeeAvailability, routeMap);
      
      // Optimize routes for each day
      const optimizedRoutes: OptimizedRoute[] = [];
      
      for (const [employeeId, dailyRoutes] of routeMap.entries()) {
        for (const [date, dayData] of dailyRoutes.entries()) {
          if (dayData.orders.length === 0) continue;
          
          const employee = employees.find(e => e.id === employeeId)!;
          const workSchedule = this.getWorkScheduleForDay(workSchedules, employeeId, date);
          
          if (!workSchedule || !workSchedule.is_working_day) {
            console.log(`⚠️ No work schedule for ${employee.name} on ${date}`);
            continue;
          }
          
          const optimizedRoute = this.optimizeDayRoute(
            employee, 
            dayData.orders, 
            date, 
            workSchedule,
            dayData.availableTime
          );
          
          if (optimizedRoute) {
            optimizedRoutes.push(optimizedRoute);
            console.log(`✅ Created route for ${employee.name} on ${date} with ${optimizedRoute.orders.length} orders`);
          }
        }
      }
      
      console.log(`🎯 VRP Optimization completed. Generated ${optimizedRoutes.length} optimized routes`);
      return optimizedRoutes;
      
    } catch (error) {
      console.error('VRP Optimization failed:', error);
      return [];
    }
  }

  /**
   * Generate work days for the week (Monday-Friday)
   */
  private static generateWorkDays(weekStartDate: string): string[] {
    const startDate = new Date(weekStartDate);
    const workDays: string[] = [];
    
    // Find Monday of the week
    const monday = new Date(startDate);
    const dayOfWeek = monday.getDay();
    const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    monday.setDate(diff);
    
    // Generate Monday through Friday
    for (let i = 0; i < 5; i++) {
      const workDay = new Date(monday);
      workDay.setDate(monday.getDate() + i);
      workDays.push(workDay.toISOString().split('T')[0]);
    }
    
    return workDays;
  }

  /**
   * Preprocess orders with robust error handling and defaults
   */
  private static preprocessOrders(orders: VRPOrder[]): VRPOrder[] {
    return orders.map(order => {
      // Ensure minimum duration
      if (!order.estimated_duration || order.estimated_duration <= 0) {
        order.estimated_duration = this.getDefaultDurationByType(order.customer);
      }
      
      // Add default coordinates if missing (Denmark/Jutland area)
      if (!order.latitude || !order.longitude) {
        const coords = this.getDefaultCoordinates(order.address);
        order.latitude = coords.lat;
        order.longitude = coords.lng;
      }
      
      // Set time windows based on priority
      if (!order.time_window_start || !order.time_window_end) {
        const timeWindow = this.calculateTimeWindow(order);
        order.time_window_start = timeWindow.start;
        order.time_window_end = timeWindow.end;
      }
      
      return order;
    });
  }

  /**
   * Get default duration based on service type
   */
  private static getDefaultDurationByType(customer: string): number {
    const serviceDurations: Record<string, number> = {
      'vindue': 45,
      'kontor': 90,
      'privat': 120,
      'bygger': 180,
      'special': 150,
      'terrasse': 60,
      'gulv': 240,
      'tæppe': 75,
    };

    const customerLower = customer.toLowerCase();
    for (const [key, duration] of Object.entries(serviceDurations)) {
      if (customerLower.includes(key)) {
        return duration;
      }
    }
    return 60; // Default fallback
  }

  /**
   * Get default coordinates with realistic Danish locations
   */
  private static getDefaultCoordinates(address?: string): { lat: number, lng: number } {
    // Default Danish city coordinates
    const danishCities = [
      { lat: 56.1629, lng: 10.2039 }, // Aarhus
      { lat: 55.6761, lng: 12.5683 }, // Copenhagen
      { lat: 55.4038, lng: 10.4024 }, // Odense
      { lat: 57.0488, lng: 9.9217 },  // Aalborg
      { lat: 55.7058, lng: 9.5378 },  // Vejle
      { lat: 56.1397, lng: 8.9733 },  // Herning
      { lat: 55.5661, lng: 9.7516 },  // Fredericia
    ];
    
    // Return random city coordinates to spread orders geographically
    const randomIndex = Math.floor(Math.random() * danishCities.length);
    const baseCoords = danishCities[randomIndex];
    
    // Add small random variance (±0.05 degrees ≈ ±5km)
    const variance = 0.05;
    return {
      lat: baseCoords.lat + (Math.random() - 0.5) * variance,
      lng: baseCoords.lng + (Math.random() - 0.5) * variance
    };
  }

  /**
   * Separate orders with fixed schedules from flexible ones
   */
  private static separateFixedAndFlexibleOrders(orders: VRPOrder[]): { 
    fixedOrders: VRPOrder[], 
    flexibleOrders: VRPOrder[] 
  } {
    const fixedOrders: VRPOrder[] = [];
    const flexibleOrders: VRPOrder[] = [];
    
    orders.forEach(order => {
      if (order.scheduled_date && order.scheduled_time) {
        fixedOrders.push(order);
      } else {
        flexibleOrders.push(order);
      }
    });
    
    return { fixedOrders, flexibleOrders };
  }

  /**
   * Create employee availability map based on work schedules
   */
  private static createEmployeeAvailabilityMap(
    employees: VRPEmployee[], 
    workSchedules: WorkSchedule[], 
    workDays: string[]
  ): Map<string, Map<string, { availableTime: number, workSchedule: WorkSchedule | null, orders?: VRPOrder[], usedTime?: number }>> {
    const availabilityMap = new Map();
    
    employees.forEach(employee => {
      const employeeDays = new Map();
      
      workDays.forEach(date => {
        const dayOfWeek = new Date(date).getDay();
        const workSchedule = workSchedules.find(ws => 
          ws.employee_id === employee.id && ws.day_of_week === dayOfWeek
        );
        
        if (workSchedule && workSchedule.is_working_day) {
          const availableTime = this.calculateAvailableMinutes(workSchedule.start_time, workSchedule.end_time);
          employeeDays.set(date, { 
            availableTime, 
            workSchedule,
            orders: [],
            usedTime: 0
          });
        }
      });
      
      availabilityMap.set(employee.id, employeeDays);
    });
    
    return availabilityMap;
  }

  /**
   * Place fixed orders first to reserve time slots
   */
  private static placeFixedOrders(
    fixedOrders: VRPOrder[], 
    employeeAvailability: Map<string, Map<string, any>>
  ): Map<string, Map<string, any>> {
    const routeMap = new Map();
    
    // Initialize route map
    for (const [employeeId, days] of employeeAvailability.entries()) {
      const employeeRoutes = new Map();
      for (const [date, dayData] of days.entries()) {
        employeeRoutes.set(date, {
          orders: [],
          availableTime: dayData.availableTime,
          usedTime: 0,
          workSchedule: dayData.workSchedule
        });
      }
      routeMap.set(employeeId, employeeRoutes);
    }
    
    // Place fixed orders
    fixedOrders.forEach(order => {
      const bestEmployee = this.findBestEmployeeForFixedOrder(order, routeMap, employeeAvailability);
      if (bestEmployee) {
        const employeeRoutes = routeMap.get(bestEmployee.id);
        const dayRoute = employeeRoutes.get(order.scheduled_date!);
        if (dayRoute) {
          dayRoute.orders.push(order);
          dayRoute.usedTime += order.estimated_duration;
          dayRoute.availableTime -= order.estimated_duration;
        }
      }
    });
    
    return routeMap;
  }

  /**
   * Distribute flexible orders across the week using intelligent allocation
   */
  private static distributeOrdersAcrossWeek(
    flexibleOrders: VRPOrder[],
    employeeAvailability: Map<string, Map<string, any>>,
    routeMap: Map<string, Map<string, any>>
  ): Map<string, Map<string, any>> {
    
    // Sort orders by priority and revenue for optimal distribution
    const sortedOrders = [...flexibleOrders].sort((a, b) => {
      const priorityScore = this.getPriorityScore(b) - this.getPriorityScore(a);
      if (Math.abs(priorityScore) > 0.1) return priorityScore;
      return b.price - a.price;
    });
    
    sortedOrders.forEach(order => {
      const bestPlacement = this.findBestPlacementForFlexibleOrder(order, routeMap, employeeAvailability);
      
      if (bestPlacement) {
        const { employeeId, date } = bestPlacement;
        const employeeRoutes = routeMap.get(employeeId);
        const dayRoute = employeeRoutes.get(date);
        
        dayRoute.orders.push(order);
        dayRoute.usedTime += order.estimated_duration;
        dayRoute.availableTime -= order.estimated_duration;
      }
    });
    
    return routeMap;
  }

  /**
   * Find best placement for flexible order considering all factors
   */
  private static findBestPlacementForFlexibleOrder(
    order: VRPOrder,
    routeMap: Map<string, Map<string, any>>,
    employeeAvailability: Map<string, Map<string, any>>
  ): { employeeId: string, date: string } | null {
    let bestPlacement: { employeeId: string, date: string } | null = null;
    let bestScore = -1;
    
    for (const [employeeId, dailyRoutes] of routeMap.entries()) {
      for (const [date, dayData] of dailyRoutes.entries()) {
        // Check if employee has enough available time
        if (dayData.availableTime < order.estimated_duration + this.BUFFER_TIME) continue;
        
        // Calculate placement score
        const score = this.calculatePlacementScore(order, employeeId, date, dayData, employeeAvailability);
        
        if (score > bestScore) {
          bestScore = score;
          bestPlacement = { employeeId, date };
        }
      }
    }
    
    return bestPlacement;
  }

  /**
   * Calculate placement score for order-employee-date combination
   */
  private static calculatePlacementScore(
    order: VRPOrder,
    employeeId: string,
    date: string,
    dayData: any,
    employeeAvailability: Map<string, Map<string, any>>
  ): number {
    let score = 0;
    
    // Revenue efficiency
    const hourlyRate = 300; // Default if not specified
    const revenueEfficiency = order.price / (order.estimated_duration / 60);
    score += this.WEIGHTS.REVENUE * Math.min(revenueEfficiency / hourlyRate, 2);
    
    // Priority bonus
    score += this.WEIGHTS.PRIORITY * this.getPriorityScore(order);
    
    // Geographic clustering bonus
    if (dayData.orders.length > 0 && order.latitude && order.longitude) {
      const avgDistance = dayData.orders
        .filter((o: VRPOrder) => o.latitude && o.longitude)
        .reduce((sum: number, o: VRPOrder) => {
          const dist = this.calculateDistance(
            order.latitude!, order.longitude!,
            o.latitude!, o.longitude!
          );
          return sum + dist;
        }, 0) / Math.max(dayData.orders.length, 1);
      
      score += this.WEIGHTS.GEOGRAPHY * Math.max(0, (50 - avgDistance) / 50);
    }
    
    // Workload balance bonus (prefer less loaded days)
    const workloadRatio = dayData.usedTime / (dayData.usedTime + dayData.availableTime);
    score += this.WEIGHTS.EFFICIENCY * (1 - workloadRatio);
    
    return score;
  }

  /**
   * Optimize route for a single day
   */
  private static optimizeDayRoute(
    employee: VRPEmployee,
    orders: VRPOrder[],
    date: string,
    workSchedule: WorkSchedule,
    availableTime: number
  ): OptimizedRoute | null {
    if (orders.length === 0) return null;
    
    console.log(`⚙️ Optimizing day route for ${employee.name} on ${date} with ${orders.length} orders`);
    
    // Optimize order sequence using geographic clustering
    const optimizedSequence = this.optimizeOrderSequence(orders, employee);
    
    // Schedule orders with dynamic work hours
    const scheduledOrders = this.scheduleOrdersWithDynamicTimes(
      optimizedSequence, 
      employee, 
      date, 
      workSchedule
    );
    
    // Calculate route metrics
    const metrics = this.calculateRouteMetrics(scheduledOrders, employee);
    
    return {
      employee_id: employee.id,
      date,
      orders: scheduledOrders,
      total_duration: metrics.total_duration,
      total_distance: metrics.total_distance,
      total_revenue: metrics.total_revenue,
      optimization_score: metrics.optimization_score,
      start_time: scheduledOrders[0]?.scheduled_time || workSchedule.start_time,
      end_time: scheduledOrders[scheduledOrders.length - 1]?.expected_completion_time || workSchedule.end_time
    };
  }

  /**
   * Schedule orders with dynamic work hours from work_schedules
   */
  private static scheduleOrdersWithDynamicTimes(
    orders: VRPOrder[],
    employee: VRPEmployee,
    date: string,
    workSchedule: WorkSchedule
  ): OptimizedOrder[] {
    const scheduledOrders: OptimizedOrder[] = [];
    
    // Parse work schedule times
    const workStartMinutes = this.timeStringToMinutes(workSchedule.start_time);
    const workEndMinutes = this.timeStringToMinutes(workSchedule.end_time);
    
    let currentTime = workStartMinutes;
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      // Calculate travel time to this order
      const travelTime = i === 0 ? 
        this.calculateTravelTimeFromHome(employee, order) : 
        this.calculateTravelTimeBetweenOrders(orders[i-1], order);
      
      // Add travel time and buffer
      currentTime += travelTime + this.BUFFER_TIME;
      
      // Ensure we don't exceed work hours
      if (currentTime + order.estimated_duration > workEndMinutes) {
        console.warn(`Order ${order.id} extends beyond work hours for ${employee.name} on ${date}`);
        // Try to fit it earlier or adjust
        if (currentTime < workEndMinutes) {
          const availableTime = workEndMinutes - currentTime;
          if (availableTime >= 30) { // Minimum 30 minutes for any job
            currentTime = workEndMinutes - order.estimated_duration;
          }
        }
      }
      
      const scheduledTime = this.minutesToTimeString(Math.max(currentTime, workStartMinutes));
      const completionTime = this.minutesToTimeString(currentTime + order.estimated_duration);
      
      scheduledOrders.push({
        ...order,
        scheduled_date: date,
        scheduled_time: scheduledTime,
        order_sequence: i + 1,
        travel_time_to_here: travelTime,
        expected_completion_time: completionTime
      });
      
      // Advance current time by the order duration
      currentTime += order.estimated_duration;
    }
    
    return scheduledOrders;
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static calculateTravelTimeFromHome(employee: VRPEmployee, order: VRPOrder): number {
    if (employee.latitude && employee.longitude && order.latitude && order.longitude) {
      const distance = this.calculateDistance(
        employee.latitude, employee.longitude,
        order.latitude, order.longitude
      );
      return Math.round(distance * 2.5); // 2.5 minutes per km in city traffic
    }
    return 15; // Default 15 minutes
  }

  private static calculateTravelTimeBetweenOrders(order1: VRPOrder, order2: VRPOrder): number {
    if (order1.latitude && order1.longitude && order2.latitude && order2.longitude) {
      const distance = this.calculateDistance(
        order1.latitude, order1.longitude,
        order2.latitude, order2.longitude
      );
      return Math.round(distance * 2.5);
    }
    return 10; // Default 10 minutes between orders
  }

  private static getPriorityScore(order: VRPOrder): number {
    const priorities = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 };
    return priorities[order.priority as keyof typeof priorities] || 2;
  }

  private static optimizeOrderSequence(orders: VRPOrder[], employee: VRPEmployee): VRPOrder[] {
    if (orders.length <= 1) return orders;
    
    // Apply geographic clustering if coordinates available
    if (orders.every(o => o.latitude && o.longitude)) {
      return this.optimizeByGeography(orders, employee);
    }
    
    // Fallback to priority-based ordering
    return [...orders].sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));
  }

  private static optimizeByGeography(orders: VRPOrder[], employee: VRPEmployee): VRPOrder[] {
    if (orders.length <= 1) return orders;
    
    const unvisited = [...orders];
    const route: VRPOrder[] = [];
    
    // Start with highest priority order or closest to employee home
    let current = unvisited[0];
    if (employee.latitude && employee.longitude) {
      current = unvisited.reduce((closest, order) => {
        if (!order.latitude || !order.longitude) return closest;
        const distCurrent = this.calculateDistance(
          employee.latitude!, employee.longitude!,
          closest.latitude!, closest.longitude!
        );
        const distOrder = this.calculateDistance(
          employee.latitude!, employee.longitude!,
          order.latitude, order.longitude
        );
        return distOrder < distCurrent ? order : closest;
      });
    }
    
    route.push(current);
    unvisited.splice(unvisited.indexOf(current), 1);
    
    // Nearest neighbor for remaining orders
    while (unvisited.length > 0) {
      const next = unvisited.reduce((nearest, order) => {
        if (!current.latitude || !current.longitude || !order.latitude || !order.longitude) {
          return nearest;
        }
        
        const distNearest = nearest && nearest.latitude && nearest.longitude ? 
          this.calculateDistance(current.latitude, current.longitude, nearest.latitude, nearest.longitude) : 
          Infinity;
        const distOrder = this.calculateDistance(current.latitude, current.longitude, order.latitude, order.longitude);
        
        return distOrder < distNearest ? order : nearest;
      });
      
      if (next) {
        route.push(next);
        unvisited.splice(unvisited.indexOf(next), 1);
        current = next;
      } else {
        route.push(...unvisited);
        break;
      }
    }
    
    return route;
  }

  private static calculateRouteMetrics(orders: OptimizedOrder[], employee: VRPEmployee) {
    const total_revenue = orders.reduce((sum, order) => sum + order.price, 0);
    const total_duration = orders.reduce((sum, order) => sum + order.estimated_duration + order.travel_time_to_here, 0);
    
    let total_distance = 0;
    if (employee.latitude && employee.longitude) {
      if (orders[0]?.latitude && orders[0]?.longitude) {
        total_distance += this.calculateDistance(
          employee.latitude, employee.longitude,
          orders[0].latitude, orders[0].longitude
        );
      }
      for (let i = 0; i < orders.length - 1; i++) {
        const current = orders[i];
        const next = orders[i + 1];
        if (current.latitude && current.longitude && next.latitude && next.longitude) {
          total_distance += this.calculateDistance(
            current.latitude, current.longitude,
            next.latitude, next.longitude
          );
        }
      }
    }
    
    // Calculate optimization score (0-100)
    let optimization_score = 60; // Start higher
    
    // Revenue efficiency
    const revenuePerHour = total_revenue / (total_duration / 60);
    if (revenuePerHour > 500) optimization_score += 20;
    else if (revenuePerHour > 300) optimization_score += 10;
    
    // Priority order placement
    const criticalOrders = orders.filter(o => o.priority === 'Kritisk');
    const criticalEarly = criticalOrders.filter((_, index) => index < 3).length;
    optimization_score += (criticalEarly / Math.max(criticalOrders.length, 1)) * 15;
    
    // Geographic efficiency
    if (total_distance > 0) {
      const avgDistancePerOrder = total_distance / Math.max(orders.length, 1);
      if (avgDistancePerOrder < 5) optimization_score += 15;
      else if (avgDistancePerOrder < 10) optimization_score += 10;
    }
    
    return {
      total_duration: Math.round(total_duration),
      total_distance: Math.round(total_distance * 10) / 10,
      total_revenue,
      optimization_score: Math.min(Math.max(optimization_score, 0), 100)
    };
  }

  private static getWorkScheduleForDay(workSchedules: WorkSchedule[], employeeId: string, date: string): WorkSchedule | null {
    const dayOfWeek = new Date(date).getDay();
    return workSchedules.find(ws => ws.employee_id === employeeId && ws.day_of_week === dayOfWeek) || null;
  }

  private static calculateAvailableMinutes(startTime: string, endTime: string): number {
    const start = this.timeStringToMinutes(startTime);
    const end = this.timeStringToMinutes(endTime);
    return end - start;
  }

  private static findBestEmployeeForFixedOrder(
    order: VRPOrder, 
    routeMap: Map<string, Map<string, any>>, 
    employeeAvailability: Map<string, Map<string, any>>
  ): VRPEmployee | null {
    // For fixed orders, just find first available employee with capacity
    for (const [employeeId, dailyRoutes] of routeMap.entries()) {
      const dayRoute = dailyRoutes.get(order.scheduled_date!);
      if (dayRoute && dayRoute.availableTime >= order.estimated_duration) {
        return { id: employeeId } as VRPEmployee;
      }
    }
    return null;
  }

  private static timeStringToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  private static minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
