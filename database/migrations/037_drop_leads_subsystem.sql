-- 037_drop_leads_subsystem.sql — retire the AI sales / offers subsystem.
-- Destructive: removes the outreach CRM tables and all stored lead/offer data.
DROP TABLE IF EXISTS search_runs CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
