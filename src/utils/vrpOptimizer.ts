
// Advanced VRP optimizer with multi-objective optimization
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

export interface OptimizedRoute {
  employee_id: string;
  orders: OptimizedOrder[];
  total_duration: number;
  total_distance: number;
  total_revenue: number;
  optimization_score: number;
  start_time: string;
}

export interface OptimizedOrder extends VRPOrder {
  scheduled_time: string;
  order_sequence: number;
  travel_time_to_here: number;
  expected_completion_time: string;
}

export class VRPOptimizer {
  private static readonly WORK_START_HOUR = 7;
  private static readonly WORK_END_HOUR = 18;
  private static readonly LUNCH_HOUR = 12;
  private static readonly BUFFER_TIME = 15; // minutes between orders
  
  // Priority weights for multi-objective optimization
  private static readonly WEIGHTS = {
    REVENUE: 0.4,
    EFFICIENCY: 0.3,
    PRIORITY: 0.2,
    GEOGRAPHY: 0.1
  };

  /**
   * Main optimization function - distributes orders across employees and optimizes routes
   */
  static optimizeWeeklyRoutes(
    orders: VRPOrder[], 
    employees: VRPEmployee[], 
    date: string
  ): OptimizedRoute[] {
    console.log(`VRP Optimization starting for ${orders.length} orders and ${employees.length} employees`);
    
    // Filter active employees
    const activeEmployees = employees.filter(emp => emp.max_hours_per_day > 0);
    if (activeEmployees.length === 0) {
      console.warn('No active employees available for optimization');
      return [];
    }

    // Pre-process orders: add time windows and validate
    const processedOrders = this.preprocessOrders(orders);
    
    // Step 1: Assign orders to employees using multi-criteria optimization
    const employeeAssignments = this.assignOrdersToEmployees(processedOrders, activeEmployees);
    
    // Step 2: Optimize route sequence for each employee
    const optimizedRoutes: OptimizedRoute[] = [];
    
    for (const [employeeId, employeeOrders] of employeeAssignments.entries()) {
      if (employeeOrders.length === 0) continue;
      
      const employee = activeEmployees.find(e => e.id === employeeId)!;
      const optimizedRoute = this.optimizeEmployeeRoute(employee, employeeOrders, date);
      
      if (optimizedRoute) {
        optimizedRoutes.push(optimizedRoute);
      }
    }
    
    console.log(`VRP Optimization completed. Generated ${optimizedRoutes.length} optimized routes`);
    return optimizedRoutes;
  }

  /**
   * Pre-process orders to add time windows and validate data
   */
  private static preprocessOrders(orders: VRPOrder[]): VRPOrder[] {
    return orders.map(order => {
      // Set default estimated duration if missing
      if (!order.estimated_duration || order.estimated_duration <= 0) {
        order.estimated_duration = this.getDefaultDurationByType(order);
      }
      
      // Set time windows based on priority and customer preferences
      if (!order.time_window_start || !order.time_window_end) {
        const timeWindow = this.calculateTimeWindow(order);
        order.time_window_start = timeWindow.start;
        order.time_window_end = timeWindow.end;
      }
      
      return order;
    });
  }

  /**
   * Assign orders to employees using capacity constraints and multi-criteria optimization
   */
  private static assignOrdersToEmployees(
    orders: VRPOrder[], 
    employees: VRPEmployee[]
  ): Map<string, VRPOrder[]> {
    const assignments = new Map<string, VRPOrder[]>();
    
    // Initialize empty assignments for all employees
    employees.forEach(emp => assignments.set(emp.id, []));
    
    // Sort orders by priority and revenue for greedy assignment
    const sortedOrders = [...orders].sort((a, b) => {
      const priorityScore = this.getPriorityScore(b) - this.getPriorityScore(a);
      if (Math.abs(priorityScore) > 0.1) return priorityScore;
      return b.price - a.price; // Higher revenue first
    });
    
    // Greedy assignment with capacity constraints
    for (const order of sortedOrders) {
      const bestEmployee = this.findBestEmployeeForOrder(order, employees, assignments);
      if (bestEmployee) {
        assignments.get(bestEmployee.id)!.push(order);
      }
    }
    
    return assignments;
  }

  /**
   * Find the best employee for a specific order
   */
  private static findBestEmployeeForOrder(
    order: VRPOrder,
    employees: VRPEmployee[],
    currentAssignments: Map<string, VRPOrder[]>
  ): VRPEmployee | null {
    let bestEmployee: VRPEmployee | null = null;
    let bestScore = -1;
    
    for (const employee of employees) {
      const currentOrders = currentAssignments.get(employee.id) || [];
      
      // Check capacity constraint
      const currentWorkload = currentOrders.reduce((sum, o) => sum + o.estimated_duration, 0);
      const maxWorkMinutes = employee.max_hours_per_day * 60;
      
      if (currentWorkload + order.estimated_duration > maxWorkMinutes) {
        continue; // Employee at capacity
      }
      
      // Calculate assignment score
      const score = this.calculateAssignmentScore(order, employee, currentOrders);
      
      if (score > bestScore) {
        bestScore = score;
        bestEmployee = employee;
      }
    }
    
    return bestEmployee;
  }

  /**
   * Calculate assignment score for order-employee pairing
   */
  private static calculateAssignmentScore(
    order: VRPOrder,
    employee: VRPEmployee,
    currentOrders: VRPOrder[]
  ): number {
    let score = 0;
    
    // Revenue efficiency (higher hourly rate preference for high-value orders)
    if (employee.hourly_rate && order.price > 1000) {
      score += this.WEIGHTS.REVENUE * (order.price / (employee.hourly_rate * (order.estimated_duration / 60)));
    }
    
    // Geographic clustering (prefer orders close to existing ones)
    if (currentOrders.length > 0 && order.latitude && order.longitude) {
      const avgDistance = currentOrders
        .filter(o => o.latitude && o.longitude)
        .reduce((sum, o) => {
          const dist = this.calculateDistance(
            order.latitude!, order.longitude!,
            o.latitude!, o.longitude!
          );
          return sum + dist;
        }, 0) / Math.max(currentOrders.length, 1);
      
      // Lower average distance = higher score
      score += this.WEIGHTS.GEOGRAPHY * Math.max(0, 50 - avgDistance) / 50;
    }
    
    // Workload balance (prefer employees with lighter current load)
    const currentWorkload = currentOrders.reduce((sum, o) => sum + o.estimated_duration, 0);
    const maxWorkMinutes = employee.max_hours_per_day * 60;
    const workloadRatio = currentWorkload / maxWorkMinutes;
    score += this.WEIGHTS.EFFICIENCY * (1 - workloadRatio);
    
    return score;
  }

  /**
   * Optimize route sequence for a single employee using TSP with time windows
   */
  private static optimizeEmployeeRoute(
    employee: VRPEmployee,
    orders: VRPOrder[],
    date: string
  ): OptimizedRoute | null {
    if (orders.length === 0) return null;
    
    console.log(`Optimizing route for ${employee.name} with ${orders.length} orders`);
    
    // Step 1: Apply TSP-like optimization for order sequence
    const optimizedSequence = this.optimizeOrderSequence(orders, employee);
    
    // Step 2: Calculate optimal start time and schedule each order
    const scheduledOrders = this.scheduleOrdersWithTimeWindows(optimizedSequence, employee);
    
    // Step 3: Calculate route metrics
    const metrics = this.calculateRouteMetrics(scheduledOrders, employee);
    
    return {
      employee_id: employee.id,
      orders: scheduledOrders,
      total_duration: metrics.total_duration,
      total_distance: metrics.total_distance,
      total_revenue: metrics.total_revenue,
      optimization_score: metrics.optimization_score,
      start_time: scheduledOrders[0]?.scheduled_time || '08:00'
    };
  }

  /**
   * Optimize order sequence using nearest neighbor with 2-opt improvements
   */
  private static optimizeOrderSequence(orders: VRPOrder[], employee: VRPEmployee): VRPOrder[] {
    if (orders.length <= 1) return orders;
    
    // Start with priority-based initial sequence
    let sequence = [...orders].sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));
    
    // Apply geographic clustering if coordinates available
    if (orders.every(o => o.latitude && o.longitude)) {
      sequence = this.optimizeByGeography(sequence, employee);
    }
    
    // Apply 2-opt local improvements (simplified version)
    sequence = this.apply2OptImprovements(sequence);
    
    return sequence;
  }

  /**
   * Geographic optimization using nearest neighbor algorithm
   */
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
        // Fallback: add remaining orders by priority
        route.push(...unvisited);
        break;
      }
    }
    
    return route;
  }

  /**
   * Apply 2-opt improvements to reduce total route distance
   */
  private static apply2OptImprovements(sequence: VRPOrder[]): VRPOrder[] {
    if (sequence.length < 4) return sequence;
    
    let improved = true;
    let currentSequence = [...sequence];
    
    while (improved) {
      improved = false;
      
      for (let i = 1; i < currentSequence.length - 2; i++) {
        for (let j = i + 1; j < currentSequence.length - 1; j++) {
          // Try reversing the segment between i and j
          const newSequence = [
            ...currentSequence.slice(0, i),
            ...currentSequence.slice(i, j + 1).reverse(),
            ...currentSequence.slice(j + 1)
          ];
          
          // Check if this improves the route (simplified check)
          if (this.calculateSequenceScore(newSequence) > this.calculateSequenceScore(currentSequence)) {
            currentSequence = newSequence;
            improved = true;
          }
        }
      }
    }
    
    return currentSequence;
  }

  /**
   * Schedule orders with time window constraints
   */
  private static scheduleOrdersWithTimeWindows(
    orders: VRPOrder[],
    employee: VRPEmployee
  ): OptimizedOrder[] {
    const scheduledOrders: OptimizedOrder[] = [];
    let currentTime = this.WORK_START_HOUR * 60; // Start at 7:00 AM in minutes
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      
      // Calculate travel time to this order
      const travelTime = i === 0 ? 
        this.calculateTravelTimeFromHome(employee, order) : 
        this.calculateTravelTimeBetweenOrders(orders[i-1], order);
      
      // Add travel time and buffer
      currentTime += travelTime + this.BUFFER_TIME;
      
      // Check time window constraints
      const timeWindowStart = this.timeStringToMinutes(order.time_window_start || '07:00');
      const timeWindowEnd = this.timeStringToMinutes(order.time_window_end || '18:00');
      
      // Ensure we start within the time window
      currentTime = Math.max(currentTime, timeWindowStart);
      
      // Check if we can complete the order within the time window
      if (currentTime + order.estimated_duration > timeWindowEnd) {
        // Try to start earlier in the time window
        const earliestStart = Math.max(timeWindowStart, currentTime - order.estimated_duration);
        if (earliestStart + order.estimated_duration <= timeWindowEnd) {
          currentTime = earliestStart;
        }
      }
      
      // Skip lunch hour
      if (currentTime < this.LUNCH_HOUR * 60 && 
          currentTime + order.estimated_duration > this.LUNCH_HOUR * 60) {
        currentTime = (this.LUNCH_HOUR + 1) * 60; // Resume at 1 PM
      }
      
      const scheduledTime = this.minutesToTimeString(currentTime);
      const completionTime = this.minutesToTimeString(currentTime + order.estimated_duration);
      
      scheduledOrders.push({
        ...order,
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

  // Utility methods
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
      return Math.round(distance * 2.5); // 2.5 minutes per km
    }
    return 10; // Default 10 minutes between orders
  }

  private static getPriorityScore(order: VRPOrder): number {
    const priorities = { 'Kritisk': 4, 'Høj': 3, 'Normal': 2, 'Lav': 1 };
    return priorities[order.priority as keyof typeof priorities] || 2;
  }

  private static getDefaultDurationByType(order: VRPOrder): number {
    // Estimate duration based on order type and price
    if (order.price < 500) return 60;   // 1 hour for small jobs
    if (order.price < 1000) return 120; // 2 hours for medium jobs
    if (order.price < 2000) return 180; // 3 hours for large jobs
    return 240; // 4 hours for very large jobs
  }

  private static calculateTimeWindow(order: VRPOrder): { start: string, end: string } {
    // Default time windows based on priority
    switch (order.priority) {
      case 'Kritisk':
        return { start: '07:00', end: '12:00' }; // Morning priority
      case 'Høj':
        return { start: '08:00', end: '16:00' }; // Extended window
      case 'Normal':
        return { start: '09:00', end: '17:00' }; // Normal business hours
      case 'Lav':
        return { start: '10:00', end: '18:00' }; // Flexible timing
      default:
        return { start: '08:00', end: '17:00' };
    }
  }

  private static calculateSequenceScore(sequence: VRPOrder[]): number {
    let score = 0;
    
    // Priority order bonus
    for (let i = 0; i < sequence.length; i++) {
      const priorityScore = this.getPriorityScore(sequence[i]);
      score += priorityScore * (sequence.length - i); // Earlier = higher score
    }
    
    // Geographic clustering bonus
    for (let i = 0; i < sequence.length - 1; i++) {
      const current = sequence[i];
      const next = sequence[i + 1];
      if (current.latitude && current.longitude && next.latitude && next.longitude) {
        const distance = this.calculateDistance(
          current.latitude, current.longitude,
          next.latitude, next.longitude
        );
        score += Math.max(0, 20 - distance); // Closer = higher score
      }
    }
    
    return score;
  }

  private static calculateRouteMetrics(orders: OptimizedOrder[], employee: VRPEmployee) {
    const total_revenue = orders.reduce((sum, order) => sum + order.price, 0);
    const total_duration = orders.reduce((sum, order) => sum + order.estimated_duration + order.travel_time_to_here, 0);
    
    let total_distance = 0;
    if (employee.latitude && employee.longitude) {
      // Distance from home to first order
      if (orders[0]?.latitude && orders[0]?.longitude) {
        total_distance += this.calculateDistance(
          employee.latitude, employee.longitude,
          orders[0].latitude, orders[0].longitude
        );
      }
      // Distance between consecutive orders
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
    let optimization_score = 50; // Base score
    
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
