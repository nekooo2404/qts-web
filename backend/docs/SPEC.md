# QTS Backend Specification

## Objective

Provide a production-oriented JSON API for the QTS public website and internal company portal. Public clients can read published content and submit contact requests without waiting for SMTP delivery. Authenticated employees and administrators use JWT- and permission-protected APIs for leads, contracts, files, tasks, personnel, RBAC, and CMS management.

## Technology

- Node.js 22 or newer, TypeScript, Express
- PostgreSQL using parameterized `pg` queries
- Zod validation and `libphonenumber-js` phone normalization
- Nodemailer delivery through a transactional outbox worker
- Vitest and Supertest for tests that do not require a running database

## Public Contract

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/capabilities` | Published capability list |
| `GET` | `/api/projects` | Published project list, optionally filtered by category |
| `GET` | `/api/projects/:id` | One published project |
| `GET` | `/api/solutions` | Published solution list |
| `GET` | `/api/metrics` | Published company metric list |
| `GET` | `/api/company-info` | Current About, vision, mission, address, and hotline |
| `POST` | `/api/contact` | Validate and persist a contact lead and email outbox event |

List endpoints use `page` and `pageSize`; `pageSize` is capped at 50. Public content endpoints never expose draft or archived records. API fields are camelCase while database columns are snake_case.

`POST /api/contact` accepts only `customerName`, `phone`, `email`, and `message`. The server owns the identifier, status, and timestamps. A successful response does not echo personal data:

```json
{
  "data": {
    "id": "0e00e7a5-c3e4-4187-af18-8dc38a8128bf",
    "status": "NEW",
    "createdAt": "2026-08-13T13:00:00.000Z"
  }
}
```

All failures use `{ "error": { "code", "message", "details"? }, "requestId" }`.

## Internal Portal Contract

- `POST /api/auth/login` authenticates an active user and returns a short-lived Bearer JWT.
- `GET /api/leads/assigned` returns only leads assigned to the current employee; `PUT /api/admin/leads/:id/assignee` requires `assign:lead`.
- `/api/contracts` uses `read:contract` and `write:contract`; employees are owner-scoped while `manage:contract` grants company-wide access. `POST /api/contracts/generate` requires `generate:contract` and returns DOCX.
- `GET /api/files/archives/:id/download` requires `read:file` plus resource-level access and streams only clean ZIP/RAR records.
- `/api/tasks` provides scoped CRUD, status changes, and assignment using `read:task`, `write:task`, and `assign:task`.
- `/api/admin/users`, `/api/admin/roles`, and `/api/admin/permissions` implement personnel and dynamic RBAC administration.
- `/api/admin/cms/projects`, `/solutions`, `/metrics`, and `/company-profile` require `manage:web_public`.
- `GET /api/admin/audit-logs` requires `read:audit` and returns bounded audit metadata without request bodies or raw PII.

## Dynamic RBAC Schema

Authorization is normalized rather than stored as a role enum on `users`:

```text
users --< user_roles >-- roles --< role_permissions >-- permissions
   |             |                                  |
   |             +-- granted_by, granted_at         +-- code (action:resource)
   +-- auth_version, status, failed_login_attempts, locked_until
```

- `roles` and `permissions` are CRUD-managed records, so adding a role does not require a deployment.
- `permissions.code` follows `action:resource`, for example `read:contract`, `write:contract`, or `manage:web_public`.
- `user_roles` and `role_permissions` use composite primary keys and foreign keys; replacement runs in a transaction.
- Role/permission changes increment affected users' `auth_version`. Middleware verifies the JWT, reloads the active user and current permissions, and rejects a stale token immediately.
- User creation, credential/profile mutation, and role assignment require both `manage:user` and `manage:role`; self-deactivation and self role replacement are rejected. An actor also cannot change permissions on any role currently assigned to that actor, so delegated role management cannot become a self-elevation path.
- The complete constrained PostgreSQL design is in `migrations/002_internal_portal.up.sql`; its down migration is reversible.

## DOCX Generation Contract

`POST /api/contracts/generate` accepts JSON only:

```json
{
  "templateId": "9b230e11-e2ec-4e59-aa45-6630378f0c71",
  "data": {
    "contractNumber": "QTS-2026-001",
    "customerName": "Example Company",
    "items": [{ "name": "Managed SOC", "quantity": 1 }]
  }
}
```

The template is a private `.docx` stored below `INTERNAL_FILE_STORAGE_ROOT`. Its database row in `contract_templates` stores the relative `storage_key`, top-level `allowed_fields`, safe `output_filename`, active flag, and audit ownership. Template placeholders use docxtemplater syntax such as `{contractNumber}` and `{customerName}`.

Provision an approved template with `npm run contract-template:provision` and the
`CONTRACT_TEMPLATE_*` values shown in `.env.example`. The command validates and
copies the DOCX into private storage, creates the database record, and writes an
audit event; it does not trust a client-supplied storage key.

The provisioner requires an explicit source `.docx`, an `ACTIVE` actor with
`manage:contract`, a unique allowlist of top-level fields, and a safe output
filename. It rejects symlinks, non-regular files, destination collisions, and
the same compressed/expanded limits enforced during generation. Files are
written with exclusive temporary-file creation and promoted without overwrite
under the generated `contract-templates/<uuid>.docx` key. A failure before
`COMMIT` rolls back and removes only the inode created by that run. An error
during `COMMIT` is indeterminate, so the final file is retained for operator
reconciliation rather than risking a committed row whose file was deleted.

Generation flow:

1. Authenticate and require `generate:contract`.
2. Validate a strict payload: 16 KiB HTTP body, 12 KiB serialized template data, bounded nesting, arrays, nodes, keys, strings, and no prototype keys.
3. Load only an active template and reject fields outside `allowed_fields`.
4. Resolve the storage key under the configured root; reject traversal, symlinks, non-regular files, inode changes, and oversize templates.
5. Acquire per-process generation admission by job count and worst-case byte budget. Exhaustion returns `503 GENERATION_BUSY` with `Retry-After`.
6. In a memory-limited worker thread, inspect the DOCX ZIP central directory, reject encrypted/ZIP64/overlapping or inconsistent entries, cap entry count and expanded bytes, then render with `docxtemplater`. The API terminates workers that exceed the configured timeout.
7. Cap output size and return `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `nosniff`, `private, no-store`, and a sanitized RFC 5987 filename.

Archive downloads apply the same storage boundary and stream instead of buffering. Only `CLEAN`, non-deleted `.zip`/`.rar` records with matching magic bytes, database size, and owner/contract/task scope are returned; `manage:file` supplies the company-wide override. After authorized metadata lookup and before storage allocation, each API process acquires count and byte admission capacity for the complete preflight/stream lifetime. Exhaustion returns `503 ARCHIVE_DOWNLOAD_BUSY` and `Retry-After`; disconnect aborts hashing/snapshot copying, removes temporary resources, and releases capacity.

ZIP/RAR records enter private storage only through `npm run archive:ingest`; no
public upload endpoint is exposed. The command requires an absolute source
path, safe original filename, `ACTIVE` actor with `manage:file`, and exactly one
existing owner/contract/task context. It rejects symlinks, non-regular input,
magic/extension mismatch, source mutation, collision, size overflow, and any
post-scan content mutation. It writes an exclusive `0600`
`stored-archives/<uuid>.<ext>` copy, computes SHA-256 and size, and invokes the
configured scanner without a shell. Scanner exit `0` means clean, `1` means
infected, and any other exit/error/timeout fails closed. Only clean metadata and
its audit event are committed in one serializable transaction. Pre-commit
failure removes only the created inode; ambiguous `COMMIT` retains it for
operator reconciliation.

## Reliability And Security Boundaries

- Always validate external input, cap JSON at 16 KiB, use parameterized SQL, restrict CORS, set security headers, and rate-limit the contact endpoint.
- The lead and `CONTACT_LEAD_CREATED` outbox event are inserted in one transaction. SMTP is never called from the request path.
- The worker provides at-least-once delivery with leases and retry backoff. A deterministic message ID reduces duplicate impact but cannot guarantee exactly-once SMTP delivery.
- Do not log request bodies or raw lead PII. SMTP recipients and headers come from configuration, never visitor input.
- Internal routes require authentication and route-level RBAC; resource-aware repositories further constrain assigned leads, tasks, and file downloads.
- Archive and DOCX generation count/byte budgets are bounded per process; multi-replica deployments enforce additional aggregate limits at the gateway or orchestrator.
- Contract reads/writes are owner-scoped unless the actor has `manage:contract`. All mutable workflow records use optimistic versions.
- Login uses scrypt password hashes, constant-time verification with a dummy hash for unknown users, progressive account lockout metadata, strict HS256 issuer/audience validation, and short-lived tokens.
- Security audit rows are append-only at the database layer. Login, authenticated mutations, DOCX generation, and archive downloads synchronously persist a non-PII `ATTEMPT` before business handling and fail closed with `503 AUDIT_UNAVAILABLE` if that write fails. A separate best-effort row records the final outcome. Middleware excludes bodies, credentials, tokens, email, and raw IP addresses; it stores an HMAC pseudonym for investigation correlation.

## Commands

```text
npm run dev
npm run db:migrate
npm run db:seed
npm run db:bootstrap-admin
npm run contract-template:provision -- --help
npm run archive:ingest -- --help
npm run worker
npm run lint
npm run typecheck
npm test
npm run build
```

## Success Criteria

- Valid contact data is normalized, stored with `NEW`, and paired atomically with one pending outbox event.
- Invalid email, phone, unknown fields, malformed JSON, and oversized payloads receive stable JSON errors.
- SMTP downtime does not reject or lose an accepted lead.
- Project and content reads return only `PUBLISHED` rows with deterministic pagination.
- Dynamic RBAC changes revoke stale JWTs and prevent self-elevation through user-role replacement, credential reset, or permission changes to an actor's assigned roles.
- DOCX and archive handling rejects traversal, symlinks, invalid signatures, tampered metadata, and configured size/expansion limits.
- Lint, type checking, tests, build, and dependency audit pass.
