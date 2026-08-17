# QTS Portal Dashboard Design

## Goal

Add a production-backed dashboard as the default portal home for both `ADMIN` and `EMPLOYEE`. The dashboard must surface operational state from existing leads, contracts, tasks, users, and audit records, then route users into existing workflows. It must not introduce placeholder approval, calendar, or notification systems.

## Confirmed Decisions

- Both roles receive a dashboard, with different scope and content.
- Dashboard data comes from the backend, not frontend fixtures.
- The implementation aggregates only existing portal modules.
- The selected structure is **Decision Ledger**, using a code-led build.
- Visual identity extends the current QTS Document Control Desk: navy command structure, cool paper surfaces, one-pixel rules, compact data typography, and restrained semantic color.
- Charts and KPI changes receive purposeful interaction motion; data does not animate decoratively.

## Surface Direction Contract

**THESIS:** Decision Ledger puts operational exceptions beside performance, avoiding the generic wall of equal metric cards.

**OWN-WORLD:** QTS navy commands, cool work paper, blueprint rules, pale blue context, warm review signals, tabular values, and gently squared controls.

**STORY:** A user opens the portal, confirms business state, sees the highest-priority exception, and drills into an existing workflow without scanning unrelated modules.

**FIRST VIEWPORT:** Compact greeting and filters; four KPI ledger cells; an eight-column performance panel; a four-column attention queue; the primary quick action remains visible near the filter row.

**FORM:** Decision Ledger, selected from the surface composition round with seed `f324c6d0`; code-led.

## Routes And Navigation

- Add `/admin/dashboard` and `/employee/dashboard`.
- Make these routes the role home paths returned by `getHomePath`.
- Change `/admin` and `/employee` redirects to their dashboard routes.
- Add `Dashboard` as the first role navigation item.
- Keep all existing routes and role boundaries intact.
- Administrators retain access to employee routes, but each dashboard route requests the scope appropriate to its own server layout.

## Information Architecture

### Shared First Viewport

1. Compact greeting, current date, generated timestamp, and data health state.
2. Time-range control: `7d`, `30d`, `90d`, or `365d`; default `30d`.
3. Department filter for company-scoped users only.
4. Manual refresh action.
5. Four KPI ledger cells with current value, comparison value, direction, period label, and a compact trend.
6. Business performance chart occupying eight of twelve desktop columns.
7. Requires Attention queue occupying four of twelve desktop columns.

### Lower Workbench

- Operational queue: highest-priority tasks, leads, or contracts the user can act on.
- Status distribution: a compact breakdown of task, lead, or contract state chosen by role and permission.
- Recent activity: audit activity for authorized administrators; scoped record activity for employees.
- Quick actions: links only to existing create or management workflows.

### Responsive Order

- Desktop: greeting and controls, KPI ledger, `8/12 + 4/12` performance/attention split, then lower workbench.
- Tablet: KPI ledger becomes two columns; performance and attention stack.
- Mobile: one-column reading order; KPI cells become compact rows; attention precedes the chart; controls use full-width native inputs; no horizontal page scrolling.

## Role Content

### Administrator

- KPI candidates: active contract value, active contracts, overdue tasks, active users.
- Performance series: contract value created in the selected period and tasks completed by time bucket.
- Distribution: company task status or contract status.
- Attention: overdue tasks, contracts expiring soon, blocked tasks, and unassigned leads.
- Queue: urgent company tasks and contracts approaching expiry.
- Activity: recent authorized audit events without request bodies or raw PII.
- Quick actions: create contract, create task, manage personnel, and open CMS.

### Employee

- KPI candidates: assigned lead count, assigned pipeline count, open task count, and completed tasks in period.
- Performance series: assigned leads received and personal tasks completed by time bucket.
- Distribution: assigned lead and personal task states.
- Attention: overdue personal tasks, blocked personal tasks, untouched assigned leads, and owned contracts approaching expiry.
- Queue: personal tasks and assigned leads ordered by urgency.
- Activity: recently updated records visible to the employee, using each record's current timestamps; no audit permission or historical event stream is implied.
- Quick actions: open lead management, create a contract, and open project resources.

Exact KPI availability is permission-driven. A missing permission removes the section or substitutes another allowed metric; it never renders a misleading zero.

## Backend API

Add:

```text
GET /api/dashboard?range=30d&department=<department>
```

### Input

- `range`: strict enum `7d | 30d | 90d | 365d`, default `30d`.
- `department`: optional bounded string. Reject it when the authenticated user lacks company-wide scope.
- Unknown query fields are rejected.

### Authorization

- The endpoint always runs after Bearer authentication.
- It requires at least one relevant read permission among leads, contracts, tasks, users, or audit.
- It never trusts a frontend role string or client-provided user identifier.
- Repository access derives from the authenticated user ID and current permission set.
- Employee queries retain existing owner, assignee, and resource boundaries.
- Company-wide totals are returned only where the current permission grants company-wide access.

### Response Contract

```ts
type DashboardRange = "7d" | "30d" | "90d" | "365d";

interface DashboardResponse {
  generatedAt: string;
  range: DashboardRange;
  scope: "personal" | "company";
  filters: {
    departments: string[];
    selectedDepartment: string | null;
  };
  kpis: Array<{
    id: string;
    label: string;
    value: string;
    comparisonValue: string | null;
    changePercent: number | null;
    direction: "up" | "down" | "flat" | "none";
    tone: "neutral" | "positive" | "warning" | "critical";
    series: number[];
    target: DashboardTarget | null;
  }>;
  performance: {
    title: string;
    points: Array<{
      bucket: string;
      primary: number;
      secondary: number | null;
    }>;
    primaryLabel: string;
    secondaryLabel: string | null;
  };
  distribution: Array<{
    id: string;
    label: string;
    value: number;
    tone: "neutral" | "positive" | "warning" | "critical";
  }>;
  attention: Array<{
    id: string;
    label: string;
    count: number;
    severity: "critical" | "warning" | "information";
    target: DashboardTarget;
  }>;
  queue: Array<{
    id: string;
    kind: "task" | "lead" | "contract";
    title: string;
    metadata: string;
    dueAt: string | null;
    severity: "critical" | "warning" | "neutral";
    target: DashboardTarget;
  }>;
  activity: Array<{
    id: string;
    label: string;
    occurredAt: string;
    actorLabel: string | null;
    target: DashboardTarget | null;
  }>;
}

type DashboardTarget =
  | { kind: "leads"; status?: string }
  | { kind: "contracts"; status?: string; owner?: "self" }
  | { kind: "tasks"; status?: string; assignee?: "self" }
  | { kind: "employees" }
  | { kind: "cms" };
```

The frontend maps `DashboardTarget` to a fixed allowlist of portal routes. The API never returns arbitrary URLs.

## Aggregation Layer

- Add a dashboard repository following existing backend repository patterns.
- Query existing `contact_leads`, `contracts`, `tasks`, `users`, and `audit_logs` tables only.
- Apply owner/assignee predicates before aggregation so unauthorized rows cannot influence totals.
- Department filtering joins through the authorized record owner or assignee to `users.department`.
- Bucket timestamps in PostgreSQL using the selected range and return stable ascending buckets, including zero-value gaps.
- Compute comparison values against the immediately preceding equal-length period.
- Format money and localized labels in the frontend; the backend returns precise numeric strings or numbers without locale formatting.
- Use a consistent read snapshot for one response. Any required query failure fails the response rather than mixing timestamps or scopes.
- Add indexes only when `EXPLAIN` or repository tests show a missing access path; no speculative dashboard cache or summary table is introduced.

## Frontend Data Boundary

- Add a same-origin BFF endpoint under `/api/portal/dashboard`.
- Store Keycloak access token, refresh token, and expiry only inside the encrypted NextAuth JWT.
- Refresh the provider access token server-side when required.
- Never expose the Bearer token through the NextAuth session JSON or a client prop.
- The BFF validates dashboard query parameters again, calls the backend, preserves stable error codes and `requestId`, and returns `Cache-Control: private, no-store`.
- Dashboard components fetch only from the same-origin BFF.
- A failed refresh ends the portal session and directs the user through login rather than retrying indefinitely.

## Components

- `DashboardView`: owns filter state, refresh, and response states.
- `DashboardKpiLedger`: four stable KPI cells with tabular values and text comparison.
- `DashboardPerformanceChart`: accessible line/area chart with keyboard and pointer exploration.
- `DashboardAttention`: actionable exception list.
- `DashboardQueue`: semantic list or table depending on viewport.
- `DashboardActivity`: chronological feed with real timestamps.
- `DashboardQuickActions`: role-aware links to existing workflows.

The project has no `components.json`, so the dashboard does not initialize a second Shadcn component system. It follows Shadcn composition principles while reusing established QTS controls and tokens. The target is Next.js web; Expo and NativeWind setup are intentionally excluded.

## Chart And Motion

- Use Recharts for chart semantics and interaction rather than hand-building chart geometry.
- Enable its accessibility layer and provide a visible data summary plus a semantic table equivalent.
- KPI values do not count up. Filter or refresh changes crossfade values over `160ms` so comparison remains stable.
- Chart data changes use a `220ms` on-screen transition with the existing strong `ease-in-out` token.
- Point hover and keyboard focus show a crosshair and tooltip over `150ms`.
- Loading skeletons crossfade to data; no perpetual spinner.
- Hover-only motion is gated by `(hover: hover) and (pointer: fine)`.
- `prefers-reduced-motion` removes positional and path movement, retaining only a short opacity transition where it aids state comprehension.
- Animate only `transform`, `opacity`, and the chart library's supported path transition. Never animate layout dimensions.

## Accessibility

- Meet WCAG 2.2 AA for the new surface.
- Preserve logical heading and landmark order.
- Every icon-only action has an accessible name; decorative icons are hidden from assistive technology.
- Controls have at least a 44px target in the portal design system.
- Keyboard order follows visual order, and focus is never obscured by the sticky header.
- Chart points are keyboard reachable; the same values remain available as text and table data.
- Trend direction and severity use text or symbols in addition to color.
- All normal text meets 4.5:1 contrast; large text and essential graphics meet 3:1.
- Refresh and load completion are announced through a restrained `aria-live` region.
- At 200% zoom and from 320px width, content remains usable without horizontal page scrolling.

## Loading, Empty, Error, And Permission States

- **Loading:** stable-dimension skeletons preserve final layout and avoid cumulative layout shift.
- **Empty:** explain that the current filter has no matching records and offer filter reset; never substitute fake metrics.
- **Error:** show a short recovery message, retry action, and `requestId`; do not expose internal stack details.
- **Permission:** omit unavailable modules and render an explicit no-dashboard-access state when no relevant data permission exists.
- **Stale:** always show `generatedAt`; refresh is manual to avoid silent content movement during review.
- **Partial data:** not supported in the first version. The endpoint returns one consistent snapshot or one error.

## Security And Privacy

- Keep backend authorization authoritative for every aggregate.
- Never aggregate rows outside the caller's resource scope.
- Do not include lead email, phone, raw audit metadata, request bodies, IP hashes, tokens, or private contract payload data.
- Cap result arrays for attention, queue, and activity.
- Validate range and department at both BFF and backend trust boundaries.
- Mark dashboard responses private and non-cacheable by shared caches.
- Use fixed target enums to prevent open redirects and arbitrary route injection.

## Testing

### Backend

- Schema tests for valid and invalid ranges, department bounds, and unknown fields.
- Controller tests for authentication, relevant permission requirement, personal scope, company scope, and forbidden department filters.
- Repository tests proving unauthorized records cannot affect counts, values, trends, queue order, or activity.
- PostgreSQL tests for bucket gaps, equal comparison periods, expiry windows, overdue boundaries, and numeric precision.
- Response serialization and error contract tests.

### Frontend

- NextAuth token persistence, refresh success, refresh failure, and no-token-exposure tests.
- BFF query validation, backend forwarding, error mapping, and `no-store` tests.
- Component tests for admin and employee content, target mapping, loading, empty, error, permission, and stale states.
- Motion tests for reduced-motion behavior and stable KPI layout.
- Accessibility tests with axe plus keyboard navigation assertions.
- Playwright checks at 320px and 1440px for both roles, chart interaction, drill-down, refresh, focus order, and zero horizontal page overflow.

## Out Of Scope

- New approval records or approve/reject workflows.
- Calendar or meeting storage.
- A standalone notification center.
- Cross-module global search.
- New finance concepts such as cost or profit when the source tables do not contain them.
- Replacing the existing QTS design system or initializing Shadcn, NativeWind, or an Expo app.
- Background polling, data warehouses, materialized views, or speculative dashboard caches.

## Acceptance Criteria

- Both roles land on their dashboard after authentication.
- Every rendered value originates from authorized backend data.
- Employee aggregates exclude all unassigned or unowned records.
- Company filters are unavailable without company-wide permissions.
- Four KPI cells, performance, attention, operational queue, and activity render in the approved Decision Ledger order.
- Every attention item and KPI drill-down reaches an existing authorized workflow.
- Loading, empty, error, permission, and stale states are complete.
- Chart and KPI interactions meet the approved motion contract and reduced-motion behavior.
- New UI meets WCAG 2.2 AA checks and works from 320px through desktop without page overflow.
- Backend tests, frontend tests, type checking, linting, production builds, and Playwright verification pass.
