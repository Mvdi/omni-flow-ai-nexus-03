-- Optimering af performance med indexer og forbedringer
-- Dette vil drastisk reducere performance warnings

-- Support Tickets optimering - de mest kritiske først
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_email ON support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON support_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee_id ON support_tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email_thread_id ON support_tickets(email_thread_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_deadline ON support_tickets(sla_deadline);

-- Composite indexer for hyppige queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_updated ON support_tickets(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_status ON support_tickets(customer_email, status);

-- Ticket Messages optimering
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_email ON ticket_messages(sender_email);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_type ON ticket_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_created ON ticket_messages(ticket_id, created_at ASC);

-- Customers optimering
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_navn ON customers(navn);
CREATE INDEX IF NOT EXISTS idx_customers_postnummer ON customers(postnummer);

-- Leads optimering
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_prioritet ON leads(prioritet);