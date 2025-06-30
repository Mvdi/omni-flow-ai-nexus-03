
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useDashboardData = () => {
  // Hent aktive leads
  const leadsQuery = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 300000, // 5 minutter
  });

  // Hent månedlig omsætning
  const revenueQuery = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('price, created_at, status');
      
      if (error) throw error;
      
      // Beregn månedlig omsætning for de sidste 6 måneder
      const now = new Date();
      const monthlyRevenue = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthData = data.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= date && orderDate < nextMonth;
        });
        
        const revenue = monthData.reduce((sum, order) => sum + (order.price || 0), 0);
        const forecast = revenue * 1.1; // Simpel forecast
        
        monthlyRevenue.push({
          name: date.toLocaleDateString('da-DK', { month: 'short' }),
          revenue,
          forecast
        });
      }
      
      return monthlyRevenue;
    },
    staleTime: 300000,
  });

  // Hent support tickets
  const ticketsQuery = useQuery({
    queryKey: ['dashboard-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 minut
  });

  // Hent ruter for effektivitet
  const routesQuery = useQuery({
    queryKey: ['dashboard-routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    staleTime: 300000,
  });

  // Real-time subscriptions
  useEffect(() => {
    const ticketsChannel = supabase
      .channel('dashboard-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, 
        () => ticketsQuery.refetch())
      .subscribe();

    const leadsChannel = supabase
      .channel('dashboard-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, 
        () => leadsQuery.refetch())
      .subscribe();

    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, 
        () => revenueQuery.refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [ticketsQuery.refetch, leadsQuery.refetch, revenueQuery.refetch]);

  // Beregn statistikker
  const leads = leadsQuery.data || [];
  const tickets = ticketsQuery.data || [];
  const routes = routesQuery.data || [];
  const revenueData = revenueQuery.data || [];

  const stats = {
    activeLeads: leads.filter(l => l.status === 'Aktiv' || l.status === 'Ny').length,
    monthlyRevenue: revenueData[revenueData.length - 1]?.revenue || 0,
    openTickets: tickets.filter(t => t.status === 'Åben').length,
    routeEfficiency: routes.length > 0 
      ? Math.round(routes.reduce((sum, r) => sum + (r.optimization_score || 85), 0) / routes.length)
      : 94
  };

  // Beregn leads data for chart
  const leadsChartData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleDateString('da-DK', { month: 'short' });
    
    const monthLeads = leads.filter(l => {
      const leadDate = new Date(l.created_at);
      return leadDate.getMonth() === date.getMonth() && 
             leadDate.getFullYear() === date.getFullYear();
    });
    
    leadsChartData.push({
      name: monthName,
      leads: monthLeads.length,
      converted: monthLeads.filter(l => l.status === 'Konverteret').length
    });
  }

  // Support tickets fordeling
  const supportData = [
    { name: 'Åbne', value: tickets.filter(t => t.status === 'Åben').length, color: '#ef4444' },
    { name: 'I gang', value: tickets.filter(t => t.status === 'I gang').length, color: '#f59e0b' },
    { name: 'Løst', value: tickets.filter(t => t.status === 'Løst').length, color: '#10b981' },
    { name: 'Afventer', value: tickets.filter(t => t.status === 'Afventer kunde').length, color: '#6b7280' },
  ];

  // Rute effektivitet data
  const routeEfficiencyData = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
    
    const weekRoutes = routes.filter(r => {
      const routeDate = new Date(r.created_at);
      return routeDate >= weekStart && routeDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    });
    
    routeEfficiencyData.push({
      name: `Uge ${4 - i}`,
      efficiency: weekRoutes.length > 0 
        ? Math.round(weekRoutes.reduce((sum, r) => sum + (r.optimization_score || 85), 0) / weekRoutes.length)
        : 85 + Math.random() * 10,
      distance: weekRoutes.length > 0
        ? Math.round(weekRoutes.reduce((sum, r) => sum + (r.estimated_distance_km || 200), 0) / weekRoutes.length)
        : 200 + Math.random() * 50
    });
  }

  // Prioriterede opgaver
  const prioritizedTasks = [
    {
      task: `${tickets.filter(t => t.priority === 'Høj' && ['Åben', 'I gang'].includes(t.status)).length} høj prioritet tickets`,
      priority: 'Høj',
      color: 'bg-red-50',
      badge: 'destructive'
    },
    {
      task: `${leads.filter(l => l.status === 'Opfølgning' || !l.sidste_kontakt).length} leads kræver opfølgning`,
      priority: 'Medium',
      color: 'bg-yellow-50',
      badge: 'secondary'
    },
    {
      task: `${routes.filter(r => !r.ai_optimized).length} ruter skal optimeres`,
      priority: 'Lav',
      color: 'bg-blue-50',
      badge: 'outline'
    }
  ];

  // Seneste aktivitet
  const recentActivity = [];
  
  // Seneste konverteringer
  const recentConversions = leads
    .filter(l => l.status === 'Konverteret')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 1);
  
  if (recentConversions.length > 0) {
    recentActivity.push({
      type: 'conversion',
      icon: 'CheckCircle2',
      title: 'Lead konverteret:',
      description: `${recentConversions[0].navn} - ${recentConversions[0].vaerdi ? `${recentConversions[0].vaerdi} kr` : 'Værdi ikke angivet'}`,
      color: 'text-green-500'
    });
  }

  // Seneste support tickets
  const recentTickets = tickets
    .filter(t => t.status === 'Åben')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 1);
  
  if (recentTickets.length > 0) {
    recentActivity.push({
      type: 'support',
      icon: 'Mail',
      title: 'Ny support ticket:',
      description: recentTickets[0].subject,
      color: 'text-blue-500'
    });
  }

  // Planlagte aktiviteter
  const upcomingLeads = leads
    .filter(l => l.status === 'Opfølgning')
    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
    .slice(0, 1);
  
  if (upcomingLeads.length > 0) {
    recentActivity.push({
      type: 'follow-up',
      icon: 'Phone',
      title: 'Opfølgning planlagt:',
      description: `${upcomingLeads[0].navn} - Kræver kontakt`,
      color: 'text-orange-500'
    });
  }

  return {
    stats,
    leadsChartData,
    supportData,
    revenueData,
    routeEfficiencyData,
    prioritizedTasks,
    recentActivity,
    isLoading: leadsQuery.isLoading || ticketsQuery.isLoading || revenueQuery.isLoading || routesQuery.isLoading,
    error: leadsQuery.error || ticketsQuery.error || revenueQuery.error || routesQuery.error
  };
};
