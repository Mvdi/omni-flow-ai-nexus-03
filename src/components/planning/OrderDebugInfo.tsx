
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrders } from '@/hooks/useOrders';

export const OrderDebugInfo: React.FC = () => {
  const { orders } = useOrders();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordre Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p><strong>Nuværende uge:</strong> {currentWeek}</p>
          <p><strong>Total ordre:</strong> {orders.length}</p>
        </div>

        {specificOrder && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Din ordre (cc12312c):</h4>
            <div className="text-sm space-y-1">
              <p><strong>Kunde:</strong> {specificOrder.customer}</p>
              <p><strong>Status:</strong> {specificOrder.status}</p>
              <p><strong>Planlagt uge:</strong> {specificOrder.scheduled_week || 'Ikke sat'}</p>
              <p><strong>Planlagt dato:</strong> {specificOrder.scheduled_date || 'Ikke sat'}</p>
              <p><strong>Medarbejder:</strong> {specificOrder.assigned_employee_id ? 'Tildelt' : 'Ikke tildelt'}</p>
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
                <Badge variant="outline">
                  {ordersByWeek[week].length} ordre
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Ordre uden uge-tildeling:</h4>
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
      </CardContent>
    </Card>
  );
};
