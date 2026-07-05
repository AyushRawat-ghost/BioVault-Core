-- =====================================================================
-- ALTERIS OS — BioVault-Core
-- Database User & Permissions Setup (AWS RDS PostgreSQL)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. APPLICATION USER (read/write — used by Go backend)
-- ─────────────────────────────────────────────────────────────────────
CREATE USER alteris_app WITH PASSWORD 'your_strong_password_here';

-- Grant connect and usage
GRANT CONNECT ON DATABASE postgres TO alteris_app;
GRANT USAGE   ON SCHEMA public      TO alteris_app;

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO alteris_app;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO alteris_app;

-- Ensure future tables are also accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO alteris_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT                  ON SEQUENCES TO alteris_app;


-- ─────────────────────────────────────────────────────────────────────
-- 2. READ-ONLY ANALYTICS USER (for dashboards / audit tools)
-- ─────────────────────────────────────────────────────────────────────
CREATE USER alteris_readonly WITH PASSWORD 'your_readonly_password_here';

GRANT CONNECT ON DATABASE postgres    TO alteris_readonly;
GRANT USAGE   ON SCHEMA public        TO alteris_readonly;
GRANT SELECT  ON ALL TABLES IN SCHEMA public TO alteris_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO alteris_readonly;


-- ─────────────────────────────────────────────────────────────────────
-- 3. REVOKE PUBLIC ACCESS (security hardening)
-- ─────────────────────────────────────────────────────────────────────
REVOKE ALL ON DATABASE postgres FROM PUBLIC;
REVOKE ALL ON SCHEMA public     FROM PUBLIC;


-- ─────────────────────────────────────────────────────────────────────
-- 4. VERIFY PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────
-- Check which tables a user can access:
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'alteris_app'
ORDER BY table_name, privilege_type;

-- List all database users:
SELECT usename, usesuper, usecreatedb FROM pg_user ORDER BY usename;