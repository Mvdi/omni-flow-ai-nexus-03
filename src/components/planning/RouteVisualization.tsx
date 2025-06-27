import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Clock, Euro, Navigation, Truck, User, Calendar } from 'lucide-react';
import { useRoutes } from '@/hooks/useRoutes';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';

interface RouteVisualizationProps {
  selectedWeek: Date;
  selectedEmployee?: string;
}

export const RouteVisualization: React.FC<RouteVisualizationProps> = ({
  selectedWeek,
  selectedEmployee
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const { routes } = useRoutes();
  const { orders } = useOrders();
  const { employees } = useEmployees();

  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDates.push(day.toISOString().split('T')[0]);
    }
    return weekDates;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const weekDates = getWeekDates(selectedWeek);

  // Filter routes for the selected week and employee
  const weekRoutes = routes.filter(route => {
    const isInWeek = weekDates.includes(route.route_date);
    if (!isInWeek) return false;
    
    if (selectedEmployee === 'all' || !selectedEmployee) return true;
    return route.employee_id === selectedEmployee;
  });

  // Get orders for selected routes
  const getOrdersForRoute = (routeId: string) => {
    return orders.filter(order => order.route_id === routeId)
      .sort((a, b) => (a.order_sequence || 0) - (b.order_sequence || 0));
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? employee.name : 'Ukendt medarbejder';
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

  const groupRoutesByDate = () => {
    const grouped: { [key: string]: typeof weekRoutes } = {};
    weekRoutes.forEach(route => {
      if (!grouped[route.route_date]) {
        grouped[route.route_date] = [];
      }
      grouped[route.route_date].push(route);
    });
    return grouped;
  };

  const groupedRoutes = groupRoutesByDate();

  return (
    <div className="space-y-6">
      {/* Route Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Rute Overblik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{weekRoutes.length}</div>
              <div className="text-sm text-gray-600">Aktive Ruter</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(weekRoutes.reduce((sum, route) => sum + (route.estimated_distance_km || 0), 0))} km
              </div>
              <div className="text-sm text-gray-600">Total Distance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {weekRoutes.reduce((sum, route) => sum + (route.total_revenue || 0), 0).toLocaleString('da-DK')} kr
              </div>
              <div className="text-sm text-gray-600">Total Omsætning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(weekRoutes.reduce((sum, route) => sum + (route.optimization_score || 0), 0) / Math.max(weekRoutes.length, 1))}%
              </div>
              <div className="text-sm text-gray-600">Avg. Effektivitet</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Routes */}
      <div className="space-y-4">
        {Object.entries(groupedRoutes).map(([date, dayRoutes]) => (
          <Card key={date}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {new Date(date).toLocaleDateString('da-DK', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                <Badge variant="secondary">{dayRoutes.length} ruter</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dayRoutes.map((route) => {
                  const routeOrders = getOrdersForRoute(route.id);
                  const employeeColor = getEmployeeColor(route.employee_id);
                  
                  return (
                    <div key={route.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: employeeColor }}
                          />
                          <div>
                            <h4 className="font-medium">{route.name}</h4>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {getEmployeeName(route.employee_id)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {Math.round(route.estimated_distance_km || 0)} km
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round((route.estimated_duration_hours || 0) * 60)} min
                          </div>
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3" />
                            {(route.total_revenue || 0).toLocaleString()} kr
                          </div>
                          {route.ai_optimized && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                              AI-optimeret ({Math.round(route.optimization_score || 0)}%)
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Route Orders */}
                      <ScrollArea className="max-h-60">
                        <div className="space-y-2">
                          {routeOrders.map((order, index) => (
                            <div key={order.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                              <div className="w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center text-xs font-medium"
                                   style={{ borderColor: employeeColor }}>
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{order.customer}</div>
                                <div className="text-xs text-gray-600">{order.address}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {formatTime(order.scheduled_time || '')}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {order.estimated_duration || 60} min
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {order.price.toLocaleString('da-DK')} kr
                                </div>
                                <div className="text-xs text-gray-600">
                                  {order.order_type}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {weekRoutes.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Ingen ruter fundet for denne uge</p>
            <p className="text-sm text-gray-500">Kør en ruteoptimerering for at se optimerede ruter</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
