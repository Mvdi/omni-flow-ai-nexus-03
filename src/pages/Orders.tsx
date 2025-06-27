import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Settings, Filter, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { OrderDialog } from '@/components/orders/OrderDialog';
import { OrderSettingsDialog } from '@/components/orders/OrderSettingsDialog';
import { useOrders } from '@/hooks/useOrders';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const { orders, createOrder, updateOrder, deleteOrder, loading, refetch } = useOrders();
  const { user } = useAuth();

  // Load status options from localStorage
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('orderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.statusOptions) {
          setStatusOptions(settings.statusOptions);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        // Default status options
        setStatusOptions([
          { name: 'Ikke planlagt', color: '#6B7280' },
          { name: 'Planlagt', color: '#3B82F6' },
          { name: 'I gang', color: '#F59E0B' },
          { name: 'Færdig', color: '#10B981' },
          { name: 'Skal impregneres', color: '#8B5CF6' },
          { name: 'Skal algebehandles', color: '#F97316' },
          { name: 'Skal planlægges om', color: '#EF4444' }
        ]);
      }
    } else {
      // Default status options
      setStatusOptions([
        { name: 'Ikke planlagt', color: '#6B7280' },
        { name: 'Planlagt', color: '#3B82F6' },
        { name: 'I gang', color: '#F59E0B' },
        { name: 'Færdig', color: '#10B981' },
        { name: 'Skal impregneres', color: '#8B5CF6' },
        { name: 'Skal algebehandles', color: '#F97316' },
        { name: 'Skal planlægges om', color: '#EF4444' }
      ]);
    }
  }, []);

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(option => option.name === status);
    return statusOption ? statusOption.color : '#6B7280';
  };

  const handleCreateOrder = async (orderData: any) => {
    const success = await createOrder(orderData);
    if (success) {
      setIsOrderDialogOpen(false);
    }
  };

  const handleUpdateOrder = async (orderData: any) => {
    if (selectedOrder?.id) {
      const success = await updateOrder(selectedOrder.id, orderData);
      if (success) {
        setIsOrderDialogOpen(false);
        setSelectedOrder(null);
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Er du sikker på at du vil slette denne ordre?')) {
      await deleteOrder(orderId);
    }
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  const handleSettingsSave = (settings: any) => {
    console.log('Settings saved:', settings);
    setStatusOptions(settings.statusOptions || []);
    setIsSettingsDialogOpen(false);
  };

  const handleDeleteAllOrders = async () => {
    if (!user) {
      toast.error('Du skal være logget ind');
      return;
    }

    const confirmText = `SLET ALLE ${orders.length} ORDRE`;
    const userInput = prompt(
      `⚠️ ADVARSEL: Dette vil slette ALLE ${orders.length} ordre permanent!\n\nSkriv "${confirmText}" for at bekræfte:`
    );

    if (userInput !== confirmText) {
      toast.error('Sletning annulleret');
      return;
    }

    setIsDeletingAll(true);
    
    try {
      console.log('🗑️ Sletter alle ordre for bruger:', user.id);
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting all orders:', error);
        toast.error('Kunne ikke slette alle ordre');
        return;
      }

      console.log('✅ Alle ordre slettet');
      toast.success(`Alle ${orders.length} ordre er slettet`);
      await refetch();
      
    } catch (error) {
      console.error('Error deleting all orders:', error);
      toast.error('Fejl ved sletning af ordre');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Filter orders based on search term and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for filter dropdown
  const uniqueStatuses = [...new Set(orders.map(order => order.status))];

  // Use the new auto-refresh hook
  const autoRefreshHook = useAutoRefresh({
    enabled: true,
    interval: 30000,
    onRefresh: () => {
      refetch();
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ordrer</h1>
            <p className="text-gray-600">Administrer og følg dine ordrer</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsSettingsDialogOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Indstillinger
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAllOrders}
              disabled={isDeletingAll || orders.length === 0}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {isDeletingAll ? 'Sletter...' : `Slet Alle (${orders.length})`}
            </Button>
            <Button onClick={() => setIsOrderDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ny Ordre
            </Button>
          </div>
        </div>

        {/* VRP Test Notice */}
        {orders.length === 0 && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-green-600">🚀</div>
                <div>
                  <h3 className="font-semibold text-green-800">Klar til VRP-test</h3>
                  <p className="text-green-700 text-sm">
                    Alle ordre er slettet. Gå til <strong>Ruteplanlægning</strong> og brug <strong>Test Ordre Generator</strong> 
                    for at oprette nye testordre og teste det forbedrede VRP-system med Mapbox integration.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Søg og Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Søg efter kunde, ordre type eller ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Alle statuser</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ordre Oversigt ({filteredOrders.length})</CardTitle>
            <CardDescription>
              Oversigt over alle ordrer med status og planlægning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p>Indlæser ordrer...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Ingen ordrer fundet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Ordre ID</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Kunde</th>
                      <th className="text-left p-3 font-medium">Pris</th>
                      <th className="text-left p-3 font-medium">Uge</th>
                      <th className="text-left p-3 font-medium">Dato & Tid</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Handlinger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
                        </td>
                        <td className="p-3">{order.order_type}</td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{order.customer}</div>
                            {order.customer_email && (
                              <div className="text-sm text-gray-500">{order.customer_email}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">{order.price.toLocaleString('da-DK')} kr</td>
                        <td className="p-3">{order.scheduled_week || '-'}</td>
                        <td className="p-3">
                          {order.scheduled_date ? (
                            <div>
                              <div>{new Date(order.scheduled_date).toLocaleDateString('da-DK')}</div>
                              {order.scheduled_time && (
                                <div className="text-sm text-gray-500">
                                  {order.scheduled_time.slice(0, 5)}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3">
                          <Badge 
                            style={{ 
                              backgroundColor: getStatusColor(order.status),
                              color: 'white'
                            }}
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <OrderDialog
        isOpen={isOrderDialogOpen}
        onClose={() => {
          setIsOrderDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onSave={selectedOrder ? handleUpdateOrder : handleCreateOrder}
      />

      <OrderSettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
        onSave={handleSettingsSave}
      />
    </div>
  );
};

export default Orders;
