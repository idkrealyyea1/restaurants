-- 014_leads_priority_source.sql — add priority + source + last_sync
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH','MEDIUM','LOW'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual' CHECK (char_length(source) <= 30);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS leads_priority_idx ON leads(priority);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);
-- backfill priority from score_level
UPDATE leads SET priority = CASE WHEN score_level='HOT' THEN 'HIGH' WHEN score_level='WARM' THEN 'MEDIUM' ELSE 'LOW' END WHERE priority='MEDIUM' AND score_level IS NOT NULL;
UPDATE leads SET source = 'agent-reach' WHERE source='manual' AND source_urls::text LIKE '%exa%';
