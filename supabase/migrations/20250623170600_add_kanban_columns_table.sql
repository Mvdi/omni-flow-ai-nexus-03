-- Create kanban_columns table for customizable column configuration
CREATE TABLE IF NOT EXISTS kanban_columns (
  id SERIAL PRIMARY KEY,
  column_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  color VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default kanban columns
INSERT INTO kanban_columns (column_id, title, color, sort_order) VALUES
('new', 'Nye Leads', 'bg-blue-500', 1),
('contacted', 'Kontaktet', 'bg-yellow-500', 2),
('qualified', 'Kvalificeret', 'bg-orange-500', 3),
('proposal', 'Tilbud Sendt', 'bg-purple-500', 4),
('negotiation', 'Forhandling', 'bg-pink-500', 5),
('closed-won', 'Lukket - Vundet', 'bg-green-500', 6),
('closed-lost', 'Lukket - Tabt', 'bg-gray-500', 7)
ON CONFLICT (column_id) DO NOTHING;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_kanban_columns_sort_order ON kanban_columns(sort_order); 