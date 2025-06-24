-- Add test support ticket for lead integration testing
INSERT INTO support_tickets (customer_email, customer_name, subject, content, priority, status, ticket_number, created_at, updated_at) VALUES
('madinielsen@gmail.com', 'Mathias Nielsen', 'Test Support Ticket', 'Dette er en test support ticket for at verificere integration med leads systemet.', 'Høj', 'open', 'TICKET-2024-001', NOW(), NOW()),
('madinielsen@gmail.com', 'Mathias Nielsen', 'CRM Integration Problem', 'Har problemer med at se support tickets i lead dialogen.', 'Medium', 'in_progress', 'TICKET-2024-002', NOW(), NOW()),
('anders.jensen@techcorp.dk', 'Anders Jensen', 'Produkt Spørgsmål', 'Interesseret i flere detaljer om jeres CRM løsning.', 'Lav', 'open', 'TICKET-2024-003', NOW(), NOW()),
('maria.hansen@gmail.com', 'Maria Hansen', 'Pris Information', 'Ønsker at høre mere om priser og pakker.', 'Medium', 'closed', 'TICKET-2024-004', NOW(), NOW()),
('peter@nielsenconsulting.dk', 'Peter Nielsen', 'Demo Anmodning', 'Vil gerne have en demo af systemet.', 'Høj', 'in_progress', 'TICKET-2024-005', NOW(), NOW()); 