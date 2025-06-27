
import { useOrders } from './useOrders';
import { useLeads } from './useLeads';
import { useCustomers } from './useCustomers';
import { useTickets } from './useTickets';

// Denne hook kan bruges til at validere at alle hooks fungerer
export const useHooksValidator = () => {
  const ordersHook = useOrders();
  const leadsHook = useLeads();
  const customersHook = useCustomers();
  const ticketsHook = useTickets();

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
        loaded: !leadsHook.loading,
        hasData: leadsHook.leads.length > 0,
        functions: ['createLead', 'updateLead', 'deleteLead'].every(fn => 
          typeof leadsHook[fn as keyof typeof leadsHook] === 'function'
        )
      },
      customers: {
        loaded: !customersHook.loading,
        hasData: customersHook.customers.length > 0,
        functions: ['createCustomer', 'updateCustomer', 'deleteCustomer'].every(fn => 
          typeof customersHook[fn as keyof typeof customersHook] === 'function'
        )
      },
      tickets: {
        loaded: !ticketsHook.loading,
        hasData: ticketsHook.tickets.length > 0,
        functions: ['createTicket', 'updateTicket', 'deleteTicket'].every(fn => 
          typeof ticketsHook[fn as keyof typeof ticketsHook] === 'function'
        )
      }
    };

    console.log('Hook Validation Results:', results);
    return results;
  };

  return {
    validateHooks,
    hooks: {
      orders: ordersHook,
      leads: leadsHook,
      customers: customersHook,
      tickets: ticketsHook
    }
  };
};
