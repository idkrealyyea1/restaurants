-- 012_fix_search_runs.sql — rename reserved column query -> search_query (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='search_runs' AND column_name='query') THEN
    ALTER TABLE search_runs RENAME COLUMN query TO search_query;
  END IF;
END $$;
