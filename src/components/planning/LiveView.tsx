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

// Use demo token - should be moved to environment configuration
const MAPBOX_TOKEN = process.env.NODE_ENV === 'production' 
  ? 'pk.production_token_here' 
  : 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

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

  // Get current user and find their assigned vehicle
  const getCurrentUserVehicle = () => {
    // Hardcoded mapping for mani@mmmultipartner.dk -> V2 Toyota Proace - Madi
    return vehicles.find(vehicle => vehicle.name.includes('V2 Toyota Proace - Madi'));
  };

  // Filter orders for selected week and employee
  const weekOrders = orders.filter(order => {
    if (order.scheduled_week !== weekNumber) return false;
    if (selectedEmployee !== 'all' && order.assigned_employee_id !== selectedEmployee) return false;
    return order.latitude && order.longitude; // Only orders with coordinates
  });

  // Get routes for the week
  const weekRoutes = routes.filter(route => {
    const routeWeek = getWeekNumber(new Date(route.route_date));
    if (routeWeek !== weekNumber) return false;
    if (selectedEmployee !== 'all' && route.employee_id !== selectedEmployee) return false;
    return true;
  });

// Initialize map with proper Mapbox token
  useEffect(() => {
    if (!mapContainer.current) return;

    // Use environment-appropriate token
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [9.6229, 55.8144], // Center on Denmark/Viborg area
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Ensure map loads properly
    map.current.on('load', () => {
      console.log('Map loaded successfully');
    });

    map.current.on('error', (e) => {
      console.error('Map error:', e);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update map with vehicles and routes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Clear existing markers and sources
    const existingMarkers = document.querySelectorAll('.vehicle-marker, .order-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add vehicle markers with updated data structure
    vehicles.forEach(vehicle => {
      if (vehicle.location) {
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.innerHTML = `
          <div style="
            background-color: #3b82f6;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            🚗
          </div>
        `;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([vehicle.location.longitude, vehicle.location.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-3">
                  <h3 class="font-semibold text-lg">${vehicle.name}</h3>
                  <p class="text-sm text-gray-600">${vehicle.make} ${vehicle.model}</p>
                  <p class="text-sm">Nummerplade: ${vehicle.licensePlateNumber}</p>
                  <p class="text-xs text-gray-500">Opdateret: ${new Date(vehicle.timestamp).toLocaleString('da-DK')}</p>
                  <p class="text-xs">${vehicle.isDriving ? '🟢 Kører' : '🔴 Parkeret'}</p>
                  <p class="text-xs">Kilometerstand: ${vehicle.mileage.toLocaleString()} km</p>
                </div>
              `)
          )
          .addTo(map.current!);
      }
    });

    // Create route for orders with coordinates
    if (weekOrders.length > 1) {
      const routeCoordinates = weekOrders
        .sort((a, b) => (a.order_sequence || 0) - (b.order_sequence || 0))
        .map(order => [order.longitude!, order.latitude!]);

      // Remove existing route source and layer
      if (map.current!.getSource('route-line')) {
        map.current!.removeLayer('route-line');
        map.current!.removeSource('route-line');
      }

      // Add route line
      map.current!.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
        },
      });

      map.current!.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ef4444',
          'line-width': 6,
          'line-opacity': 0.8,
        },
      });
    }

    // Add order markers
    weekOrders.forEach((order, index) => {
      const el = document.createElement('div');
      el.className = 'order-marker';
      el.innerHTML = `
        <div style="
          background-color: #ef4444;
          color: white;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${index + 1}
        </div>
      `;

      new mapboxgl.Marker(el)
        .setLngLat([order.longitude!, order.latitude!])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-3">
                <h3 class="font-semibold">${order.customer}</h3>
                <p class="text-sm text-gray-600">${order.order_type}</p>
                <p class="text-sm">${order.address || 'Ingen adresse'}</p>
                <p class="text-xs text-gray-500">Stop ${index + 1}</p>
                <p class="text-xs text-gray-500">Tid: ${order.scheduled_time || 'Ikke planlagt'}</p>
                <p class="text-xs text-green-600">${order.price.toLocaleString()} kr</p>
              </div>
            `)
        )
        .addTo(map.current!);
    });

    // Fit map to show all markers
    if (vehicles.length > 0 || weekOrders.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      
      vehicles.forEach(vehicle => {
        if (vehicle.location) {
          bounds.extend([vehicle.location.longitude, vehicle.location.latitude]);
        }
      });
      
      weekOrders.forEach(order => {
        bounds.extend([order.longitude!, order.latitude!]);
      });

      if (!bounds.isEmpty()) {
        map.current!.fitBounds(bounds, { padding: 50 });
      }
    }
  }, [vehicles, weekOrders]);

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
                <p className="text-sm font-medium text-gray-600">Ordrer på rute</p>
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
                <Badge variant={vehicle.location ? "default" : "secondary"}>
                  {vehicle.location ? "Online" : "Offline"}
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Nummerplade:</span> {vehicle.licensePlateNumber}</p>
                {vehicle.location && (
                  <>
                    <p><span className="font-medium">Position:</span> {vehicle.location.latitude.toFixed(4)}, {vehicle.location.longitude.toFixed(4)}</p>
                    <p><span className="font-medium">Tidsstempel:</span> {new Date(vehicle.timestamp).toLocaleString('da-DK')}</p>
                    <p><span className="font-medium">Status:</span> {vehicle.isDriving ? '🟢 Kører' : '🔴 Parkeret'}</p>
                    <p><span className="font-medium">Kilometerstand:</span> {vehicle.mileage.toLocaleString()} km</p>
                  </>
                )}
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-2">Dagens rute:</p>
                {vehicle.name.includes('V2 Toyota Proace - Madi') && weekOrders.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs bg-green-50 p-2 rounded border border-green-200">
                      <p className="font-medium text-green-800">📍 Tildelt til mani@mmmultipartner.dk</p>
                      <p className="text-green-600">{weekOrders.length} ordrer på ruten</p>
                    </div>
                    {weekOrders.slice(0, 3).map((order, index) => (
                      <div key={order.id} className="text-xs bg-gray-50 p-2 rounded">
                        <p className="font-medium">Stop {index + 1}: {order.customer}</p>
                        <p className="text-gray-600">{order.scheduled_time || 'Ikke planlagt'} - {order.price.toLocaleString()} kr</p>
                      </div>
                    ))}
                    {weekOrders.length > 3 && (
                      <p className="text-xs text-gray-500">...og {weekOrders.length - 3} flere ordrer</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Ingen ordrer tildelt denne uge</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};