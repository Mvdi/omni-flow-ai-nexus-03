-- Optimering af performance med indexer og forbedringer
-- Dette vil drastisk reducere performance warnings

-- Support Tickets optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_updated_at ON support_tickets(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_assignee_id ON support_tickets(assignee_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_email_thread_id ON support_tickets(email_thread_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_sla_deadline ON support_tickets(sla_deadline);

-- Composite indexer for hyppige queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_status_updated ON support_tickets(status, updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_customer_status ON support_tickets(customer_email, status);

-- Ticket Messages optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_sender_email ON ticket_messages(sender_email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_type ON ticket_messages(message_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_messages_ticket_created ON ticket_messages(ticket_id, created_at ASC);

-- Customers optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_navn ON customers(navn);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_postnummer ON customers(postnummer);

-- Leads optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_prioritet ON leads(prioritet);

-- Orders optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_scheduled_date ON orders(scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_assigned_employee ON orders(assigned_employee_id);

-- Employees optimering  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_email ON employees(email);

-- Quotes optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_customer_email ON quotes(customer_email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);

-- User Signatures optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_signatures_user_id ON user_signatures(user_id);

-- Email Sync Log optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_sync_log_mailbox ON email_sync_log(mailbox_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_sync_log_started_at ON email_sync_log(sync_started_at DESC);

-- Integration secrets optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integration_secrets_provider ON integration_secrets(provider);

-- Ticket reminders optimering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_reminders_user_id ON ticket_reminders(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_reminders_ticket_id ON ticket_reminders(ticket_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_reminders_remind_at ON ticket_reminders(remind_at);

-- Statistics for better query planning
ANALYZE support_tickets;
ANALYZE ticket_messages;
ANALYZE customers;
ANALYZE leads;
ANALYZE orders;
ANALYZE employees;
ANALYZE quotes;