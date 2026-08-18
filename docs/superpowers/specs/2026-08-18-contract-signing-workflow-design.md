# QTS Contract Signing Workflow

## Status

Design approved in the visual companion. This document is the implementation contract; no production code is changed by this spec.

## Goal

Turn the existing contract CRUD and DOCX template renderer into one complete, auditable workflow:

`DOCX upload -> field discovery -> customer data -> rendered DOCX -> PDF -> version/hash -> owner review -> email invitation -> customer OTP -> customer review/consent/sign -> owner sign -> immutable lock -> signed PDF and audit trail`

The first release uses email OTP and a drawn signature. It records evidence around the signature but does not claim to be a qualified digital signature or eKYC service.

## Users And Boundaries

- `ADMIN` can manage every contract, template, invitation, signature request, document, and audit record.
- `EMPLOYEE` can create and manage contracts inside the existing owner scope and can sign as the owner when assigned as owner.
- The customer is an unauthenticated public signer identified by a one-time invitation token plus email OTP.
- Backend authorization remains authoritative. Frontend role checks only shape navigation and affordances.
- Existing lead, task, CMS, file, dashboard, and identity behavior stays unchanged.

## Selected Product Direction

The surface is the existing QTS `Document Control Desk`: dense operational table, navy command rail, cool paper surfaces, one-pixel rules, mono identifiers, and squared 8px controls. The minimalist-ui contribution is structural rather than a new brand: flat surfaces, restrained semantic color, no gradients, no decorative card stacks, no large shadows, and clear whitespace around the document workbench.

### Routes

- `/admin/contracts` and `/employee/contracts`: contract desk with filters, state, version, hash prefix, and next action.
- `/employee/contracts/new`: four-step creation wizard: upload, fields, preview, send.
- `/admin/contracts/:id` and `/employee/contracts/:id`: owner review, documents, signer progress, audit timeline, and downloads.
- Frontend `/sign/:token`: public invitation landing page and OTP gate; frontend `/sign/:token/document`: public PDF viewer, consent, signature capture, and completion.
- Frontend `/verify/:verificationToken`: public verification page exposing only completion status, signer names, timestamps, and hash prefix. The QR code uses this random token; contract numbers remain display identifiers, not bearer secrets.

## State Machine

The database keeps the existing business `contracts.status` values (`DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`, `ARCHIVED`) for backward compatibility with current CRUD, dashboard, and filters. A new `contracts.workflow_status` column is the canonical signing state, defaulting to `DRAFT`; existing rows are backfilled to `DRAFT` because they have no immutable signing artifacts. Transitions are validated in the backend and are append-only in the audit log.

```text
DRAFT -> READY -> SENT -> VIEWED -> CUSTOMER_SIGNED -> FULLY_SIGNED -> COMPLETED
  |       |        |       |             |
  +-------+--------+-------+-------------+--> CANCELLED
  SENT/VIEWED --------------------------------> EXPIRED
  SENT/VIEWED --------------------------------> REJECTED
```

- `DRAFT`: source/template or customer data incomplete; editable. The legacy `status` remains `DRAFT`.
- `READY`: rendered DOCX and PDF exist; hash exists; owner can review.
- `SENT`: invitation created and email queued.
- `VIEWED`: customer opened the invitation after token validation.
- `CUSTOMER_SIGNED`: customer OTP, consent, and signature accepted; owner signature pending.
- `FULLY_SIGNED`: both signature records exist; signed artifact is being assembled.
- `COMPLETED`: final PDF, certificate, and hash persisted; contract is locked. The legacy `status` may remain `DRAFT` or become `ACTIVE` through the existing business lifecycle endpoint; signing completion never silently changes that legacy field.
- `CANCELLED`, `REJECTED`, `EXPIRED`: terminal non-completion states; no signing mutation is allowed.

Only the owner (or an admin with `manage:contract`) may send, cancel, reject, or sign for the owner side. A customer can only move `SENT`/`VIEWED` to `CUSTOMER_SIGNED` through the active invitation and can never alter contract fields.

## Document Pipeline

1. Admin/employee uploads a DOCX template through an authenticated `multipart/form-data` endpoint. A small multipart parser is allowed at this trust boundary; the server validates MIME, extension, byte limit, and the safe DOCX ZIP archive before storage.
2. The existing `docxtemplater` renderer discovers placeholders matching `{{field_name}}`. Only allowlisted fields are accepted; unknown submitted fields are rejected.
3. The wizard collects customer name, email, identity number, address, contract value, contract date, and any fields discovered in the template. The server validates all values again.
4. The renderer produces an immutable generated DOCX document for version `N`.
5. Gotenberg converts that DOCX to PDF through a private internal HTTP service. Conversion timeout, size, and content type are checked; failure leaves the contract editable and never fabricates a PDF.
6. The PDF bytes receive a SHA-256 hash. The hash is stored with the document version and repeated in the audit certificate.
7. Signature coordinates are stored as normalized page/x/y/width/height metadata. The initial UI uses one customer and one owner signature box; no arbitrary scripting is allowed.
8. After both signatures, `pdf-lib` creates a new signed PDF containing visible signature marks, signer name, signed-at timestamp, and a certificate page. The signed PDF receives its own final hash and is stored as a new immutable document artifact.

Original DOCX, generated DOCX, unsigned PDF, signed PDF, signature payloads, and audit certificate are separate stored artifacts. Completed artifacts are never overwritten.

## Data Model

Add a migration after the current internal-portal migration. Existing `contracts`, `contract_templates`, `stored_files`, and `audit_logs` remain compatible.

### `contract_versions`

- `id`, `contract_id`, `version` (unique pair), `source_template_id`
- `data` JSONB, `document_hash` SHA-256 hex, `created_by`, `created_at`
- `locked_at` nullable; a database check forbids updates after lock

### `contract_documents`

- `id`, `contract_id`, `version_id`, `kind` (`SOURCE_DOCX`, `GENERATED_DOCX`, `PDF`, `SIGNED_PDF`, `CERTIFICATE`)
- `storage_key`, `sha256`, `content_type`, `size_bytes`, `created_at`
- unique `(version_id, kind)`; storage keys are generated server-side

### `contract_signers`

- `id`, `contract_id`, `role` (`CUSTOMER`, `OWNER`), `display_name`, `email`
- `user_id` nullable for the customer and required for the authenticated owner
- `verification_method`, `verified_at`, `signed_at`, `signature_storage_key`, `signature_payload` JSONB
- one signer per role for V1; both sides use a fresh drawn signature in V1, never a reusable image without a new confirmation

### `contract_invitations`

- `id`, `contract_id`, `signer_id`, `token_hash`, `expires_at`, `consumed_at`, `revoked_at`, `last_sent_at`
- `otp_hash`, `otp_expires_at`, `otp_attempts`, `otp_sent_at`, `verified_at`
- token and OTP values are never stored in plaintext or returned by an API

### Verification token

Each contract version also receives a separate random verification token hash. It is embedded in the QR code only after completion and is independent from the signing invitation token.

### Audit events

Use the existing append-only `audit_logs` module for the canonical event trail. Resource type is `CONTRACT`; metadata contains only bounded, non-secret facts. No second event table is introduced.

Required event names:

`CONTRACT_CREATED`, `TEMPLATE_UPLOADED`, `FIELDS_DISCOVERED`, `DOCUMENT_GENERATED`, `PDF_CONVERTED`, `HASH_CREATED`, `INVITATION_CREATED`, `INVITATION_SENT`, `DOCUMENT_OPENED`, `OTP_SENT`, `OTP_VERIFIED`, `AGREEMENT_ACCEPTED`, `CUSTOMER_SIGNED`, `OWNER_SIGNED`, `SIGNED_DOCUMENT_CREATED`, `COMPLETED`, `DOWNLOADED`, `CANCELLED`, `REJECTED`, `EXPIRED`.

## API Contract

Authenticated backend routes live under the existing `/api` internal router and use existing Bearer auth and permission middleware. The frontend reaches them through its same-origin BFF.

```text
POST   /api/contracts/templates/upload       (multipart/form-data)
POST   /api/contracts/prepare
POST   /api/contracts/:id/render
GET    /api/contracts/:id
GET    /api/contracts/:id/documents/:documentId
POST   /api/contracts/:id/invitation
POST   /api/contracts/:id/owner-sign
POST   /api/contracts/:id/cancel
GET    /api/contracts/:id/audit
GET    /api/contracts/:id/download/:kind
GET    /api/sign/:token
POST   /api/sign/:token/otp
POST   /api/sign/:token/verify-otp
POST   /api/sign/:token/viewed
POST   /api/sign/:token/accept
POST   /api/sign/:token/sign
GET    /api/verify/:verificationToken
```

Public signing and verification routes are mounted outside the protected internal router (for example `/api/sign/*` and `/api/verify/*`) and are rate-limited separately from authenticated routes. All schemas are strict Zod schemas. Public responses omit raw customer identity data, token material, OTP state, IP hashes, and internal storage keys.

## Security And Invariants

- Invitation tokens use at least 32 random bytes, are sent only once in a URL, are stored as SHA-256 hashes, expire by configuration, and are single-signer.
- OTP is six digits from a cryptographically secure random source, stored as a salted hash, expires after 10 minutes, allows five attempts, and limits sends per invitation/email/IP.
- OTP verification and signature acceptance run in one transaction with row locks; replay returns the existing result without duplicating a signature or event.
- Customer email is compared case-insensitively to the invitation email. Token alone never completes verification.
- Contract fields, signer identity, and unsigned PDF hash become immutable once invitation is sent. Edits after `CUSTOMER_SIGNED` or `COMPLETED` are rejected; amendments create a new draft/version.
- Download endpoints verify stored SHA-256 while streaming and use private, no-store cache headers.
- Audit metadata is bounded and excludes OTPs, tokens, signature bytes, request bodies, and unredacted personal data.
- Server errors return stable codes and request IDs; no stack traces or provider details reach clients.
- Canvas signatures are evidence of intent paired with OTP and audit; product copy must not describe them as qualified digital signatures.

## Email

Reuse the existing outbox and Nodemailer transport. Add contract invitation, OTP, and completion message builders. Email send is queued in the same transaction as invitation state; worker retry is idempotent. Local development may use a capture SMTP server; production requires `SMTP_*` configuration already used by the backend.

## Frontend Behavior

- Dashboard table keeps stable columns and mobile record rows; statuses use text plus semantic color, never color alone.
- Wizard exposes upload progress, detected fields, validation errors, conversion progress, PDF preview, hash/version summary, and a deliberate “Send invitation” confirmation.
- Owner detail view shows source/generated/signed artifacts, signer progress, next action, and append-only timeline.
- Public signer view prioritizes document reading: PDF viewer, page count, explicit consent checkbox, OTP step, signature canvas with clear/reset, then confirmation.
- All dialogs have semantic names, keyboard escape, focus return, 44px controls, reduced-motion fallback, and bounded scrolling.
- Loading uses stable skeleton dimensions. Empty states explain recovery. Errors show a retry action and request ID. No demo contract totals appear when the API has no rows.
- Use existing QTS Geist/Geist Mono, navy `#162660`, highlight blue `#D0E6FD`, paper surfaces, one-pixel rules, and squared controls. Do not introduce a second component system or generic icon set.

## Failure And Recovery

- Upload/ZIP rejection: keep wizard data, show field-level error, do not create a contract version.
- Render/conversion failure: keep source artifact and `DRAFT` state; allow retry with a new attempt event.
- Invitation email failure: keep invitation pending, expose resend with rate limit, never mint a second active token without revoking the prior one.
- Expired invitation: show expiry and owner-controlled resend; old token remains unusable.
- Concurrent owner/customer actions: transaction state check returns current state or a conflict; no partial signature artifact is emitted.
- Storage/database failure after a transaction: outbox/reconciliation job marks missing artifact and leaves contract non-completed; completion is only committed after all hashes and files verify.

## Verification

### Backend

- Strict schema and permission tests for every authenticated/public endpoint.
- Repository tests for owner scope, admin scope, lock checks, version conflicts, and immutable documents.
- Unit tests for token/OTP hashing, expiry, attempt limits, status transitions, normalized signature coordinates, and SHA-256.
- Integration tests with a fake Gotenberg adapter for success, timeout, invalid PDF, and size-limit paths.
- PostgreSQL tests for migration constraints, row-lock replay, append-only audit, and artifact uniqueness.

### Frontend

- Component tests for wizard field discovery, validation, loading/error/empty states, consent gating, OTP retry, and signature reset.
- API/BFF tests for private cache headers, error mapping, and token non-exposure.
- Playwright at 320px, 768px, and desktop for dashboard, wizard, public signing, keyboard flow, and zero horizontal overflow.
- Accessibility scan with axe and keyboard-only signing flow.

## Deployment

- Add a `gotenberg` service to local Compose with an internal-only port and healthcheck.
- Add backend `GOTENBERG_URL`, conversion timeout, document size, token TTL, OTP TTL, and rate-limit environment values with safe local defaults.
- Keep storage volume persistent. Run migration before backend startup. Start the email worker alongside the API.
- Do not add Redis, S3, eKYC, SMS, or a third-party signing provider in V1; add only when throughput, legal assurance, or retention requirements justify them.

## Acceptance Criteria

1. Authenticated user uploads a valid DOCX containing allowlisted placeholders and sees discovered fields.
2. Submitted data produces DOCX, PDF, version, and SHA-256 records visible in the contract detail view.
3. Owner can review and send one expiring email invitation.
4. Customer opens link, verifies email OTP, views the full PDF, accepts consent, and submits a signature once.
5. Owner signs once; system creates signed PDF plus certificate, records both hashes and complete audit events, and marks `COMPLETED`.
6. Completed contract cannot be edited, resent, or signed again; downloads return the stored immutable artifacts.
7. Admin sees all authorized contracts; employee scope remains unchanged.
8. Required backend/frontend/typecheck/lint/build tests pass, with no new horizontal overflow or accessibility regression.

## Known Ceiling

V1 provides strong workflow evidence, not a qualified digital signature. Add an accredited remote-signing/eKYC provider only when the legal/business requirement and provider contract are explicit.
