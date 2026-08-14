-- Internal portal identity and authorization.
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    employee_code VARCHAR(50) NOT NULL,
    department VARCHAR(120),
    job_title VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    auth_version INTEGER NOT NULL DEFAULT 0,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT users_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT users_email_check
        CHECK (
            char_length(email) BETWEEN 3 AND 254
            AND email = lower(email)
            AND email = btrim(email)
            AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        ),
    CONSTRAINT users_password_hash_length_check
        CHECK (char_length(password_hash) BETWEEN 20 AND 255),
    CONSTRAINT users_full_name_length_check
        CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 200),
    CONSTRAINT users_employee_code_length_check
        CHECK (
            char_length(btrim(employee_code)) BETWEEN 2 AND 50
            AND employee_code ~ '^[A-Z0-9][A-Z0-9._-]{1,49}$'
        ),
    CONSTRAINT users_department_length_check
        CHECK (
            department IS NULL
            OR char_length(btrim(department)) BETWEEN 1 AND 120
        ),
    CONSTRAINT users_job_title_length_check
        CHECK (
            job_title IS NULL
            OR char_length(btrim(job_title)) BETWEEN 1 AND 120
        ),
    CONSTRAINT users_status_check
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
    CONSTRAINT users_auth_version_check CHECK (auth_version >= 0),
    CONSTRAINT users_failed_login_attempts_check
        CHECK (failed_login_attempts BETWEEN 0 AND 1000000),
    CONSTRAINT users_locked_until_check
        CHECK (locked_until IS NULL OR locked_until >= created_at),
    CONSTRAINT users_last_login_at_check
        CHECK (last_login_at IS NULL OR last_login_at >= created_at),
    CONSTRAINT users_password_changed_at_check
        CHECK (password_changed_at >= created_at)
);

CREATE UNIQUE INDEX users_employee_code_unique_idx
    ON public.users (lower(employee_code));

CREATE INDEX users_status_created_idx
    ON public.users (status, created_at DESC, id);

CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(1000),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT roles_code_unique UNIQUE (code),
    CONSTRAINT roles_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT roles_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT roles_code_check
        CHECK (code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
    CONSTRAINT roles_name_length_check
        CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
    CONSTRAINT roles_description_length_check
        CHECK (description IS NULL OR char_length(btrim(description)) BETWEEN 1 AND 1000)
);

CREATE UNIQUE INDEX roles_name_unique_idx
    ON public.roles (lower(name));

CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(121) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(1000),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT permissions_code_unique UNIQUE (code),
    CONSTRAINT permissions_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT permissions_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT permissions_code_check
        CHECK (
            code ~ '^[a-z][a-z0-9_-]{1,39}:[a-z][a-z0-9_-]{1,79}$'
        ),
    CONSTRAINT permissions_name_length_check
        CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
    CONSTRAINT permissions_description_length_check
        CHECK (description IS NULL OR char_length(btrim(description)) BETWEEN 1 AND 1000)
);

CREATE TABLE public.user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    granted_by UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_roles_pk PRIMARY KEY (user_id, role_id),
    CONSTRAINT user_roles_user_fk
        FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_role_fk
        FOREIGN KEY (role_id)
        REFERENCES public.roles (id)
        ON DELETE CASCADE,
    CONSTRAINT user_roles_granted_by_fk
        FOREIGN KEY (granted_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT
);

CREATE INDEX user_roles_role_idx
    ON public.user_roles (role_id, user_id);

CREATE TABLE public.role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    granted_by UUID,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT role_permissions_pk PRIMARY KEY (role_id, permission_id),
    CONSTRAINT role_permissions_role_fk
        FOREIGN KEY (role_id)
        REFERENCES public.roles (id)
        ON DELETE CASCADE,
    CONSTRAINT role_permissions_permission_fk
        FOREIGN KEY (permission_id)
        REFERENCES public.permissions (id)
        ON DELETE CASCADE,
    CONSTRAINT role_permissions_granted_by_fk
        FOREIGN KEY (granted_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT
);

CREATE INDEX role_permissions_permission_idx
    ON public.role_permissions (permission_id, role_id);

CREATE TABLE public.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    family_id UUID NOT NULL DEFAULT gen_random_uuid(),
    rotated_from_id UUID,
    refresh_token_hash CHAR(64) NOT NULL,
    jwt_id UUID NOT NULL,
    user_auth_version INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID,
    revoke_reason VARCHAR(500),
    created_ip INET,
    user_agent VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT auth_sessions_refresh_token_hash_unique UNIQUE (refresh_token_hash),
    CONSTRAINT auth_sessions_jwt_id_unique UNIQUE (jwt_id),
    CONSTRAINT auth_sessions_rotated_from_unique UNIQUE (rotated_from_id),
    CONSTRAINT auth_sessions_user_fk
        FOREIGN KEY (user_id)
        REFERENCES public.users (id)
        ON DELETE CASCADE,
    CONSTRAINT auth_sessions_rotated_from_fk
        FOREIGN KEY (rotated_from_id)
        REFERENCES public.auth_sessions (id)
        ON DELETE RESTRICT,
    CONSTRAINT auth_sessions_revoked_by_fk
        FOREIGN KEY (revoked_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT auth_sessions_refresh_token_hash_check
        CHECK (refresh_token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT auth_sessions_user_auth_version_check
        CHECK (user_auth_version >= 0),
    CONSTRAINT auth_sessions_expiry_check CHECK (expires_at > created_at),
    CONSTRAINT auth_sessions_last_used_at_check
        CHECK (
            last_used_at IS NULL
            OR (last_used_at >= created_at AND last_used_at <= expires_at)
        ),
    CONSTRAINT auth_sessions_revoked_at_check
        CHECK (revoked_at IS NULL OR revoked_at >= created_at),
    CONSTRAINT auth_sessions_revocation_actor_check
        CHECK (revoked_by IS NULL OR revoked_at IS NOT NULL),
    CONSTRAINT auth_sessions_revoke_reason_check
        CHECK (
            revoke_reason IS NULL
            OR (
                revoked_at IS NOT NULL
                AND char_length(btrim(revoke_reason)) BETWEEN 1 AND 500
            )
        ),
    CONSTRAINT auth_sessions_user_agent_length_check
        CHECK (user_agent IS NULL OR char_length(user_agent) BETWEEN 1 AND 512)
);

CREATE INDEX auth_sessions_active_user_idx
    ON public.auth_sessions (user_id, expires_at DESC, id)
    WHERE revoked_at IS NULL;

CREATE INDEX auth_sessions_active_family_idx
    ON public.auth_sessions (family_id, created_at DESC, id)
    WHERE revoked_at IS NULL;

-- A lead remains the public contact record; assignment makes it a portal resource.
ALTER TABLE public.contact_leads
    ADD COLUMN assigned_to UUID,
    ADD COLUMN assigned_by UUID,
    ADD COLUMN assigned_at TIMESTAMPTZ,
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
    ADD CONSTRAINT contact_leads_assigned_to_fk
        FOREIGN KEY (assigned_to)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT contact_leads_assigned_by_fk
        FOREIGN KEY (assigned_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT contact_leads_assignment_check
        CHECK (
            (assigned_to IS NULL AND assigned_by IS NULL AND assigned_at IS NULL)
            OR
            (assigned_to IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL)
        ),
    ADD CONSTRAINT contact_leads_version_check CHECK (version >= 1);

CREATE INDEX contact_leads_assignee_status_idx
    ON public.contact_leads (assigned_to, status, created_at DESC, id)
    WHERE assigned_to IS NOT NULL;

-- The existing singleton stores public About content alongside vision and mission.
ALTER TABLE public.company_info
    ADD COLUMN about TEXT NOT NULL DEFAULT '',
    ADD COLUMN updated_by UUID,
    ADD CONSTRAINT company_info_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT company_info_about_length_check
        CHECK (char_length(about) <= 20000);

ALTER TABLE public.projects
    ADD COLUMN created_by UUID,
    ADD COLUMN updated_by UUID,
    ADD CONSTRAINT projects_created_by_fk
        FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE RESTRICT,
    ADD CONSTRAINT projects_updated_by_fk
        FOREIGN KEY (updated_by) REFERENCES public.users (id) ON DELETE RESTRICT;

ALTER TABLE public.solutions
    ADD COLUMN created_by UUID,
    ADD COLUMN updated_by UUID,
    ADD CONSTRAINT solutions_created_by_fk
        FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE RESTRICT,
    ADD CONSTRAINT solutions_updated_by_fk
        FOREIGN KEY (updated_by) REFERENCES public.users (id) ON DELETE RESTRICT;

CREATE TABLE public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    storage_key VARCHAR(1024) NOT NULL,
    allowed_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    output_filename VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contract_templates_storage_key_unique UNIQUE (storage_key),
    CONSTRAINT contract_templates_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT contract_templates_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT contract_templates_name_length_check
        CHECK (char_length(btrim(name)) BETWEEN 2 AND 200),
    CONSTRAINT contract_templates_description_length_check
        CHECK (description IS NULL OR char_length(btrim(description)) BETWEEN 1 AND 2000),
    CONSTRAINT contract_templates_storage_key_check
        CHECK (
            char_length(storage_key) BETWEEN 1 AND 1024
            AND storage_key = btrim(storage_key)
            AND storage_key !~ '[\\]'
            AND storage_key !~ '(^|/)\.\.?(/|$)'
            AND storage_key !~ '^/'
        ),
    CONSTRAINT contract_templates_allowed_fields_check
        CHECK (cardinality(allowed_fields) <= 200),
    CONSTRAINT contract_templates_output_filename_check
        CHECK (
            char_length(output_filename) BETWEEN 6 AND 255
            AND output_filename = btrim(output_filename)
            AND output_filename !~ '[/\\]'
            AND lower(output_filename) LIKE '%.docx'
        )
);

CREATE INDEX contract_templates_active_idx
    ON public.contract_templates (name, id)
    WHERE is_active;

CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    client_name VARCHAR(300) NOT NULL,
    owner_id UUID NOT NULL,
    template_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    value_amount NUMERIC(18, 2),
    effective_date DATE,
    expires_at DATE,
    data JSONB NOT NULL DEFAULT '{}'::JSONB,
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contracts_contract_number_unique UNIQUE (contract_number),
    CONSTRAINT contracts_owner_fk
        FOREIGN KEY (owner_id)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT contracts_template_fk
        FOREIGN KEY (template_id)
        REFERENCES public.contract_templates (id)
        ON DELETE RESTRICT,
    CONSTRAINT contracts_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT contracts_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT contracts_contract_number_check
        CHECK (
            char_length(contract_number) BETWEEN 1 AND 100
            AND contract_number = btrim(contract_number)
            AND contract_number ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$'
        ),
    CONSTRAINT contracts_title_length_check
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 300),
    CONSTRAINT contracts_client_name_length_check
        CHECK (char_length(btrim(client_name)) BETWEEN 1 AND 300),
    CONSTRAINT contracts_status_check
        CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'ARCHIVED')),
    CONSTRAINT contracts_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT contracts_value_amount_check
        CHECK (value_amount IS NULL OR value_amount >= 0),
    CONSTRAINT contracts_date_range_check
        CHECK (
            effective_date IS NULL
            OR expires_at IS NULL
            OR expires_at >= effective_date
        ),
    CONSTRAINT contracts_data_object_check CHECK (jsonb_typeof(data) = 'object'),
    CONSTRAINT contracts_version_check CHECK (version >= 1),
    CONSTRAINT contracts_archive_state_check
        CHECK ((status = 'ARCHIVED') = (archived_at IS NOT NULL)),
    CONSTRAINT contracts_archived_at_check
        CHECK (archived_at IS NULL OR archived_at >= created_at)
);

CREATE INDEX contracts_owner_created_idx
    ON public.contracts (owner_id, created_at DESC, id);

CREATE INDEX contracts_status_created_idx
    ON public.contracts (status, created_at DESC, id);

CREATE INDEX contracts_template_idx
    ON public.contracts (template_id, created_at DESC, id)
    WHERE template_id IS NOT NULL;

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'TODO',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    assigned_to UUID,
    assigned_by UUID,
    assigned_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    contract_id UUID,
    lead_id UUID,
    due_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_assigned_to_fk
        FOREIGN KEY (assigned_to)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_assigned_by_fk
        FOREIGN KEY (assigned_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_contract_fk
        FOREIGN KEY (contract_id)
        REFERENCES public.contracts (id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_lead_fk
        FOREIGN KEY (lead_id)
        REFERENCES public.contact_leads (id)
        ON DELETE RESTRICT,
    CONSTRAINT tasks_title_length_check
        CHECK (char_length(btrim(title)) BETWEEN 2 AND 300),
    CONSTRAINT tasks_description_length_check
        CHECK (description IS NULL OR char_length(btrim(description)) BETWEEN 1 AND 20000),
    CONSTRAINT tasks_status_check
        CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED')),
    CONSTRAINT tasks_priority_check
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    CONSTRAINT tasks_assignment_check
        CHECK (
            (assigned_to IS NULL AND assigned_by IS NULL AND assigned_at IS NULL)
            OR
            (assigned_to IS NOT NULL AND assigned_by IS NOT NULL AND assigned_at IS NOT NULL)
        ),
    CONSTRAINT tasks_started_state_check
        CHECK (status NOT IN ('IN_PROGRESS', 'DONE') OR started_at IS NOT NULL),
    CONSTRAINT tasks_completed_state_check
        CHECK ((status = 'DONE') = (completed_at IS NOT NULL)),
    CONSTRAINT tasks_timestamp_order_check
        CHECK (
            (assigned_at IS NULL OR assigned_at >= created_at)
            AND (started_at IS NULL OR started_at >= created_at)
            AND (completed_at IS NULL OR completed_at >= created_at)
            AND (
                started_at IS NULL
                OR completed_at IS NULL
                OR completed_at >= started_at
            )
        ),
    CONSTRAINT tasks_version_check CHECK (version >= 1)
);

CREATE INDEX tasks_assignee_status_due_idx
    ON public.tasks (assigned_to, status, due_at, id)
    WHERE assigned_to IS NOT NULL AND status NOT IN ('DONE', 'CANCELLED');

CREATE INDEX tasks_status_created_idx
    ON public.tasks (status, created_at DESC, id);

CREATE INDEX tasks_contract_idx
    ON public.tasks (contract_id, created_at DESC, id)
    WHERE contract_id IS NOT NULL;

CREATE INDEX tasks_lead_idx
    ON public.tasks (lead_id, created_at DESC, id)
    WHERE lead_id IS NOT NULL;

CREATE TABLE public.stored_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key VARCHAR(1024) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    extension VARCHAR(16) NOT NULL,
    media_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    scan_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    scanned_at TIMESTAMPTZ,
    owner_id UUID,
    contract_id UUID,
    task_id UUID,
    created_by UUID NOT NULL,
    deleted_by UUID,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stored_files_storage_key_unique UNIQUE (storage_key),
    CONSTRAINT stored_files_owner_fk
        FOREIGN KEY (owner_id)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT stored_files_contract_fk
        FOREIGN KEY (contract_id)
        REFERENCES public.contracts (id)
        ON DELETE RESTRICT,
    CONSTRAINT stored_files_task_fk
        FOREIGN KEY (task_id)
        REFERENCES public.tasks (id)
        ON DELETE RESTRICT,
    CONSTRAINT stored_files_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT stored_files_deleted_by_fk
        FOREIGN KEY (deleted_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT stored_files_storage_key_check
        CHECK (
            char_length(storage_key) BETWEEN 1 AND 1024
            AND storage_key = btrim(storage_key)
            AND storage_key !~ '[\\]'
            AND storage_key !~ '(^|/)\.\.?(/|$)'
            AND storage_key !~ '^/'
        ),
    CONSTRAINT stored_files_original_filename_check
        CHECK (
            char_length(original_filename) BETWEEN 3 AND 255
            AND original_filename = btrim(original_filename)
            AND original_filename !~ '[/\\]'
            AND original_filename !~ '[[:cntrl:]]'
            AND lower(original_filename) LIKE '%.' || extension
        ),
    CONSTRAINT stored_files_extension_check
        CHECK (extension ~ '^[a-z0-9][a-z0-9._-]{0,15}$'),
    CONSTRAINT stored_files_media_type_check
        CHECK (
            char_length(media_type) BETWEEN 3 AND 255
            AND media_type = lower(media_type)
            AND media_type ~ '^[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+$'
        ),
    CONSTRAINT stored_files_size_check
        CHECK (size_bytes BETWEEN 1 AND 10737418240),
    CONSTRAINT stored_files_sha256_check CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT stored_files_scan_status_check
        CHECK (scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'FAILED')),
    CONSTRAINT stored_files_scan_timestamp_check
        CHECK ((scan_status = 'PENDING') = (scanned_at IS NULL)),
    CONSTRAINT stored_files_owner_context_check
        CHECK (owner_id IS NOT NULL OR contract_id IS NOT NULL OR task_id IS NOT NULL),
    CONSTRAINT stored_files_deletion_check
        CHECK ((deleted_by IS NULL) = (deleted_at IS NULL)),
    CONSTRAINT stored_files_timestamp_check
        CHECK (
            (scanned_at IS NULL OR scanned_at >= created_at)
            AND (deleted_at IS NULL OR deleted_at >= created_at)
        )
);

CREATE INDEX stored_files_owner_active_idx
    ON public.stored_files (owner_id, created_at DESC, id)
    WHERE owner_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX stored_files_contract_active_idx
    ON public.stored_files (contract_id, created_at DESC, id)
    WHERE contract_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX stored_files_task_active_idx
    ON public.stored_files (task_id, created_at DESC, id)
    WHERE task_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX stored_files_downloadable_idx
    ON public.stored_files (id)
    WHERE scan_status = 'CLEAN' AND deleted_at IS NULL;

CREATE TABLE public.cms_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(80) NOT NULL,
    label VARCHAR(200) NOT NULL,
    value VARCHAR(120) NOT NULL,
    suffix VARCHAR(40),
    sort_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cms_metrics_key_unique UNIQUE (key),
    CONSTRAINT cms_metrics_created_by_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT cms_metrics_updated_by_fk
        FOREIGN KEY (updated_by)
        REFERENCES public.users (id)
        ON DELETE RESTRICT,
    CONSTRAINT cms_metrics_key_check
        CHECK (key ~ '^[a-z][a-z0-9_-]{1,79}$'),
    CONSTRAINT cms_metrics_label_length_check
        CHECK (char_length(btrim(label)) BETWEEN 1 AND 200),
    CONSTRAINT cms_metrics_value_length_check
        CHECK (char_length(btrim(value)) BETWEEN 1 AND 120),
    CONSTRAINT cms_metrics_suffix_length_check
        CHECK (char_length(suffix) <= 40),
    CONSTRAINT cms_metrics_sort_order_check CHECK (sort_order >= 0),
    CONSTRAINT cms_metrics_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT cms_metrics_version_check CHECK (version >= 1),
    CONSTRAINT cms_metrics_published_at_check
        CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
);

CREATE INDEX cms_metrics_published_sort_idx
    ON public.cms_metrics (sort_order, published_at DESC, id)
    WHERE status = 'PUBLISHED';

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    actor_email VARCHAR(254),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id UUID,
    outcome VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    request_id UUID,
    ip_address INET,
    user_agent VARCHAR(512),
    changes JSONB NOT NULL DEFAULT '{}'::JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_actor_user_fk
        FOREIGN KEY (actor_user_id)
        REFERENCES public.users (id)
        ON DELETE SET NULL,
    CONSTRAINT audit_logs_actor_email_check
        CHECK (
            actor_email IS NULL
            OR (
                char_length(actor_email) BETWEEN 3 AND 254
                AND actor_email = lower(actor_email)
                AND actor_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),
    CONSTRAINT audit_logs_action_check
        CHECK (action ~ '^[A-Z][A-Z0-9_.-]{1,99}$'),
    CONSTRAINT audit_logs_resource_type_check
        CHECK (resource_type ~ '^[A-Z][A-Z0-9_]{1,79}$'),
    CONSTRAINT audit_logs_outcome_check
        CHECK (outcome IN ('ATTEMPT', 'SUCCESS', 'DENIED', 'FAILURE')),
    CONSTRAINT audit_logs_user_agent_length_check
        CHECK (user_agent IS NULL OR char_length(user_agent) BETWEEN 1 AND 512),
    CONSTRAINT audit_logs_changes_object_check CHECK (jsonb_typeof(changes) = 'object'),
    CONSTRAINT audit_logs_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX audit_logs_actor_occurred_idx
    ON public.audit_logs (actor_user_id, occurred_at DESC, id)
    WHERE actor_user_id IS NOT NULL;

CREATE INDEX audit_logs_resource_occurred_idx
    ON public.audit_logs (resource_type, resource_id, occurred_at DESC, id);

CREATE INDEX audit_logs_request_idx
    ON public.audit_logs (request_id)
    WHERE request_id IS NOT NULL;

-- Security-sensitive user changes revoke already-issued JWTs automatically.
CREATE OR REPLACE FUNCTION public.prepare_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (
        NEW.password_hash IS DISTINCT FROM OLD.password_hash
        OR NEW.status IS DISTINCT FROM OLD.status
    ) AND NEW.auth_version <= OLD.auth_version THEN
        NEW.auth_version = OLD.auth_version + 1;
    END IF;

    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_prepare_update
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.prepare_user_update();

CREATE OR REPLACE FUNCTION public.bump_user_auth_version_for_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.users
        SET auth_version = auth_version + 1
        WHERE id = OLD.user_id;
        RETURN OLD;
    END IF;

    UPDATE public.users
    SET auth_version = auth_version + 1
    WHERE id = NEW.user_id;

    IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        UPDATE public.users
        SET auth_version = auth_version + 1
        WHERE id = OLD.user_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER user_roles_bump_auth_version
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.bump_user_auth_version_for_user_role();

CREATE OR REPLACE FUNCTION public.bump_role_members_auth_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.users AS users
        SET auth_version = users.auth_version + 1
        FROM public.user_roles AS user_roles
        WHERE user_roles.role_id = OLD.role_id
          AND users.id = user_roles.user_id;
        RETURN OLD;
    END IF;

    UPDATE public.users AS users
    SET auth_version = users.auth_version + 1
    FROM public.user_roles AS user_roles
    WHERE user_roles.role_id = NEW.role_id
      AND users.id = user_roles.user_id;

    IF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
        UPDATE public.users AS users
        SET auth_version = users.auth_version + 1
        FROM public.user_roles AS user_roles
        WHERE user_roles.role_id = OLD.role_id
          AND users.id = user_roles.user_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER role_permissions_bump_auth_version
    AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
    FOR EACH ROW EXECUTE FUNCTION public.bump_role_members_auth_version();

CREATE TRIGGER contracts_prepare_update
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tasks_prepare_update
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER cms_metrics_prepare_update
    BEFORE UPDATE ON public.cms_metrics
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER roles_set_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER permissions_set_updated_at
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contract_templates_set_updated_at
    BEFORE UPDATE ON public.contract_templates
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TRIGGER audit_logs_prevent_row_mutation
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

CREATE TRIGGER audit_logs_prevent_truncate
    BEFORE TRUNCATE ON public.audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Stable IDs make bootstrapping idempotent across environments.
INSERT INTO public.roles (id, code, name, description, is_system)
VALUES
    (
        '02000000-0000-4000-8000-000000000001',
        'ADMIN',
        'Administrator',
        'Full internal portal administration',
        TRUE
    ),
    (
        '02000000-0000-4000-8000-000000000002',
        'EMPLOYEE',
        'Employee',
        'Standard employee portal access',
        TRUE
    );

INSERT INTO public.permissions (id, code, name, description, is_system)
VALUES
    ('02000000-0000-4000-9000-000000000001', 'read:lead', 'Read leads', 'Read assigned leads', TRUE),
    ('02000000-0000-4000-9000-000000000002', 'read:contract', 'Read contracts', 'Read contracts', TRUE),
    ('02000000-0000-4000-9000-000000000003', 'write:contract', 'Write contracts', 'Create and update contracts', TRUE),
    ('02000000-0000-4000-9000-000000000004', 'read:file', 'Read files', 'Download authorized files', TRUE),
    ('02000000-0000-4000-9000-000000000005', 'generate:contract', 'Generate contracts', 'Generate contract documents', TRUE),
    ('02000000-0000-4000-9000-000000000006', 'manage:user', 'Manage users', 'Manage users and personnel records', TRUE),
    ('02000000-0000-4000-9000-000000000007', 'manage:role', 'Manage roles', 'Manage roles and permissions', TRUE),
    ('02000000-0000-4000-9000-000000000008', 'manage:web_public', 'Manage public website', 'Manage public website content', TRUE),
    ('02000000-0000-4000-9000-000000000009', 'read:task', 'Read tasks', 'Read authorized tasks', TRUE),
    ('02000000-0000-4000-9000-000000000010', 'write:task', 'Write tasks', 'Create and update authorized tasks', TRUE),
    ('02000000-0000-4000-9000-000000000011', 'assign:task', 'Assign tasks', 'Assign tasks to users', TRUE),
    ('02000000-0000-4000-9000-000000000012', 'read:audit', 'Read audit logs', 'Read security audit logs', TRUE),
    ('02000000-0000-4000-9000-000000000013', 'manage:contract', 'Manage all contracts', 'Manage company-wide contracts', TRUE),
    ('02000000-0000-4000-9000-000000000014', 'manage:file', 'Manage all files', 'Download any authorized company file', TRUE),
    ('02000000-0000-4000-9000-000000000015', 'assign:lead', 'Assign leads', 'Assign and unassign contact leads', TRUE);

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
    '02000000-0000-4000-8000-000000000001'::UUID,
    permissions.id
FROM public.permissions;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT
    '02000000-0000-4000-8000-000000000002'::UUID,
    permissions.id
FROM public.permissions
WHERE permissions.code IN (
    'read:lead',
    'read:contract',
    'write:contract',
    'read:file',
    'generate:contract',
    'read:task',
    'write:task'
);
