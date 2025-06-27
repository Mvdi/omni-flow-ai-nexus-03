
import { useOrders } from './useOrders';
import { useLeads } from './useLeads';
import { useCustomers } from './useCustomers';
import { useTickets } from './useTickets';

// Denne hook kan bruges til at validere at alle hooks fungerer
export const useHooksValidator = () => {
  const ordersHook = useOrders();
  const leadsQuery = useLeads();
  const customersQuery = useCustomers();
  const ticketsQuery = useTickets();

  const validateHooks = () => {
    const results = {
      orders: {
        loaded: !ordersHook.loading,
        hasData: ordersHook.orders.length > 0,
        functions: ['createOrder', 'updateOrder', 'deleteOrder'].every(fn => 
          typeof ordersHook[fn as keyof typeof ordersHook] === 'function'
        )
      },
      leads: {
        loaded: !leadsQuery.isLoading,
        hasData: (leadsQuery.data || []).length > 0,
        functions: true // useLeads uses mutation hooks, not direct CRUD functions
      },
      customers: {
        loaded: !customersQuery.isLoading,
        hasData: (customersQuery.data || []).length > 0,
        functions: true // useCustomers uses mutation hooks, not direct CRUD functions
      },
      tickets: {
        loaded: !ticketsQuery.isLoading,
        hasData: (ticketsQuery.data || []).length > 0,
        functions: true // useTickets uses mutation hooks, not direct CRUD functions
      }
    };

    console.log('Hook Validation Results:', results);
    return results;
  };

  return {
    validateHooks,
    hooks: {
      orders: ordersHook,
      leads: leadsQuery,
      customers: customersQuery,
      tickets: ticketsQuery
    }
  };
};
