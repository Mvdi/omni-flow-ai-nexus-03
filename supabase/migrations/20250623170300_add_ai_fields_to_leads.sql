-- Add AI fields to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS ai_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_score_factors TEXT[],
ADD COLUMN IF NOT EXISTS ai_enriched_data JSONB,
ADD COLUMN IF NOT EXISTS ai_enrichment_notes TEXT[],
ADD COLUMN IF NOT EXISTS ai_last_scored_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_last_enriched_at TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN leads.ai_score IS 'AI-generated lead score (0-100)';
COMMENT ON COLUMN leads.ai_score_factors IS 'Array of factors that contributed to the AI score';
COMMENT ON COLUMN leads.ai_enriched_data IS 'JSON object containing AI-enriched lead data';
COMMENT ON COLUMN leads.ai_enrichment_notes IS 'Array of notes about AI enrichment process';
COMMENT ON COLUMN leads.ai_last_scored_at IS 'Timestamp of last AI scoring';
COMMENT ON COLUMN leads.ai_last_enriched_at IS 'Timestamp of last AI enrichment';

-- Create index for AI score for better performance
CREATE INDEX IF NOT EXISTS idx_leads_ai_score ON leads(ai_score);

-- Create index for AI enriched data
CREATE INDEX IF NOT EXISTS idx_leads_ai_enriched_data ON leads USING GIN(ai_enriched_data); 