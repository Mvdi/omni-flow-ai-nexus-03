import { useQuery } from '@tanstack/react-query';
import { useTickets } from './useTickets';
import { useOrders } from './useOrders';
import { useLeads } from './useLeads';

export const useDashboardData = () => {
  const { data: tickets = [] } = useTickets();
  const { data: orders = [] } = useOrders();
  const { data: leads = [] } = useLeads();

  return useQuery({
    queryKey: ['dashboard-data', tickets, orders, leads],
    queryFn: async () => {
      console.log('Calculating dashboard data...');
      console.log('Orders:', orders.length);
      console.log('Tickets:', tickets.length);
      console.log('Leads:', leads.length);

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Monthly revenue from ORDERS (not leads)
      const monthlyRevenue = orders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === currentMonth && 
                 orderDate.getFullYear() === currentYear;
        })
        .reduce((sum, order) => sum + (order.price || 0), 0);

      console.log('Monthly revenue from orders:', monthlyRevenue);

      // Tickets data
      const openTickets = tickets.filter(t => t.status === 'Åben').length;
      const avgResponseTime = tickets.length > 0 
        ? tickets.reduce((sum, t) => sum + (t.response_time_hours || 0), 0) / tickets.length 
        : 0;

      // Active leads (excluding closed ones)
      const activeLeads = leads.filter(l => 
        !['closed-won', 'closed-lost'].includes(l.status || '')
      ).length;

      // Conversion rate (percentage of all leads that became orders)
      const totalLeadsEver = leads.length; // This would need to include closed leads for accurate calculation
      const totalOrders = orders.length;
      const conversionRate = totalLeadsEver > 0 ? (totalOrders / totalLeadsEver) * 100 : 0;

      console.log('Dashboard calculations completed');

      return {
        monthlyRevenue,
        openTickets,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        activeLeads,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalOrders: orders.length,
        totalTickets: tickets.length
      };
    },
    staleTime: 30000, // 30 seconds
    enabled: tickets.length >= 0 && orders.length >= 0 && leads.length >= 0,
  });
};
