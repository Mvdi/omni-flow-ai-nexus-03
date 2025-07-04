-- Optimering af RLS policies for bedre performance - version 2
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

-- Covering indeks for hyppige queries
CREATE INDEX IF NOT EXISTS idx_orders_covering ON orders(user_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_quotes_covering ON quotes(user_id, status, created_at);

-- Partial indeks for aktive data (uden time-based predicates)
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(user_id, scheduled_date) WHERE status != 'Afsluttet';
CREATE INDEX IF NOT EXISTS idx_quotes_active ON quotes(user_id, created_at) WHERE status != 'expired';

-- Sammensatte indeks for komplekse queries
CREATE INDEX IF NOT EXISTS idx_orders_planning ON orders(user_id, assigned_employee_id, scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_routes_optimization ON routes(user_id, employee_id, route_date, status);

-- Optimér for realtime subscriptions
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON support_tickets(status, priority, updated_at) WHERE status IN ('Åben', 'I gang', 'Nyt svar');
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(status, created_at) WHERE status != 'Lukket';

-- Yderligere RLS optimering indeks
CREATE INDEX IF NOT EXISTS idx_blocked_time_slots_user_performance ON blocked_time_slots(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_templates_user_performance ON quote_templates(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_products_user_performance ON quote_products(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_schedules_user_performance ON work_schedules(user_id) WHERE user_id IS NOT NULL;

-- Statistik opdatering for nye indeks
ANALYZE orders;
ANALYZE quotes;
ANALYZE employees;
ANALYZE routes;
ANALYZE subscriptions;
ANALYZE support_tickets;
ANALYZE ticket_messages;
ANALYZE leads;
ANALYZE blocked_time_slots;
ANALYZE quote_templates;
ANALYZE quote_products;
ANALYZE work_schedules;