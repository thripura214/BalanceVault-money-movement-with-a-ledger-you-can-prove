-- =====================================================================
-- BalanceVault PostgreSQL Roles & Security Privilege Architecture
-- Designed for Cloud PostgreSQL (Neon / Supabase / RDS)
-- =====================================================================

-- 1. Create Application Runtime Role (Least Privilege)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'balancevault_app') THEN
    CREATE ROLE balancevault_app WITH LOGIN PASSWORD 'vaultpass123';
  END IF;
END
$$;

-- 2. Create Bootstrap Operator Role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'balancevault_operator') THEN
    CREATE ROLE balancevault_operator;
  END IF;
END
$$;

-- 3. Create Read-Only Auditor Role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'balancevault_auditor') THEN
    CREATE ROLE balancevault_auditor;
  END IF;
END
$$;

-- 4. Assign membership allowing SET ROLE without superuser privilege
GRANT balancevault_operator TO balancevault_app;
GRANT balancevault_auditor TO balancevault_app;

-- 5. Stored Procedure for First-Admin Bootstrap (SECURITY DEFINER)
-- Bypasses role administration limitation on managed PostgreSQL platforms (e.g. Neon SQLSTATE 42501)
CREATE OR REPLACE FUNCTION bootstrap_admin_account(
  p_email VARCHAR,
  p_full_name VARCHAR,
  p_password_hash VARCHAR,
  p_bootstrap_secret VARCHAR,
  p_expected_secret VARCHAR
)
RETURNS TABLE(admin_id VARCHAR, created BOOLEAN, message VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_count INT;
  v_new_id VARCHAR;
BEGIN
  -- Verify security secret
  IF p_bootstrap_secret <> p_expected_secret THEN
    RETURN QUERY SELECT NULL::VARCHAR, FALSE, 'Invalid bootstrap authorization token'::VARCHAR;
    RETURN;
  END IF;

  -- Ensure only one bootstrap execution is allowed
  SELECT COUNT(*) INTO v_admin_count FROM "users" WHERE role = 'ADMIN';
  IF v_admin_count > 0 THEN
    RETURN QUERY SELECT NULL::VARCHAR, FALSE, 'System administrator already bootstrapped'::VARCHAR;
    RETURN;
  END IF;

  -- Generate ID and insert admin
  v_new_id := gen_random_uuid()::VARCHAR;

  INSERT INTO "users" (id, email, "fullName", "passwordHash", role, "onboardingStatus", "updatedAt")
  VALUES (v_new_id, p_email, p_full_name, p_password_hash, 'ADMIN', 'APPROVED', NOW());

  INSERT INTO "audit_logs" (id, "userId", action, "targetId", details, "createdAt")
  VALUES (gen_random_uuid()::VARCHAR, v_new_id, 'ADMIN_BOOTSTRAP_PROCEDURE', v_new_id, '{"source":"POSTGRES_STORED_PROC"}', NOW());

  RETURN QUERY SELECT v_new_id, TRUE, 'Administrator successfully bootstrapped'::VARCHAR;
END;
$$;

-- Grant EXECUTE permission to operator role
GRANT EXECUTE ON FUNCTION bootstrap_admin_account TO balancevault_operator;

-- Grant standard DML to application user
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO balancevault_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO balancevault_app;

-- Grant read-only to auditor
GRANT SELECT ON "ledger_entries", "audit_logs", "transactions" TO balancevault_auditor;

