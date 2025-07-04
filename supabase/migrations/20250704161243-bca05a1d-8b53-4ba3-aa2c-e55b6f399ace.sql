-- Fortsættelse af performance optimering - del 2

-- Orders optimering
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_employee ON orders(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Employees optimering  
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);

-- Quotes optimering
CREATE INDEX IF NOT EXISTS idx_quotes_customer_email ON quotes(customer_email);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id);

-- User Signatures optimering
CREATE INDEX IF NOT EXISTS idx_user_signatures_user_id ON user_signatures(user_id);

-- Email Sync Log optimering
CREATE INDEX IF NOT EXISTS idx_email_sync_log_mailbox ON email_sync_log(mailbox_address);
CREATE INDEX IF NOT EXISTS idx_email_sync_log_started_at ON email_sync_log(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sync_log_status ON email_sync_log(status);

-- Integration secrets optimering
CREATE INDEX IF NOT EXISTS idx_integration_secrets_provider ON integration_secrets(provider);

-- Ticket reminders optimering
CREATE INDEX IF NOT EXISTS idx_ticket_reminders_user_id ON ticket_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reminders_ticket_id ON ticket_reminders(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_reminders_remind_at ON ticket_reminders(remind_at);

-- Monitored mailboxes optimering
CREATE INDEX IF NOT EXISTS idx_monitored_mailboxes_email ON monitored_mailboxes(email_address);
CREATE INDEX IF NOT EXISTS idx_monitored_mailboxes_active ON monitored_mailboxes(is_active);

-- Optimization runs optimering
CREATE INDEX IF NOT EXISTS idx_optimization_runs_user_id ON optimization_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_status ON optimization_runs(status);

-- Routes optimering
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_employee_id ON routes(employee_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(route_date);