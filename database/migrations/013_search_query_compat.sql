-- 013_search_query_compat.sql — ensure search_query exists for ponytail compat
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='search_runs' AND column_name='search_query') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='search_runs' AND column_name='query') THEN
      ALTER TABLE search_runs RENAME COLUMN query TO search_query;
    ELSE
      ALTER TABLE search_runs ADD COLUMN search_query TEXT NOT NULL DEFAULT '';
    END IF;
  END IF;
  -- keep query as alias for old code if needed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='search_runs' AND column_name='query') THEN
    -- create view-like alias via generated column? simple: add query as generated
    -- ponytail: keep both, add query as alias that mirrors search_query
    ALTER TABLE search_runs ADD COLUMN query TEXT GENERATED ALWAYS AS (search_query) STORED;
  END IF;
END $$;
