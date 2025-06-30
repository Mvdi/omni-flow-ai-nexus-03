
-- Database cleanup: Fjern alle eksisterende "Medium" priority værdier
UPDATE leads SET prioritet = NULL WHERE prioritet = 'Medium';
UPDATE support_tickets SET priority = NULL WHERE priority = 'Medium';

-- Opdater leads tabel med alle nødvendige statuser og sikr korrekte defaults
ALTER TABLE leads ALTER COLUMN prioritet DROP DEFAULT;
ALTER TABLE leads ALTER COLUMN prioritet SET DEFAULT NULL;

-- Opdater support_tickets tabel til at have NULL som default priority
ALTER TABLE support_tickets ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE support_tickets ALTER COLUMN priority SET DEFAULT NULL;

-- Sikr at leads status kan håndtere alle de nødvendige værdier
-- Vi behøver ikke ændre strukturen da status allerede er TEXT type
