
import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  User,
  DollarSign,
  Clock,
  Settings,
  Edit,
  Trash2
} from 'lucide-react';
import { OrderDialog } from '@/components/orders/OrderDialog';
import { OrderSettingsDialog } from '@/components/orders/OrderSettingsDialog';
import { useOrders } from '@/hooks/useOrders';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Orders = () => {
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [weekFilter, setWeekFilter] = useState('all');
  const [statusColors, setStatusColors] = useState<Record<string, string>>({});
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  const { orders, loading, createOrder, updateOrder, deleteOrder } = useOrders();

  // Load status colors from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('orderSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.statusOptions) {
          const colorMap: Record<string, string> = {};
          const statuses: string[] = [];
          settings.statusOptions.forEach((status: any) => {
            colorMap[status.name] = status.color;
            statuses.push(status.name);
          });
          setStatusColors(colorMap);
          setAvailableStatuses(statuses);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Status color mapping with fallback colors
  const getStatusColor = (status: string) => {
    const savedColor = statusColors[status];
    if (savedColor) {
      // Convert hex color to Tailwind-compatible classes
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const rgb = hexToRgb(savedColor);
      if (rgb) {
        return `bg-[${savedColor}] text-white`;
      }
    }

    // Fallback colors
    switch (status) {
      case 'Ikke planlagt': return 'bg-gray-100 text-gray-800';
      case 'Planlagt': return 'bg-blue-100 text-blue-800';
      case 'I gang': return 'bg-yellow-100 text-yellow-800';
      case 'Færdig': return 'bg-green-100 text-green-800';
      case 'Skal impregneres': return 'bg-purple-100 text-purple-800';
      case 'Skal algebehandles': return 'bg-orange-100 text-orange-800';
      case 'Skal planlægges om': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.order_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesWeek = weekFilter === 'all' || order.scheduled_week?.toString() === weekFilter;
    
    return matchesSearch && matchesStatus && matchesWeek;
  });

  // Statistics
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'Færdig').length;
  const plannedOrders = orders.filter(o => o.status === 'Planlagt').length;
  const unplannedOrders = orders.filter(o => o.status === 'Ikke planlagt').length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  const handleNewOrder = () => {
    setSelectedOrder(null);
    setIsOrderDialogOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Er du sikker på, at du vil slette denne ordre?')) {
      await deleteOrder(orderId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Indlæser ordre...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              Ordre
            </h1>
            <p className="text-gray-600">Administrer alle ordre og planlæg levering</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Indstillinger
            </Button>
            <Button onClick={handleNewOrder} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Ny Ordre
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Samlede Ordre</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ikke Planlagt</p>
                  <p className="text-2xl font-bold text-gray-900">{unplannedOrders}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Planlagte</p>
                  <p className="text-2xl font-bold text-gray-900">{plannedOrders}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Færdige</p>
                  <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Omsætning</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} kr</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Søg efter ordre, kunde eller type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Vælg status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statusser</SelectItem>
                  {availableStatuses.length > 0 ? 
                    availableStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    )) : 
                    <>
                      <SelectItem value="Ikke planlagt">Ikke planlagt</SelectItem>
                      <SelectItem value="Planlagt">Planlagt</SelectItem>
                      <SelectItem value="I gang">I gang</SelectItem>
                      <SelectItem value="Færdig">Færdig</SelectItem>
                      <SelectItem value="Skal impregneres">Skal impregneres</SelectItem>
                      <SelectItem value="Skal algebehandles">Skal algebehandles</SelectItem>
                      <SelectItem value="Skal planlægges om">Skal planlægges om</SelectItem>
                    </>
                  }
                </SelectContent>
              </Select>
              <Select value={weekFilter} onValueChange={setWeekFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Vælg uge" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle uger</SelectItem>
                  <SelectItem value="28">Uge 28</SelectItem>
                  <SelectItem value="29">Uge 29</SelectItem>
                  <SelectItem value="30">Uge 30</SelectItem>
                  <SelectItem value="31">Uge 31</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="shadow-sm border-0">
          <CardHeader>
            <CardTitle>Ordreoversigt</CardTitle>
            <CardDescription>
              {filteredOrders.length} ordre fundet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordre ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Pris</TableHead>
                  <TableHead>Uge</TableHead>
                  <TableHead>Dato & Tid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                    <TableCell>{order.order_type}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer}</div>
                        <div className="text-sm text-gray-500">{order.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{order.price.toLocaleString()} kr</TableCell>
                    <TableCell>
                      {order.scheduled_week && (
                        <Badge variant="outline">Uge {order.scheduled_week}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.scheduled_date && <div>{order.scheduled_date}</div>}
                        {order.scheduled_time && <div className="text-gray-500">{order.scheduled_time}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditOrder(order)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteOrder(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <OrderDialog 
        isOpen={isOrderDialogOpen}
        onClose={() => setIsOrderDialogOpen(false)}
        order={selectedOrder}
        onSave={async (orderData) => {
          if (selectedOrder) {
            await updateOrder(selectedOrder.id, orderData);
          } else {
            await createOrder(orderData);
          }
          setIsOrderDialogOpen(false);
        }}
      />

      <OrderSettingsDialog 
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
        onSave={(settings) => {
          console.log('Saving settings:', settings);
          setIsSettingsDialogOpen(false);
          // Reload the page to refresh status colors
          window.location.reload();
        }}
      />
    </div>
  );
};

export default Orders;
