
import { useQuery } from '@tanstack/react-query';
import { useTickets } from './useTickets';
import { useOrders } from './useOrders';
import { useLeads } from './useLeads';

export const useDashboardData = () => {
  const { data: tickets = [] } = useTickets();
  const { orders } = useOrders();
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

      // Calculate route efficiency based on completed orders
      const completedOrders = orders.filter(o => o.status === 'Færdig').length;
      const totalOrders = orders.length;
      const routeEfficiency = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

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
        totalCustomers: leads.length,
        completedOrders: completedOrders
      };

      console.log('=== FINAL DASHBOARD STATS ===');
      console.log('Stats:', stats);

      // Generate dynamic chart data based on actual data
      const leadsChartData = [
        { name: 'Jan', leads: 0, converted: 0 },
        { name: 'Feb', leads: 0, converted: 0 },
        { name: 'Mar', leads: 0, converted: 0 },
        { name: 'Apr', leads: 0, converted: 0 },
        { name: 'Maj', leads: 0, converted: 0 },
        { name: 'Jun', leads: activeLeads.length, converted: convertedLeads }
      ];

      const supportData = [
        { name: 'Åben', value: openTickets, color: '#ef4444' },
        { name: 'I gang', value: tickets.filter(t => t.status === 'I gang').length, color: '#f59e0b' },
        { name: 'Afventer', value: tickets.filter(t => t.status === 'Afventer kunde').length, color: '#3b82f6' },
        { name: 'Løst', value: tickets.filter(t => t.status === 'Løst').length, color: '#10b981' }
      ];

      // Dynamic revenue data - only show current month's actual data
      const revenueData = [
        { name: 'Jan', revenue: 0, forecast: 0 },
        { name: 'Feb', revenue: 0, forecast: 0 },
        { name: 'Mar', revenue: 0, forecast: 0 },
        { name: 'Apr', revenue: 0, forecast: 0 },
        { name: 'Maj', revenue: 0, forecast: 0 },
        { name: 'Jun', revenue: monthlyRevenue, forecast: Math.round(monthlyRevenue * 1.1) }
      ];

      const performanceData = [
        { name: 'Lead Konvertering', value: Math.round(conversionRate), target: 25 },
        { name: 'Ordre Færdiggjort', value: routeEfficiency, target: 90 },
        { name: 'Responstid Mål', value: avgResponseTime > 0 ? Math.max(100 - avgResponseTime * 5, 0) : 95, target: 95 },
        { name: 'Månedligt Mål', value: Math.round((monthlyRevenue / 300000) * 100), target: 100 }
      ];

      // Dynamic activity based on actual recent data
      const recentActivity = [];
      
      // Add recent leads
      const recentLeads = leads.slice(-2);
      recentLeads.forEach(lead => {
        recentActivity.push({
          title: 'Nyt lead oprettet',
          description: `${lead.navn} - Potentiel værdi: ${lead.vaerdi || 0} kr`,
          time: 'Nyligt'
        });
      });

      // Add recent orders
      const recentOrders = orders.slice(-2);
      recentOrders.forEach(order => {
        if (order.status === 'Færdig') {
          recentActivity.push({
            title: 'Ordre færdiggjort',
            description: `${order.order_type} hos ${order.customer}`,
            time: 'Nyligt'
          });
        }
      });

      // Add recent tickets
      const recentTickets = tickets.filter(t => t.status === 'Løst').slice(-1);
      recentTickets.forEach(ticket => {
        recentActivity.push({
          title: 'Support ticket løst',
          description: `${ticket.subject}`,
          time: 'Nyligt'
        });
      });

      // If no recent activity, show a default message
      if (recentActivity.length === 0) {
        recentActivity.push({
          title: 'Velkommen til systemet',
          description: 'Ingen aktivitet endnu - start med at oprette leads eller ordre',
          time: 'Nu'
        });
      }

      // Dynamic top performers (simplified for now)
      const topPerformers = [
        { name: 'System', metric: 'Aktive leads', value: activeLeads.length.toString(), change: `${activeLeads.length > 0 ? '+' : ''}${activeLeads.length}` },
        { name: 'System', metric: 'Månedlig omsætning', value: `${monthlyRevenue.toLocaleString()} kr`, change: monthlyRevenue > 0 ? '+100%' : '0%' },
        { name: 'System', metric: 'Ordre færdige', value: `${completedOrders}`, change: completedOrders > 0 ? '+100%' : '0%' }
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
