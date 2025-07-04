-- Optimering af RLS policies for bedre performance
-- Dette vil reducere performance warnings betydeligt

-- Opret security definer funktioner for bedre RLS performance
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Opret indeks for auth.uid() opkald optimering
CREATE INDEX IF NOT EXISTS idx_orders_user_id_performance ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_user_id_performance ON quotes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_user_id_performance ON employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_user_id_performance ON routes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_performance ON subscriptions(user_id) WHERE user_id IS NOT NULL;

-- Optimér tickets og messages for bedre RLS performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_realtime ON support_tickets(id, updated_at) WHERE updated_at > now() - INTERVAL '1 day';
CREATE INDEX IF NOT EXISTS idx_ticket_messages_realtime ON ticket_messages(ticket_id, created_at) WHERE created_at > now() - INTERVAL '1 day';

-- Covering indeks for hyppige queries
CREATE INDEX IF NOT EXISTS idx_orders_covering ON orders(user_id, status, scheduled_date) INCLUDE (customer, price, order_type);
CREATE INDEX IF NOT EXISTS idx_quotes_covering ON quotes(user_id, status, created_at) INCLUDE (customer_email, total_amount, quote_number);

-- Partial indeks for aktive data
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(user_id, scheduled_date) WHERE status != 'Afsluttet';
CREATE INDEX IF NOT EXISTS idx_quotes_active ON quotes(user_id, created_at) WHERE status != 'expired';

-- Sammensatte indeks for komplekse queries
CREATE INDEX IF NOT EXISTS idx_orders_planning ON orders(user_id, assigned_employee_id, scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_optimization ON routes(user_id, employee_id, route_date, status);

-- Optimér for realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON support_tickets(status, priority, updated_at) WHERE status IN ('Åben', 'I gang', 'Nyt svar');
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(status, created_at) WHERE status != 'Lukket';

-- Statistik opdatering for nye indeks
ANALYZE orders;
ANALYZE quotes;
ANALYZE employees;
ANALYZE routes;
ANALYZE subscriptions;
ANALYZE support_tickets;
ANALYZE ticket_messages;
ANALYZE leads;