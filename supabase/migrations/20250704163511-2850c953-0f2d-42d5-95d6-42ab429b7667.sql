-- Del 3: Løsning af Duplicate Index problemer (rettet version)

-- Fjern gamle duplicate indeks og behold kun de nye optimerede
DROP INDEX IF EXISTS customers_email_idx;
DROP INDEX IF EXISTS idx_employees_active; -- behold idx_employees_is_active
DROP INDEX IF EXISTS integration_secrets_provider_idx;
DROP INDEX IF EXISTS leads_email_idx;
DROP INDEX IF EXISTS leads_prioritet_idx;
DROP INDEX IF EXISTS leads_status_idx;
DROP INDEX IF EXISTS idx_orders_employee; -- behold idx_orders_assigned_employee
DROP INDEX IF EXISTS support_tickets_customer_email_idx;
DROP INDEX IF EXISTS support_tickets_status_idx;
DROP INDEX IF EXISTS ticket_messages_message_type_idx;
DROP INDEX IF EXISTS ticket_messages_ticket_id_idx;

-- Fjern de gamle indeks med final navne for at undgå konflikter
DROP INDEX IF EXISTS idx_customers_email_final;
DROP INDEX IF EXISTS idx_leads_email;
DROP INDEX IF EXISTS idx_leads_prioritet;
DROP INDEX IF EXISTS idx_leads_status;
DROP INDEX IF EXISTS idx_orders_assigned_employee;
DROP INDEX IF EXISTS idx_support_tickets_customer_email_final;
DROP INDEX IF EXISTS idx_support_tickets_status_final;
DROP INDEX IF EXISTS idx_ticket_messages_type;
DROP INDEX IF EXISTS idx_ticket_messages_ticket_id_final;

-- Sørg for at vi har de rigtige indeks med korrekte navne (rettet syntax)
CREATE INDEX IF NOT EXISTS idx_customers_email_clean ON customers(email);
CREATE INDEX IF NOT EXISTS idx_integration_secrets_provider_clean ON integration_secrets(provider);
CREATE INDEX IF NOT EXISTS idx_leads_email_clean ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_prioritet_clean ON leads(prioritet);
CREATE INDEX IF NOT EXISTS idx_leads_status_clean ON leads(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_employee_clean ON orders(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email_clean ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_clean ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_type_clean ON ticket_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id_clean ON ticket_messages(ticket_id);