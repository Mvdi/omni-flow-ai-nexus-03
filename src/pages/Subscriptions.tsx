import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, Users, Pause, Play, X, FileText } from 'lucide-react';
import { SubscriptionDialog } from '@/components/subscriptions/SubscriptionDialog';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useFixSubscriptionOrders } from '@/hooks/useFixSubscriptionOrders';
import type { Subscription } from '@/hooks/useSubscriptions';

const Subscriptions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [prefilledData, setPrefilledData] = useState<any>(null);

  const { 
    subscriptions, 
    loading, 
    createSubscription, 
    updateSubscription, 
    cancelSubscription, 
    pauseSubscription, 
    resumeSubscription,
    reactivateSubscription,
    createOrderFromSubscription 
  } = useSubscriptions();

  const { fixSubscriptionOrders } = useFixSubscriptionOrders();

  // Listen for order-to-subscription conversion events
  React.useEffect(() => {
    const handleCreateSubscriptionFromOrder = (event: CustomEvent) => {
      setPrefilledData(event.detail);
      setSelectedSubscription(null);
      setIsDialogOpen(true);
    };

    window.addEventListener('createSubscriptionFromOrder', handleCreateSubscriptionFromOrder as EventListener);
    
    return () => {
      window.removeEventListener('createSubscriptionFromOrder', handleCreateSubscriptionFromOrder as EventListener);
    };
  }, []);

  const handleCreateSubscription = async (subscriptionData: any) => {
    const success = await createSubscription(subscriptionData);
    if (success) {
      setIsDialogOpen(false);
      setPrefilledData(null);
    }
  };

  const handleUpdateSubscription = async (subscriptionData: any) => {
    if (selectedSubscription?.id) {
      const success = await updateSubscription(selectedSubscription.id, subscriptionData);
      if (success) {
        setIsDialogOpen(false);
        setSelectedSubscription(null);
      }
    }
  };

  const handleEditSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsDialogOpen(true);
  };

  const handleCancelSubscription = async (id: string) => {
    if (confirm('Er du sikker på at du vil opsige dette abonnement?')) {
      await cancelSubscription(id);
    }
  };

  const handlePauseSubscription = async (id: string) => {
    await pauseSubscription(id);
  };

  const handleResumeSubscription = async (id: string) => {
    await resumeSubscription(id);
  };

  const handleCreateOrder = async (subscriptionId: string) => {
    await createOrderFromSubscription(subscriptionId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleReactivateSubscription = async (id: string) => {
    await reactivateSubscription(id);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'paused': return 'Pauseret';
      case 'cancelled': return 'Opsagt';
      default: return status;
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = !searchTerm || 
      subscription.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.service_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || subscription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const uniqueStatuses = [...new Set(subscriptions.map(sub => sub.status))];

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const totalMonthlyRevenue = activeSubscriptions.reduce((sum, sub) => {
    // Calculate monthly revenue: price per interval * (weeks per month / interval weeks)
    // 52 weeks per year / 12 months = 4.33 weeks per month
    const weeksPerMonth = 52 / 12;
    const monthlyRevenue = sub.price * (weeksPerMonth / sub.interval_weeks);
    return sum + monthlyRevenue;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Abonnementer</h1>
            <p className="text-gray-600">Administrer dine tilbagevendende serviceopgaver</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nyt Abonnement
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Aktive</p>
                  <p className="text-2xl font-bold text-green-600">{activeSubscriptions.length}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-blue-600">{subscriptions.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Månedsindtægt</p>
                  <p className="text-2xl font-bold text-purple-600">{totalMonthlyRevenue.toLocaleString('da-DK')} kr</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Opsagte</p>
                  <p className="text-2xl font-bold text-red-600">{subscriptions.filter(s => s.status === 'cancelled').length}</p>
                </div>
                <X className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

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
                  placeholder="Søg efter kunde, email eller service..."
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
                    <option key={status} value={status}>{getStatusText(status)}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle>Abonnementer ({filteredSubscriptions.length})</CardTitle>
            <CardDescription>
              Oversigt over alle abonnementer og deres status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p>Indlæser abonnementer...</p>
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Ingen abonnementer fundet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubscriptions.map((subscription) => (
                  <div key={subscription.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{subscription.customer_name}</h3>
                          <Badge className={getStatusColor(subscription.status)}>
                            {getStatusText(subscription.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Service</p>
                            <p className="font-medium">{subscription.service_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Interval</p>
                            <p className="font-medium">Hver {subscription.interval_weeks} uge{subscription.interval_weeks > 1 ? 'r' : ''}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Pris</p>
                            <p className="font-medium">{subscription.price.toLocaleString('da-DK')} kr</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Næste service</p>
                            <p className="font-medium">{new Date(subscription.next_due_date).toLocaleDateString('da-DK')}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="text-sm">{subscription.customer_email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Varighed</p>
                            <p className="text-sm">{subscription.estimated_duration} minutter</p>
                          </div>
                        </div>

                        {subscription.description && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">Beskrivelse</p>
                            <p className="text-sm">{subscription.description}</p>
                          </div>
                        )}

                        {subscription.notes && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">Noter</p>
                            <p className="text-sm bg-yellow-50 p-2 rounded">{subscription.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSubscription(subscription)}
                        >
                          Rediger
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateOrder(subscription.id)}
                          disabled={subscription.status !== 'active'}
                        >
                          Lav Ordre
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fixSubscriptionOrders(subscription.id)}
                          className="text-orange-600 border-orange-600"
                        >
                          Ret Ordrer
                        </Button>

                        {subscription.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePauseSubscription(subscription.id)}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}

                        {subscription.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResumeSubscription(subscription.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Genoptag
                          </Button>
                        )}

                        {subscription.status === 'cancelled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivateSubscription(subscription.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Genaktiver
                          </Button>
                        )}

                        {subscription.status !== 'cancelled' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelSubscription(subscription.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Opsig
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog */}
      <SubscriptionDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedSubscription(null);
          setPrefilledData(null);
        }}
        subscription={selectedSubscription}
        prefilledData={prefilledData}
        onSave={selectedSubscription ? handleUpdateSubscription : handleCreateSubscription}
      />
    </div>
  );
};

export default Subscriptions;