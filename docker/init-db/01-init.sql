-- YM Movement Scheduler - Database Initialization
-- This script runs when the PostgreSQL container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Set timezone to UTC for consistency
SET timezone TO 'UTC';

-- Create a read-only user for reporting/analytics (optional)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'readonly_user') THEN
--         CREATE ROLE readonly_user WITH LOGIN PASSWORD 'readonly_password';
--         GRANT CONNECT ON DATABASE ym_movement_dev TO readonly_user;
--         GRANT USAGE ON SCHEMA public TO readonly_user;
--         GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
--         ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
--     END IF;
-- END
-- $$;

-- Log successful initialization
\echo 'YM Movement Scheduler database initialized successfully!'