
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrders } from '@/hooks/useOrders';

export const OrderDebugInfo: React.FC = () => {
  const { orders, updateOrder } = useOrders();

  const getCurrentWeekNumber = (date: Date = new Date()) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const currentWeek = getCurrentWeekNumber();
  
  // Find the specific order mentioned by the user
  const specificOrder = orders.find(order => order.id.startsWith('cc12312c'));
  
  // Group orders by week
  const ordersByWeek = orders.reduce((acc, order) => {
    const week = order.scheduled_week || 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(order);
    return acc;
  }, {} as Record<number, typeof orders>);

  const weeks = Object.keys(ordersByWeek).map(Number).sort((a, b) => a - b);

  // VRP Analysis
  const ordersWithCoordinates = orders.filter(order => order.latitude && order.longitude);
  const ordersWithDuration = orders.filter(order => order.estimated_duration && order.estimated_duration > 0);
  const ordersWithTimeSlots = orders.filter(order => order.scheduled_time);
  
  // Time distribution analysis
  const timeDistribution = orders.reduce((acc, order) => {
    const time = order.scheduled_time || 'Ingen tid';
    const hour = time.split(':')[0];
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Auto-fix function for orders missing dates
  const autoFixMissingDates = async () => {
    const ordersToFix = orders.filter(order => 
      order.scheduled_week && !order.scheduled_date
    );

    for (const order of ordersToFix) {
      // Calculate Monday of the scheduled week
      const now = new Date();
      const currentWeekNum = getCurrentWeekNumber();
      const weekDiff = order.scheduled_week! - currentWeekNum;
      
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + (weekDiff * 7));
      
      // Get Monday of that week
      const startOfWeek = new Date(targetDate);
      const dayOfWeek = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      
      const mondayDate = startOfWeek.toISOString().split('T')[0];
      
      await updateOrder(order.id, {
        scheduled_date: mondayDate,
        scheduled_time: order.scheduled_time || '08:00'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>VRP Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p><strong>Nuværende uge:</strong> {currentWeek}</p>
          <p><strong>Total ordre:</strong> {orders.length}</p>
        </div>

        {/* VRP Readiness Analysis */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">VRP Optimerings-Analyse:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>GPS-koordinater:</strong> {ordersWithCoordinates.length}/{orders.length}</p>
              <p><strong>Service-tider:</strong> {ordersWithDuration.length}/{orders.length}</p>
              <p><strong>Tidspunkter sat:</strong> {ordersWithTimeSlots.length}/{orders.length}</p>
            </div>
            <div>
              <p><strong>Gennemsnit service-tid:</strong> {
                ordersWithDuration.length > 0 
                  ? Math.round(ordersWithDuration.reduce((sum, o) => sum + o.estimated_duration!, 0) / ordersWithDuration.length)
                  : 0
              } min</p>
              <p><strong>Højeste prioritet:</strong> {orders.filter(o => o.priority === 'Kritisk').length} kritiske</p>
              <p><strong>VRP-klar:</strong> {ordersWithCoordinates.length === orders.length && ordersWithDuration.length === orders.length ? '✅' : '❌'}</p>
            </div>
          </div>
        </div>

        {/* Time Distribution Analysis */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold mb-2">Tidsfordelings-Problem:</h4>
          <div className="text-sm space-y-1">
            {Object.entries(timeDistribution).map(([hour, count]) => (
              <div key={hour} className="flex justify-between">
                <span>Kl. {hour}:xx</span>
                <Badge variant={count > 10 ? "destructive" : count > 5 ? "secondary" : "outline"}>
                  {count} ordre
                </Badge>
              </div>
            ))}
            {timeDistribution['08'] > 10 && (
              <p className="text-red-600 font-semibold mt-2">⚠️ {timeDistribution['08']} ordrer alle kl 08:xx - VRP optimering påkrævet!</p>
            )}
          </div>
        </div>

        {specificOrder && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Din ordre (cc12312c):</h4>
            <div className="text-sm space-y-1">
              <p><strong>Kunde:</strong> {specificOrder.customer}</p>
              <p><strong>Status:</strong> {specificOrder.status}</p>
              <p><strong>Planlagt uge:</strong> {specificOrder.scheduled_week || 'Ikke sat'}</p>
              <p><strong>Planlagt dato:</strong> {specificOrder.scheduled_date || 'Ikke sat'}</p>
              <p><strong>Planlagt tid:</strong> {specificOrder.scheduled_time || 'Ikke sat'}</p>
              <p><strong>Service-tid:</strong> {specificOrder.estimated_duration || 'Ikke sat'} min</p>
              <p><strong>GPS:</strong> {specificOrder.latitude && specificOrder.longitude ? `${specificOrder.latitude.toFixed(4)}, ${specificOrder.longitude.toFixed(4)}` : 'Ikke sat'}</p>
              <p><strong>Medarbejder:</strong> {specificOrder.assigned_employee_id ? 'Tildelt' : 'Ikke tildelt'}</p>
              {specificOrder.scheduled_week && !specificOrder.scheduled_date && (
                <p className="text-red-600 font-semibold">⚠️ Ordre har uge men mangler specifik dato!</p>
              )}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-2">Ordre fordelt på uger:</h4>
          <div className="space-y-2">
            {weeks.map(week => (
              <div key={week} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">
                  Uge {week} {week === currentWeek && <Badge variant="secondary">Nuværende</Badge>}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {ordersByWeek[week].length} ordre
                  </Badge>
                  {week > 0 && ordersByWeek[week].some(order => !order.scheduled_date) && (
                    <Badge variant="destructive" className="text-xs">
                      Mangler datoer
                    </Badge>
                  )}
                  {week > 0 && ordersByWeek[week].filter(o => o.scheduled_time === '08:00').length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      Alle kl 08:00
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Ordre uden uge-tildeling:</h4>
            {orders.filter(order => order.scheduled_week && !order.scheduled_date).length > 0 && (
              <Button onClick={autoFixMissingDates} size="sm" variant="outline">
                Auto-fix manglende datoer
              </Button>
            )}
          </div>
          <div className="text-sm">
            {orders.filter(order => !order.scheduled_week).length > 0 ? (
              orders.filter(order => !order.scheduled_week).map(order => (
                <div key={order.id} className="p-2 bg-yellow-50 rounded mb-1">
                  {order.customer} - {order.order_type} (Status: {order.status})
                </div>
              ))
            ) : (
              <p className="text-gray-500">Alle ordre har uge-tildeling</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Ordre med uge men uden dato:</h4>
          <div className="text-sm">
            {orders.filter(order => order.scheduled_week && !order.scheduled_date).length > 0 ? (
              orders.filter(order => order.scheduled_week && !order.scheduled_date).map(order => (
                <div key={order.id} className="p-2 bg-orange-50 rounded mb-1">
                  <div className="flex justify-between items-center">
                    <span>{order.customer} - Uge {order.scheduled_week}</span>
                    <Badge variant="outline" className="text-xs">Vil auto-tildeles</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Alle ordre med uge har også specifik dato</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
