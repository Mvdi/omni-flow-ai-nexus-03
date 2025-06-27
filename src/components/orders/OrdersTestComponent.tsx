
import React from 'react';
import { useOrders } from '@/hooks/useOrders';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const OrdersTestComponent = () => {
  const { orders, loading, createOrder } = useOrders();
  
  const handleTestOrder = async () => {
    const testOrder = {
      order_type: 'Vinduespolering',
      customer: 'Test Kunde',
      customer_email: 'test@example.com',
      price: 500,
      status: 'Planlagt',
      priority: 'Normal'
    };
    
    console.log('Testing order creation...');
    await createOrder(testOrder);
  };

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders Test Component</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>Total orders: {orders.length}</p>
          <button 
            onClick={handleTestOrder}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Test Create Order
          </button>
          <div>
            <h3>Orders:</h3>
            {orders.map(order => (
              <div key={order.id} className="border p-2 mb-2">
                <p>Type: {order.order_type}</p>
                <p>Customer: {order.customer}</p>
                <p>Price: {order.price} kr</p>
                <p>Status: {order.status}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
