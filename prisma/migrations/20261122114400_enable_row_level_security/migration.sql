-- Row-level security: deny by default.
--
-- All data access in this app goes through the server (Prisma, connecting as the table owner,
-- which bypasses RLS) and every query is scoped to the signed-in user in code. Nothing reads
-- these tables from the browser.
--
-- On Supabase, every table in the public schema is ALSO reachable over the auto-generated REST
-- API with the public anon key. With RLS off, anyone holding that key (it ships in the
-- browser bundle) could read or change every row. Enabling RLS with no policies closes that
-- door: the anon and authenticated roles see nothing. Do not add permissive policies such as
-- USING (true); if the browser ever needs direct access, write a per-user policy
-- (USING (auth.uid()::text = "userId")) for that one table.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', t.tablename);
  END LOOP;

  -- Belt and braces on Supabase: no table privileges for the API roles either.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END
$$;
