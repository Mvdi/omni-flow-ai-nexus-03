-- Add 25 mock test leads
INSERT INTO leads (navn, telefon, email, adresse, postnummer, by, virksomhed, vaerdi, prioritet, status, sidste_kontakt, noter, created_at, updated_at) VALUES
-- Nye Leads
('Anders Jensen', '+45 12 34 56 78', 'anders.jensen@techcorp.dk', 'Hovedgaden 123', '2100', 'København Ø', 'TechCorp A/S', 150000, 'Høj', 'new', NULL, 'Interesseret i cloud løsninger', NOW(), NOW()),
('Maria Hansen', '+45 23 45 67 89', 'maria.hansen@gmail.com', 'Parkvej 45', '8000', 'Aarhus C', NULL, 75000, 'Medium', 'new', NULL, 'Freelancer, leder efter CRM system', NOW(), NOW()),
('Peter Nielsen', '+45 34 56 78 90', 'peter@nielsenconsulting.dk', 'Industrivej 67', '5000', 'Odense C', 'Nielsen Consulting', 200000, 'Høj', 'new', NULL, 'Stor virksomhed, potentiel enterprise kunde', NOW(), NOW()),
('Sofie Pedersen', '+45 45 67 89 01', 'sofie.pedersen@startup.dk', 'Innovationsgade 89', '9000', 'Aalborg', 'StartupTech', 50000, 'Lav', 'new', NULL, 'Ny startup, begrænset budget', NOW(), NOW()),
('Lars Christensen', '+45 56 78 90 12', 'lars@christensen.dk', 'Havnegade 12', '7100', 'Vejle', 'Christensen & Co', 120000, 'Medium', 'new', NULL, 'Familievirksomhed, traditionel branche', NOW(), NOW()),

-- Kontaktet
('Anna Madsen', '+45 67 89 01 23', 'anna.madsen@retail.dk', 'Butiksgade 34', '6000', 'Kolding', 'Retail Solutions', 180000, 'Høj', 'contacted', '2024-01-15 10:30:00', 'Første opkald gennemført, positiv feedback', NOW(), NOW()),
('Michael Sørensen', '+45 78 90 12 34', 'michael@soerensen.dk', 'Kontorvej 56', '4000', 'Roskilde', 'Sørensen Group', 250000, 'Høj', 'contacted', '2024-01-14 14:15:00', 'Demo booket til næste uge', NOW(), NOW()),
('Camilla Rasmussen', '+45 89 01 23 45', 'camilla@rasmussen.dk', 'Erhvervspark 78', '3000', 'Helsingør', 'Rasmussen Industries', 160000, 'Medium', 'contacted', '2024-01-13 09:45:00', 'Sendt produktinformation', NOW(), NOW()),
('Thomas Johansen', '+45 90 12 34 56', 'thomas@johansen.dk', 'Centrumgade 90', '7000', 'Fredericia', 'Johansen Trading', 95000, 'Medium', 'contacted', '2024-01-12 16:20:00', 'Venter på svar om budget', NOW(), NOW()),
('Line Andersen', '+45 01 23 45 67', 'line.andersen@gmail.com', 'Privatvej 23', '2200', 'København N', NULL, 35000, 'Lav', 'contacted', '2024-01-11 11:30:00', 'Enkeltmandsvirksomhed, lille projekt', NOW(), NOW()),

-- Kvalificeret
('Jens Mikkelsen', '+45 12 34 56 78', 'jens@mikkelsen.dk', 'Business Park 45', '1000', 'København K', 'Mikkelsen Solutions', 300000, 'Høj', 'qualified', '2024-01-10 13:45:00', 'Budget bekræftet, beslutningstager identificeret', NOW(), NOW()),
('Helle Thomsen', '+45 23 45 67 89', 'helle@thomsen.dk', 'Erhvervsvej 67', '8000', 'Aarhus C', 'Thomsen Consulting', 220000, 'Høj', 'qualified', '2024-01-09 15:30:00', 'Teknisk team involveret, positive signaler', NOW(), NOW()),
('Ole Jensen', '+45 34 56 78 90', 'ole@jensen.dk', 'Industriområde 89', '5000', 'Odense C', 'Jensen Manufacturing', 180000, 'Medium', 'qualified', '2024-01-08 10:15:00', 'Behov analyseret, løsning matcher', NOW(), NOW()),
('Pia Larsen', '+45 45 67 89 01', 'pia@larsen.dk', 'Kontorcenter 12', '9000', 'Aalborg', 'Larsen Services', 140000, 'Medium', 'qualified', '2024-01-07 14:20:00', 'Projekt scope defineret', NOW(), NOW()),
('Henrik Olsen', '+45 56 78 90 12', 'henrik@olsen.dk', 'Business Center 34', '7100', 'Vejle', 'Olsen Partners', 190000, 'Høj', 'qualified', '2024-01-06 09:30:00', 'Stakeholders identificeret, budget klar', NOW(), NOW()),

-- Tilbud Sendt
('Mette Hansen', '+45 67 89 01 23', 'mette@hansen.dk', 'Erhvervspark 56', '6000', 'Kolding', 'Hansen Solutions', 280000, 'Høj', 'proposal', '2024-01-05 11:45:00', 'Tilbud sendt, venter på feedback', NOW(), NOW()),
('Kim Nielsen', '+45 78 90 12 34', 'kim@nielsen.dk', 'Business District 78', '4000', 'Roskilde', 'Nielsen Tech', 320000, 'Høj', 'proposal', '2024-01-04 16:30:00', 'Tilbud leveret, følger op om 3 dage', NOW(), NOW()),
('Susanne Pedersen', '+45 89 01 23 45', 'susanne@pedersen.dk', 'Innovation Center 90', '3000', 'Helsingør', 'Pedersen Innovation', 160000, 'Medium', 'proposal', '2024-01-03 13:15:00', 'Tilbud sendt, budget i orden', NOW(), NOW()),
('Martin Christensen', '+45 90 12 34 56', 'martin@christensen.dk', 'Tech Park 23', '7000', 'Fredericia', 'Christensen Digital', 210000, 'Høj', 'proposal', '2024-01-02 10:45:00', 'Tilbud leveret, venter på beslutning', NOW(), NOW()),
('Lone Madsen', '+45 01 23 45 67', 'lone@madsen.dk', 'Business Hub 45', '2200', 'København N', 'Madsen Consulting', 120000, 'Medium', 'proposal', '2024-01-01 14:20:00', 'Tilbud sendt, følger op', NOW(), NOW()),

-- Forhandling
('Erik Sørensen', '+45 12 34 56 78', 'erik@soerensen.dk', 'Enterprise Park 67', '1000', 'København K', 'Sørensen Enterprise', 450000, 'Høj', 'negotiation', '2024-01-15 09:00:00', 'Forhandler om pris og leveringstid', NOW(), NOW()),
('Dorte Rasmussen', '+45 23 45 67 89', 'dorte@rasmussen.dk', 'Corporate Center 89', '8000', 'Aarhus C', 'Rasmussen Corp', 380000, 'Høj', 'negotiation', '2024-01-14 15:30:00', 'Forhandler om support og vedligeholdelse', NOW(), NOW()),
('Per Johansen', '+45 34 56 78 90', 'per@johansen.dk', 'Business Plaza 12', '5000', 'Odense C', 'Johansen Group', 290000, 'Høj', 'negotiation', '2024-01-13 11:15:00', 'Forhandler om betalingsbetingelser', NOW(), NOW()),
('Bente Andersen', '+45 45 67 89 01', 'bente@andersen.dk', 'Innovation Hub 34', '9000', 'Aalborg', 'Andersen Solutions', 170000, 'Medium', 'negotiation', '2024-01-12 13:45:00', 'Forhandler om implementering', NOW(), NOW()),
('Steen Mikkelsen', '+45 56 78 90 12', 'steen@mikkelsen.dk', 'Tech Center 56', '7100', 'Vejle', 'Mikkelsen Tech', 240000, 'Høj', 'negotiation', '2024-01-11 16:20:00', 'Forhandler om custom features', NOW(), NOW()),

-- Lukket - Vundet
('Kirsten Thomsen', '+45 67 89 01 23', 'kirsten@thomsen.dk', 'Success Park 78', '6000', 'Kolding', 'Thomsen Success', 350000, 'Høj', 'closed-won', '2024-01-10 10:30:00', 'Kontrakt underskrevet, projekt startet', NOW(), NOW()),
('Niels Jensen', '+45 78 90 12 34', 'niels@jensen.dk', 'Victory Center 90', '4000', 'Roskilde', 'Jensen Victory', 420000, 'Høj', 'closed-won', '2024-01-09 14:15:00', 'Deal lukket, implementering planlagt', NOW(), NOW()),

-- Lukket - Tabt
('Lars Larsen', '+45 89 01 23 45', 'lars@larsen.dk', 'Lost Street 23', '3000', 'Helsingør', 'Larsen Lost', 180000, 'Medium', 'closed-lost', '2024-01-08 12:00:00', 'Konkurrent vandt, for dyrt', NOW(), NOW()),
('Anne Olsen', '+45 90 12 34 56', 'anne@olsen.dk', 'Failed Avenue 45', '7000', 'Fredericia', 'Olsen Failed', 220000, 'Høj', 'closed-lost', '2024-01-07 15:45:00', 'Budget ikke godkendt', NOW(), NOW()),
('Jørgen Hansen', '+45 01 23 45 67', 'jorgen@hansen.dk', 'Rejected Road 67', '2200', 'København N', 'Hansen Rejected', 150000, 'Medium', 'closed-lost', '2024-01-06 09:20:00', 'Beslutningstager skiftet job', NOW(), NOW()); 