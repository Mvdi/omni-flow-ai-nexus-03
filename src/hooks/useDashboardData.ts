
import { useQuery } from '@tanstack/react-query';
import { useTickets } from './useTickets';
import { useOrders } from './useOrders';
import { useLeads } from './useLeads';

export const useDashboardData = () => {
  const { data: tickets = [] } = useTickets();
  const { orders } = useOrders(); // Fix: use 'orders' instead of 'data'
  const { data: leads = [] } = useLeads();

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-data', tickets, orders, leads],
    queryFn: async () => {
      console.log('=== DASHBOARD DATA DEBUG ===');
      console.log('Processing data - Leads:', leads.length, 'Orders:', orders.length, 'Tickets:', tickets.length);

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Active leads calculation
      console.log('=== LEADS SUMMARY ===');
      const activeLeads = leads.filter(lead => {
        const isActive = !['closed-won', 'closed-lost'].includes(lead.status || '');
        console.log(`Lead ${lead.navn} status: "${lead.status}", isActive: ${isActive}`);
        return isActive;
      });

      console.log('Total leads:', leads.length);
      console.log('Active leads:', activeLeads.length);

      // Calculate conversion rate
      const convertedLeads = leads.filter(l => l.status === 'closed-won').length;
      console.log('Converted leads:', convertedLeads);

      // Monthly revenue from ORDERS (not leads)
      console.log('=== MONTHLY REVENUE DEBUG ===');
      console.log('Current date:', currentDate.toISOString());
      console.log('Looking for month:', currentMonth, '(juni), year:', currentYear);

      const monthlyRevenue = orders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          const isCurrentMonth = orderDate.getMonth() === currentMonth && 
                 orderDate.getFullYear() === currentYear;
          console.log(`Order: ${order.customer}, Date: ${order.created_at}, Month: ${orderDate.getMonth()}, Year: ${orderDate.getFullYear()}, IsCurrentMonth: ${isCurrentMonth}, Price: ${order.price}`);
          
          if (isCurrentMonth) {
            console.log('Adding order price:', order.price);
          }
          
          return isCurrentMonth;
        })
        .reduce((sum, order) => sum + (order.price || 0), 0);

      console.log('=== MONTHLY REVENUE RESULT ===');
      console.log('Orders in current month:', orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      }).length);
      console.log('Total monthly revenue:', monthlyRevenue, 'kr');

      // Tickets data
      const openTickets = tickets.filter(t => t.status === 'Åben').length;
      const avgResponseTime = tickets.length > 0 
        ? tickets.reduce((sum, t) => sum + (t.response_time_hours || 0), 0) / tickets.length 
        : 0;

      // Calculate route efficiency (mock calculation)
      const routeEfficiency = orders.length > 0 ? 80 : 0; // Mock value

      // Conversion rate calculation
      const totalLeadsEver = leads.length;
      const conversionRate = totalLeadsEver > 0 ? (convertedLeads / totalLeadsEver) * 100 : 0;

      console.log(`Open tickets: ${openTickets}, Route efficiency: ${routeEfficiency}%, Avg response time: ${Math.round(avgResponseTime)}h`);

      const stats = {
        activeLeads: activeLeads.length,
        monthlyRevenue,
        openTickets,
        routeEfficiency,
        conversionRate: Math.round(conversionRate * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        totalCustomers: leads.length, // Use leads as customer proxy
        completedOrders: orders.filter(o => o.status === 'Færdig').length
      };

      console.log('=== FINAL DASHBOARD STATS ===');
      console.log('Stats:', stats);

      // Generate chart data
      const leadsChartData = [
        { name: 'Jan', leads: 45, converted: 12 },
        { name: 'Feb', leads: 52, converted: 15 },
        { name: 'Mar', leads: 48, converted: 11 },
        { name: 'Apr', leads: 61, converted: 18 },
        { name: 'Maj', leads: 55, converted: 16 },
        { name: 'Jun', leads: activeLeads.length, converted: convertedLeads }
      ];

      const supportData = [
        { name: 'Åben', value: openTickets, color: '#ef4444' },
        { name: 'I gang', value: tickets.filter(t => t.status === 'I gang').length, color: '#f59e0b' },
        { name: 'Afventer', value: tickets.filter(t => t.status === 'Afventer kunde').length, color: '#3b82f6' },
        { name: 'Løst', value: tickets.filter(t => t.status === 'Løst').length, color: '#10b981' }
      ];

      const revenueData = [
        { name: 'Jan', revenue: 180000, forecast: 190000 },
        { name: 'Feb', revenue: 220000, forecast: 230000 },
        { name: 'Mar', revenue: 190000, forecast: 200000 },
        { name: 'Apr', revenue: 250000, forecast: 260000 },
        { name: 'Maj', revenue: 280000, forecast: 290000 },
        { name: 'Jun', revenue: monthlyRevenue, forecast: Math.round(monthlyRevenue * 1.1) }
      ];

      const performanceData = [
        { name: 'Lead Konvertering', value: Math.round(conversionRate), target: 25 },
        { name: 'Kunde Tilfredsstillelse', value: 87, target: 90 },
        { name: 'Responstid Mål', value: avgResponseTime > 0 ? Math.max(100 - avgResponseTime * 5, 0) : 95, target: 95 },
        { name: 'Månedligt Mål', value: Math.round((monthlyRevenue / 300000) * 100), target: 100 }
      ];

      const recentActivity = [
        { title: 'Nyt lead oprettet', description: 'Mathias Nielsen - Potentiel værdi: 15.000 kr', time: '2 min siden' },
        { title: 'Ordre færdiggjort', description: 'Installation hos Hansen Familie', time: '1 time siden' },
        { title: 'Support ticket løst', description: 'Teknisk support for Jensen A/S', time: '3 timer siden' },
        { title: 'Lead konverteret', description: 'Andersen Familie blev til ordre', time: '5 timer siden' }
      ];

      const topPerformers = [
        { name: 'Michael Jensen', metric: 'Leads konverteret', value: '23', change: '+12%' },
        { name: 'Sarah Nielsen', metric: 'Kundetilfredshed', value: '94%', change: '+5%' },
        { name: 'Lars Andersen', metric: 'Responstid', value: '1.2h', change: '-23%' }
      ];

      return {
        stats,
        leadsChartData,
        supportData,
        revenueData,
        performanceData,
        recentActivity,
        topPerformers
      };
    },
    staleTime: 30000, // 30 seconds
    enabled: tickets.length >= 0 && orders.length >= 0 && leads.length >= 0,
  });

  return {
    ...dashboardQuery.data,
    isLoading: dashboardQuery.isLoading,
    error: dashboardQuery.error
  };
};
