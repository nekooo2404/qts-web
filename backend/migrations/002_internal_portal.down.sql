DROP TABLE IF EXISTS public.audit_logs;
DROP FUNCTION IF EXISTS public.prevent_audit_log_mutation();

DROP TABLE IF EXISTS public.cms_metrics;
DROP TABLE IF EXISTS public.stored_files;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.contracts;
DROP TABLE IF EXISTS public.contract_templates;

ALTER TABLE IF EXISTS public.company_info
    DROP CONSTRAINT IF EXISTS company_info_about_length_check,
    DROP CONSTRAINT IF EXISTS company_info_updated_by_fk,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS about;

ALTER TABLE IF EXISTS public.projects
    DROP CONSTRAINT IF EXISTS projects_updated_by_fk,
    DROP CONSTRAINT IF EXISTS projects_created_by_fk,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by;

ALTER TABLE IF EXISTS public.solutions
    DROP CONSTRAINT IF EXISTS solutions_updated_by_fk,
    DROP CONSTRAINT IF EXISTS solutions_created_by_fk,
    DROP COLUMN IF EXISTS updated_by,
    DROP COLUMN IF EXISTS created_by;

DROP INDEX IF EXISTS public.contact_leads_assignee_status_idx;
ALTER TABLE IF EXISTS public.contact_leads
    DROP CONSTRAINT IF EXISTS contact_leads_version_check,
    DROP CONSTRAINT IF EXISTS contact_leads_assignment_check,
    DROP CONSTRAINT IF EXISTS contact_leads_assigned_by_fk,
    DROP CONSTRAINT IF EXISTS contact_leads_assigned_to_fk,
    DROP COLUMN IF EXISTS assigned_at,
    DROP COLUMN IF EXISTS assigned_by,
    DROP COLUMN IF EXISTS assigned_to,
    DROP COLUMN IF EXISTS version;

DROP TABLE IF EXISTS public.auth_sessions;
DROP TABLE IF EXISTS public.role_permissions;
DROP TABLE IF EXISTS public.user_roles;
DROP TABLE IF EXISTS public.permissions;
DROP TABLE IF EXISTS public.roles;
DROP TABLE IF EXISTS public.users;

DROP FUNCTION IF EXISTS public.bump_role_members_auth_version();
DROP FUNCTION IF EXISTS public.bump_user_auth_version_for_user_role();
DROP FUNCTION IF EXISTS public.prepare_user_update();
