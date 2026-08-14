# ADR-001: PostgreSQL With A Transactional Email Outbox

## Status

Accepted

## Date

2026-08-13

## Context

The QTS public website needs structured CMS data, filtered public reads, lead lifecycle states, and reliable administrator email notification. A contact submission must not be lost when SMTP is slow or unavailable, and a successful API response must correspond to a durable lead.

## Decision

Use PostgreSQL as the primary store and parameterized `pg` queries. Insert `contact_leads` and one `CONTACT_LEAD_CREATED` row in `email_outbox` within the same transaction. A separate worker claims due events using `FOR UPDATE SKIP LOCKED`, sends SMTP outside the database lock, and records `SENT`, retry, or `DEAD` state.

The outbox payload contains only `leadId`; the worker loads current lead data when rendering the message. Delivery semantics are at-least-once. Each retry uses a deterministic SMTP `Message-ID` to make duplicates traceable and easier for mail infrastructure to deduplicate.

## Alternatives Considered

### Send SMTP In The Contact Request

Rejected. It couples visitor latency and submission success to SMTP availability. Retrying a timed-out request can also create duplicate leads.

### Fire-And-Forget Promise After The Response

Rejected. A process restart can lose the promise, and there is no durable retry or operational visibility.

### MongoDB

Rejected for this service. The model is stable and relational, and PostgreSQL constraints, transactions, partial indexes, and row locking directly serve the required workflows.

### External Message Broker

Deferred. A broker is appropriate at higher scale, but it introduces another operational dependency without removing the need to atomically bridge the database write and message publication.

## Consequences

- Lead persistence and notification scheduling are atomic.
- SMTP outages do not make accepted contact submissions fail.
- API and worker are separate deployable processes.
- A crash after SMTP acceptance but before marking `SENT` may produce a duplicate email; exactly-once SMTP delivery is not claimed.
- Operations must monitor pending age, retry volume, and dead-letter events.
