# QTS Internal Portal

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated from the approved brief: Next.js with React and TypeScript, Tailwind CSS, Flowbite, DaisyUI, Animate.css, and Hover.css.

## Users

- QTS employees who manage leads, access project resources, and prepare company contracts.
- QTS administrators who manage public website content, employees and roles, company-wide contracts, and internal tasks.

## Product Purpose

Provide one internal workspace for recurring QTS operations. Success means employees can complete contract and resource workflows quickly, while administrators can scan, filter, and govern company-wide information without switching tools.

## Positioning

The portal joins operational records and document production in one role-aware workspace: employees work on assigned business records, while administrators retain company-wide visibility and control.

## Operating Context

The portal is used repeatedly during the workday on desktop and mobile web. Core materials include customer leads, project archives, contract documents, public website content, employee permissions, and task boards.

## Capabilities and Constraints

- Two UI roles: `EMPLOYEE` and `ADMIN`.
- Employee capabilities: lead management, project resource downloads, and smart contract creation with `.docx` export.
- Administrator capabilities: public web CMS, employee and role management, global contract management with advanced filters, and Kanban task tracking.
- The backend now implements Bearer authentication, internal CRUD, scoped leads/contracts/tasks, archive downloads, dynamic RBAC, CMS mutations, and audited administration. Its login response does not yet expose roles/permissions or a `/me` identity contract for the Next.js shell.
- Until the frontend API adapter, endpoint configuration, credentials, and identity mapping are connected, this portal runs from isolated fixtures and a development-only demo session. Client and Next.js route guards are not a substitute for backend authorization.

## Brand Commitments

- Product name: QTS Internal Portal.
- Internal navigation surfaces use `#162660`.
- Highlight surfaces use `#D0E6FD`.
- Gentle warning tags use `#F1E4D1`.
- The interface should feel professional, clean, work-focused, and technically precise.

## Evidence on Hand

- `backend/docs/SPEC.md` defines the current QTS public and Internal Portal API contracts.
- `backend/src/modules/leads/lead.repository.ts` defines the assigned-lead status contract used by demo records.
- No approved employee metrics, contract totals, testimonials, or production authentication contract are available; the interface must not present illustrative data as live production data.

## Product Principles

- Keep frequent actions immediately scannable and keyboard reachable.
- Make role boundaries visible and enforce them at every available server boundary.
- Separate demo data adapters from future production integrations.
- Prefer clear operational state over decorative presentation.
- Preserve document and data fidelity during download workflows.

## Accessibility & Inclusion

Target WCAG 2.1 AA, including visible focus, 44px touch targets, semantic tables and dialogs, reduced-motion support, and responsive behavior from 320px upward.
