CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    sort_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT projects_title_length_check
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT projects_description_length_check
        CHECK (char_length(btrim(description)) BETWEEN 1 AND 10000),
    CONSTRAINT projects_image_url_check
        CHECK (
            char_length(image_url) BETWEEN 1 AND 2048
            AND image_url ~ '^https?://[^[:space:]]+$'
        ),
    CONSTRAINT projects_category_length_check
        CHECK (char_length(btrim(category)) BETWEEN 1 AND 100),
    CONSTRAINT projects_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT projects_sort_order_check
        CHECK (sort_order >= 0),
    CONSTRAINT projects_published_at_check
        CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
);

CREATE TABLE public.solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem VARCHAR(500) NOT NULL,
    solution VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    sort_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT solutions_problem_length_check
        CHECK (char_length(btrim(problem)) BETWEEN 1 AND 500),
    CONSTRAINT solutions_solution_length_check
        CHECK (char_length(btrim(solution)) BETWEEN 1 AND 500),
    CONSTRAINT solutions_description_length_check
        CHECK (char_length(btrim(description)) BETWEEN 1 AND 10000),
    CONSTRAINT solutions_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT solutions_sort_order_check
        CHECK (sort_order >= 0),
    CONSTRAINT solutions_published_at_check
        CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
);

CREATE TABLE public.capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon_url VARCHAR(2048),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    sort_order INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT capabilities_title_length_check
        CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT capabilities_description_length_check
        CHECK (char_length(btrim(description)) BETWEEN 1 AND 10000),
    CONSTRAINT capabilities_icon_url_check
        CHECK (
            icon_url IS NULL
            OR (
                char_length(icon_url) BETWEEN 1 AND 2048
                AND icon_url ~ '^https?://[^[:space:]]+$'
            )
        ),
    CONSTRAINT capabilities_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT capabilities_sort_order_check
        CHECK (sort_order >= 0),
    CONSTRAINT capabilities_published_at_check
        CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
);

CREATE TABLE public.company_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    singleton_key BOOLEAN NOT NULL DEFAULT TRUE,
    vision TEXT NOT NULL,
    mission TEXT NOT NULL,
    address VARCHAR(500) NOT NULL,
    hotline VARCHAR(16) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT company_info_singleton_key_unique UNIQUE (singleton_key),
    CONSTRAINT company_info_singleton_key_check CHECK (singleton_key),
    CONSTRAINT company_info_vision_length_check
        CHECK (char_length(btrim(vision)) BETWEEN 1 AND 5000),
    CONSTRAINT company_info_mission_length_check
        CHECK (char_length(btrim(mission)) BETWEEN 1 AND 5000),
    CONSTRAINT company_info_address_length_check
        CHECK (char_length(btrim(address)) BETWEEN 1 AND 500),
    CONSTRAINT company_info_hotline_e164_check
        CHECK (hotline ~ '^\+[1-9][0-9]{7,14}$')
);

CREATE TABLE public.contact_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(120) NOT NULL,
    phone VARCHAR(16) NOT NULL,
    email VARCHAR(254) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT contact_leads_customer_name_length_check
        CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 120),
    CONSTRAINT contact_leads_phone_e164_check
        CHECK (phone ~ '^\+[1-9][0-9]{7,14}$'),
    CONSTRAINT contact_leads_email_check
        CHECK (
            char_length(email) BETWEEN 3 AND 254
            AND email = lower(email)
            AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        ),
    CONSTRAINT contact_leads_message_length_check
        CHECK (char_length(btrim(message)) BETWEEN 10 AND 5000),
    CONSTRAINT contact_leads_status_check
        CHECK (status IN ('NEW', 'IN_PROGRESS', 'CONTACTED', 'CLOSED', 'SPAM'))
);

CREATE TABLE public.email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL DEFAULT 'CONTACT_LEAD',
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 8,
    available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_outbox_contact_lead_fk
        FOREIGN KEY (aggregate_id)
        REFERENCES public.contact_leads (id)
        ON DELETE RESTRICT,
    CONSTRAINT email_outbox_event_unique UNIQUE (event_type, aggregate_id),
    CONSTRAINT email_outbox_event_type_check
        CHECK (event_type IN ('CONTACT_LEAD_CREATED')),
    CONSTRAINT email_outbox_aggregate_type_check
        CHECK (aggregate_type = 'CONTACT_LEAD'),
    CONSTRAINT email_outbox_payload_object_check
        CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT email_outbox_payload_minimized_check
        CHECK (payload = jsonb_build_object('leadId', aggregate_id::text)),
    CONSTRAINT email_outbox_status_check
        CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'DEAD')),
    CONSTRAINT email_outbox_attempt_count_check
        CHECK (attempt_count >= 0 AND attempt_count <= max_attempts),
    CONSTRAINT email_outbox_max_attempts_check
        CHECK (max_attempts BETWEEN 1 AND 100),
    CONSTRAINT email_outbox_lease_pair_check
        CHECK ((locked_at IS NULL) = (locked_by IS NULL)),
    CONSTRAINT email_outbox_processing_lease_check
        CHECK (status <> 'PROCESSING' OR locked_at IS NOT NULL),
    CONSTRAINT email_outbox_sent_at_check
        CHECK ((status = 'SENT') = (sent_at IS NOT NULL)),
    CONSTRAINT email_outbox_locked_by_length_check
        CHECK (locked_by IS NULL OR char_length(btrim(locked_by)) BETWEEN 1 AND 100),
    CONSTRAINT email_outbox_last_error_length_check
        CHECK (last_error IS NULL OR char_length(last_error) <= 4000)
);

CREATE INDEX projects_public_published_idx
    ON public.projects (sort_order, published_at DESC, id)
    WHERE status = 'PUBLISHED';

CREATE INDEX projects_public_category_idx
    ON public.projects (lower(category), sort_order, published_at DESC, id)
    WHERE status = 'PUBLISHED';

CREATE INDEX solutions_public_sort_idx
    ON public.solutions (sort_order, published_at DESC, id)
    WHERE status = 'PUBLISHED';

CREATE INDEX capabilities_public_sort_idx
    ON public.capabilities (sort_order, published_at DESC, id)
    WHERE status = 'PUBLISHED';

CREATE INDEX contact_leads_status_created_idx
    ON public.contact_leads (status, created_at DESC);

CREATE INDEX email_outbox_pending_idx
    ON public.email_outbox (available_at, created_at, id)
    WHERE status = 'PENDING';

CREATE INDEX email_outbox_processing_lease_idx
    ON public.email_outbox (locked_at)
    WHERE status = 'PROCESSING';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER projects_set_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER solutions_set_updated_at
    BEFORE UPDATE ON public.solutions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER capabilities_set_updated_at
    BEFORE UPDATE ON public.capabilities
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER company_info_set_updated_at
    BEFORE UPDATE ON public.company_info
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER contact_leads_set_updated_at
    BEFORE UPDATE ON public.contact_leads
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER email_outbox_set_updated_at
    BEFORE UPDATE ON public.email_outbox
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
