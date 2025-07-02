import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Truck, RefreshCw, Clock, User, Navigation } from 'lucide-react';
import { useKeatechAPI } from '@/hooks/useKeatechAPI';
import { useOrders } from '@/hooks/useOrders';
import { useEmployees } from '@/hooks/useEmployees';
import { useRoutes } from '@/hooks/useRoutes';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Dette skal sættes fra Supabase Edge Function Secrets
const MAPBOX_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'; // Placeholder

interface LiveViewProps {
  selectedWeek: Date;
  selectedEmployee: string;
}

export const LiveView: React.FC<LiveViewProps> = ({ selectedWeek, selectedEmployee }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const { vehicles, fetchVehicles, fetchVehicleTrips, isLoading } = useKeatechAPI();
  const { orders } = useOrders();
  const { employees } = useEmployees();
  const { routes } = useRoutes();

  // Get week number for filtering
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const weekNumber = getWeekNumber(selectedWeek);

  // Filter orders for selected week and employee
  const weekOrders = orders.filter(order => {
    if (order.scheduled_week !== weekNumber) return false;
    if (selectedEmployee !== 'all' && order.assigned_employee_id !== selectedEmployee) return false;
    return true;
  });

  // Get routes for the week
  const weekRoutes = routes.filter(route => {
    const routeWeek = getWeekNumber(new Date(route.route_date));
    if (routeWeek !== weekNumber) return false;
    if (selectedEmployee !== 'all' && route.employee_id !== selectedEmployee) return false;
    return true;
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [12.5683, 55.6761], // Copenhagen center
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update map with vehicles and routes
  useEffect(() => {
    if (!map.current) return;

    map.current.on('load', () => {
      // Add vehicle markers
      vehicles.forEach(vehicle => {
        if (vehicle.lastPosition) {
          const el = document.createElement('div');
          el.className = 'vehicle-marker';
          el.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTcgMTdIMTdMMTkgOUg1TDcgMTdaIiBzdHJva2U9IiMxZjJhM2EiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iIzNiODJmNiIvPgo8L3N2Zz4K)';
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.backgroundSize = '100%';

          new mapboxgl.Marker(el)
            .setLngLat([vehicle.lastPosition.longitude, vehicle.lastPosition.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <div class="p-2">
                    <h3 class="font-semibold">${vehicle.name}</h3>
                    <p class="text-sm text-gray-600">Device ID: ${vehicle.deviceId}</p>
                    <p class="text-xs text-gray-500">Opdateret: ${new Date(vehicle.lastPosition.timestamp).toLocaleString('da-DK')}</p>
                    ${vehicle.lastPosition.speed ? `<p class="text-xs">Hastighed: ${vehicle.lastPosition.speed} km/h</p>` : ''}
                  </div>
                `)
            )
            .addTo(map.current!);
        }
      });

      // Add route lines
      weekRoutes.forEach(route => {
        const routeOrders = weekOrders.filter(order => order.route_id === route.id);
        if (routeOrders.length > 0) {
          const coordinates = routeOrders
            .filter(order => order.latitude && order.longitude)
            .sort((a, b) => (a.order_sequence || 0) - (b.order_sequence || 0))
            .map(order => [order.longitude!, order.latitude!]);

          if (coordinates.length > 1) {
            map.current!.addSource(`route-${route.id}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates,
                },
              },
            });

            map.current!.addLayer({
              id: `route-${route.id}`,
              type: 'line',
              source: `route-${route.id}`,
              layout: {
                'line-join': 'round',
                'line-cap': 'round',
              },
              paint: {
                'line-color': '#3b82f6',
                'line-width': 4,
                'line-opacity': 0.8,
              },
            });
          }

          // Add order markers
          routeOrders.forEach((order, index) => {
            if (order.latitude && order.longitude) {
              const el = document.createElement('div');
              el.className = 'order-marker';
              el.innerHTML = `<div class="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">${index + 1}</div>`;

              new mapboxgl.Marker(el)
                .setLngLat([order.longitude, order.latitude])
                .setPopup(
                  new mapboxgl.Popup({ offset: 25 })
                    .setHTML(`
                      <div class="p-2">
                        <h3 class="font-semibold">${order.customer}</h3>
                        <p class="text-sm text-gray-600">${order.order_type}</p>
                        <p class="text-sm">${order.address || 'Ingen adresse'}</p>
                        <p class="text-xs text-gray-500">Tid: ${order.scheduled_time || 'Ikke planlagt'}</p>
                        <p class="text-xs text-green-600">${order.price} kr</p>
                      </div>
                    `)
                )
                .addTo(map.current!);
            }
          });
        }
      });
    });
  }, [vehicles, weekOrders, weekRoutes]);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchVehicles();
      setLastUpdate(new Date());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchVehicles]);

  const handleRefresh = () => {
    fetchVehicles();
    setLastUpdate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Live View - Uge {weekNumber}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Realtids tracking af køretøjer og ruter
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Vælg køretøj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle køretøjer</SelectItem>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-opdater
              </Button>

              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Opdater nu
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktive køretøjer</p>
                <p className="text-2xl font-bold">{vehicles.length}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ordrer i uge</p>
                <p className="text-2xl font-bold">{weekOrders.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktive ruter</p>
                <p className="text-2xl font-bold">{weekRoutes.length}</p>
              </div>
              <Navigation className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sidst opdateret</p>
                <p className="text-sm font-medium">{lastUpdate.toLocaleTimeString('da-DK')}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div ref={mapContainer} className="w-full h-[600px] rounded-lg" />
        </CardContent>
      </Card>

      {/* Vehicle List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(vehicle => (
          <Card key={vehicle.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{vehicle.name}</h3>
                <Badge variant={vehicle.lastPosition ? "default" : "secondary"}>
                  {vehicle.lastPosition ? "Online" : "Offline"}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Device ID:</span> {vehicle.deviceId}</p>
                {vehicle.lastPosition && (
                  <>
                    <p><span className="font-medium">Position:</span> {vehicle.lastPosition.latitude.toFixed(4)}, {vehicle.lastPosition.longitude.toFixed(4)}</p>
                    <p><span className="font-medium">Tidsstempel:</span> {new Date(vehicle.lastPosition.timestamp).toLocaleString('da-DK')}</p>
                    {vehicle.lastPosition.speed && (
                      <p><span className="font-medium">Hastighed:</span> {vehicle.lastPosition.speed} km/h</p>
                    )}
                  </>
                )}
              </div>

              {/* Show assigned orders for this vehicle */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2">Ordrer for i dag:</p>
                {weekOrders.filter(order => {
                  const employee = employees.find(emp => emp.id === order.assigned_employee_id);
                  return employee && employee.name.toLowerCase().includes(vehicle.name.toLowerCase());
                }).length > 0 ? (
                  <div className="space-y-1">
                    {weekOrders.filter(order => {
                      const employee = employees.find(emp => emp.id === order.assigned_employee_id);
                      return employee && employee.name.toLowerCase().includes(vehicle.name.toLowerCase());
                    }).slice(0, 3).map(order => (
                      <div key={order.id} className="text-xs bg-gray-50 p-2 rounded">
                        <p className="font-medium">{order.customer}</p>
                        <p className="text-gray-600">{order.scheduled_time || 'Ikke planlagt'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Ingen ordrer tildelt</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};