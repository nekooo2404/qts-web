---
name: QTS Internal Portal
description: A precise, work-focused control desk for recurring QTS operations.
colors:
  brand-navy: "#162660"
  brand-navy-hover: "oklch(29% 0.105 262)"
  brand-ink: "oklch(98% 0.006 244)"
  highlight-blue: "#d0e6fd"
  warning-paper: "#f1e4d1"
  paper: "oklch(98.5% 0.006 244)"
  paper-raised: "oklch(100% 0 0)"
  paper-muted: "oklch(96.5% 0.012 244)"
  ink: "oklch(25% 0.028 255)"
  ink-muted: "oklch(48% 0.025 255)"
  rule: "oklch(88% 0.015 244)"
  focus: "oklch(64% 0.16 248)"
typography:
  headline:
    fontFamily: "Geist, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  body:
    fontFamily: "Geist, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  data:
    fontFamily: "Geist Mono, Cascadia Code, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0"
rounded:
  sm: "4px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand-navy}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  surface:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# Design System: QTS Internal Portal

## Overview

**Creative North Star: "Document Control Desk"**

QTS Internal Portal is a calm operational workbench: dense enough for repeated daily work, but ordered so the next action remains obvious. Brand navy anchors the permanent navigation and commands; pale blue and warm warning paper identify context without turning the screen into decoration.

The system favors scanability, predictable placement, and visible state. It rejects oversized marketing composition, decorative card stacks, gradients, and novelty motion in favor of structured tables, forms, filters, and document previews.

**Key Characteristics:**

- Persistent role-aware side rail and compact sticky work header.
- Flat, bordered surfaces with restrained tonal separation.
- Dense operational typography with monospaced record data.
- Motion only for state changes, dialogs, and explicit actions.

## Colors

The palette is cool and technical, with one warm paper tone reserved for gentle attention.

### Primary

- **QTS Command Navy:** Permanent navigation, primary actions, active record identifiers, and high-confidence commands.
- **Clear-Sky Highlight:** Selected context, previews, informational callouts, and quiet emphasis.
- **Review Paper:** Non-critical warnings, pending tags, and unsaved-change state.

### Neutral

- **Cool Work Paper:** Main canvas; its slight blue tint keeps the application from feeling sterile.
- **Raised White:** Forms, tables, dialogs, and discrete working surfaces.
- **Graphite Ink:** Primary copy and high-density operational values.
- **Steel Ink:** Metadata, helper text, and secondary labels.
- **Blueprint Rule:** One-pixel dividers and field boundaries.

**The Navy Anchor Rule.** Navy owns permanent structure and decisive actions; it does not flood content panels.

**The Warm Signal Rule.** Review Paper indicates attention without implying failure and never substitutes for destructive-state red.

## Typography

**Display Font:** Geist (with Segoe UI and sans-serif fallbacks)
**Body Font:** Geist (with Segoe UI and sans-serif fallbacks)
**Label/Mono Font:** Geist Mono (with Cascadia Code and monospace fallbacks)

**Character:** Geist keeps controls compact and legible while Geist Mono separates identifiers, currency, dates, and filenames from prose. Letter spacing remains neutral throughout.

### Hierarchy

- **Headline** (700, 24px, 1.2): Page titles and primary dialog titles only.
- **Title** (700, 16-20px, 1.25): Table regions, form sections, and record names.
- **Body** (400, 14px, 1.5): Interface copy and operational descriptions, normally capped near 65 characters per line.
- **Label** (600-700, 12-14px, 1.5): Field labels, column headings, statuses, and controls.
- **Data** (500, 12-14px, 1.5): Contract numbers, dates, currency, IDs, versions, and filenames.

**The Data Register Rule.** Monospace distinguishes values that users compare or transcribe; it is not a decorative third voice.

## Layout

Desktop uses a fixed 272px side rail and a flexible content track capped at 1600px. The work header stays visible while tables and forms scroll below it. Content follows a 4px spacing scale, with 16-24px panel padding and 24-32px page rhythm.

At narrow widths the side rail becomes an overlay drawer, working surfaces collapse to one column, tables gain dedicated mobile record lists, and actions reflow without wrapping their labels. Both `html` and `body` clip horizontal overflow; fixed-format controls retain a 44px interaction floor.

**The Workbench Rule.** Persistent navigation frames the job, while page content stays unframed except for genuine tools, records, and dialogs.

## Elevation & Depth

The system is flat by default. Depth comes from paper-tone shifts and one-pixel rules; soft shadows are limited to the sticky header and modal layer, where separation from moving content is necessary.

**The Flat-at-Rest Rule.** A surface does not receive a shadow merely to look clickable; state, border, and tone carry hierarchy first.

## Shapes

Controls and working surfaces use gently squared 8px corners. Small tags may use 4px corners, while avatars alone may be circular. Borders remain one pixel in every state so focus and validation never shift layout.

## Components

### Buttons

- **Shape:** Compact rectangular command with an 8px radius and a 44px minimum height.
- **Primary:** QTS Command Navy with light ink, used once per action group when possible.
- **Hover / Focus:** Controlled fill shift on hover, immediate 2px visible focus outline, 1px downward active response, and a three-channel disabled state.
- **Secondary:** Raised paper with a structural rule, for filters, cancel actions, and record tools.

### Chips

- **Style:** Compact 4-8px corners, semantic soft fill, high-contrast text, and no decorative shadow.
- **State:** Blue communicates current context, warm paper communicates review, and red remains destructive or failed state only.

### Cards / Containers

- **Corner Style:** Gently squared (8px).
- **Background:** Raised White on Cool Work Paper.
- **Shadow Strategy:** Flat by default; modal-only elevation.
- **Border:** One-pixel Blueprint Rule.
- **Internal Padding:** 16px on mobile and 24px on larger screens.

### Inputs / Fields

- **Style:** Raised paper, one-pixel rule, 8px corner, and 44px minimum height.
- **Focus:** Immediate 2px blue outline with an offset; border width never changes.
- **Error / Disabled:** Semantic border and helper copy for errors; reduced opacity plus blocked cursor and native disabled semantics.

### Navigation

The QTS navy side rail owns role context and destinations. Active items invert to raised white with navy ink; inactive items remain subdued until hover or keyboard focus. Mobile uses a labelled menu button and dismissible overlay drawer.

### Operational Dialog

Dialogs are semantic native modal surfaces with accessible names, bounded viewport height, controlled scroll, and `animate__zoomIn`. Reduced-motion preferences collapse the effect to near-instant state change.

## Do's and Don'ts

### Do:

- **Do** keep record identifiers, currency, dates, and filenames in the data register.
- **Do** expose loading, empty, error, disabled, success, and no-result states where the workflow can reach them.
- **Do** keep role checks at both early routing and server-layout boundaries.
- **Do** use QTS navy for decisive commands and permanent chrome.

### Don't:

- **Don't** present demo fixtures as production data or UI route guards as backend authorization.
- **Don't** nest cards, add decorative gradients, or build marketing-style hero sections inside the portal.
- **Don't** animate layout geometry or omit the reduced-motion fallback.
- **Don't** allow table density, button labels, or long identifiers to force horizontal page scrolling.
