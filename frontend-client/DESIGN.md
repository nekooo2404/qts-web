---
name: QTS Enterprise Operating Platform
description: A light enterprise platform built around visible system state, measurable operations, and calm technical authority.
colors:
  page: "#f6f9ff"
  page-strong: "#f5f9ff"
  surface: "#ffffff"
  ink: "#071426"
  muted: "#5f6d82"
  border: "#dce7f4"
  primary: "#2563eb"
  primary-dark: "#1d4ed8"
  primary-soft: "#eaf2ff"
  cyan: "#22d3ee"
  mint: "#4eddb3"
  violet: "#b58af2"
  amber: "#efb342"
  pink: "#ef75a9"
typography:
  display:
    fontFamily: "Sora Variable, Be Vietnam Pro, Arial, sans-serif"
    fontWeight: 720
    lineHeight: 1.05
    letterSpacing: "0"
  body:
    fontFamily: "Be Vietnam Pro, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
rounded:
  control: "8px"
  compact: "12px"
  card: "20px"
  dashboard: "24px"
  pill: "999px"
spacing:
  shell-mobile: "16px"
  shell-desktop: "24px"
  section-mobile: "84px"
  section-desktop: "120px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
    height: "46px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
    height: "46px"
  feature-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "23px"
  dashboard:
    backgroundColor: "rgba(255,255,255,0.76)"
    textColor: "{colors.ink}"
    rounded: "{rounded.dashboard}"
    padding: "19px"
---

# Design System: QTS Enterprise Operating Platform

## Overview

**Creative North Star: "The Visible System"**

QTS presents enterprise technology as a system that can be seen, understood, and operated. The world is bright and precise: pale blue operating fields, white product surfaces, decisive dark typography, one primary blue action color, and restrained semantic accents. Product evidence leads; decoration stays secondary.

The visual character combines operational clarity, quiet SaaS restraint, and enterprise architecture depth. The homepage persuades through a live system center, connected operating flow, explicit targets, and local scenario artwork rather than generic consulting claims.

**Key Characteristics:**

- Dashboard-first product storytelling.
- Security proof behaves like a control center, not a principle brochure.
- Broad atmospheric blue depth without decorative gradient objects.
- Compact technical labels paired with highly legible operating values.
- Repeated cards only for capabilities, scenarios, and framed tools.
- One connected signal motion with explicit pause behavior.

## Colors

The palette is a cool enterprise neutral system with one decisive blue voice and small functional accents.

### Primary

- **Operating Blue:** Primary buttons, active navigation, live data paths, and selected system nodes.
- **Deep Operating Blue:** Hover states and high-emphasis links.
- **Soft Operating Blue:** Quiet selected states, icon fields, and technical backgrounds.

### Secondary

- **Signal Cyan:** Data-flow and live-system emphasis.
- **Healthy Mint:** Available, secure, verified, and completed states.
- **Capability Accents:** Violet, amber, and pink distinguish categories without dominating the page.

### Neutral

- **System Ink:** Main headings, values, and authoritative labels.
- **Operational Muted:** Supporting copy and metadata; it must retain readable contrast on white.
- **Cool Page Field:** The default page environment.
- **White Surface:** Product tools, capability cards, and case studies.
- **Technical Rule:** Borders, separators, and grid structure.

**The One Action Voice Rule.** Blue owns primary action and active state; semantic accents communicate status, not competing calls to action.

## Typography

**Display Font:** Sora Variable with Be Vietnam Pro and Arial fallbacks
**Body Font:** Be Vietnam Pro with Arial fallback

**Character:** Sora gives platform headlines a geometric, engineered presence. Be Vietnam Pro keeps Vietnamese copy, metadata, navigation, and controls clear at operational densities.

### Hierarchy

- **Hero Display** (750, 55-71px desktop, 41-48px mobile, 1.02): short product promise only.
- **Section Headline** (720, 32-44px, 1.12): major narrative transitions.
- **Card Title** (700-750, 14-18px, 1.3): capabilities, nodes, and scenarios.
- **Body** (400, 14-16px, 1.55-1.65): explanatory copy with restrained line length.
- **Technical Label** (650-760, 10-12px, 1.35): system state and compact metadata; never shrink required proof below this range.

**The Zero Tracking Rule.** Display and body text use zero letter spacing; only short system marks may use modest positive tracking.

## Layout

The global shell is 1440px with 24px desktop gutters. Marketing content uses a narrower 1120-1216px field. The desktop hero uses an approximately 38/62 split so the system center is the dominant first-viewport proof. Major sections use 120px vertical rhythm; mobile compresses this to 84px.

At 1024px the hero stacks while the dashboard remains readable. At 768px capabilities become a single-column accordion, the operating model becomes a vertical sequence, and architecture nodes use a two-column compact grid. The mobile narrative prioritizes hero, dashboard, trust metrics, capabilities, operating model, architecture, and scenarios. Every breakpoint must retain a page width equal to the viewport from 320px upward.

**The Product Before Proof Rule.** The visitor sees the operating dashboard before supporting metrics, capabilities, or case studies.

## Elevation & Depth

Depth is reserved for framed product tools and actionable repeated cards. The system center uses a broad blue-tinted ambient shadow and translucent white material; feature and scenario cards use low, quiet elevation at rest and a small lift on hover. Page sections themselves remain unframed bands.

### Shadow Vocabulary

- **Product Lift** (`0 34px 90px rgb(45 77 132 / 17%)`): live dashboard and primary operating tools.
- **Card Rest** (`0 8px 30px rgb(66 94 140 / 6%)`): capabilities, reliability proof, and scenarios.
- **Card Hover** (`0 20px 48px rgb(66 94 140 / 11%)`): interactive repeated cards only.

**The Framed Tool Rule.** Glass and deep shadow identify an operable product surface, not a generic page section.

## Shapes

Controls use restrained 8px corners. Compact status surfaces use 12px. Capability and scenario cards use 20px. The primary live dashboard and operating model use 24px. Pills are reserved for status and compact category markers. Thin cool borders keep the system structured without adding visual weight.

## Components

### Buttons

- **Primary:** Operating Blue, white text, 8px radius, 46px minimum height, icon plus concise command.
- **Quiet:** Transparent surface, Deep Operating Blue text, and the same stable height.
- **Hover / Focus:** Darken or introduce Soft Operating Blue; keep visible focus outlines and avoid layout movement.

### Navigation

- Fixed translucent header with one active underline and one primary CTA.
- Desktop order is Platform, Solutions, Architecture, Case Studies, Pricing.
- Mobile uses a 48px icon menu button, focus trap, and numbered full-width links.

### Live System Dashboard

- White glass surface with System Health, four required state rows, and border-separated metrics.
- Desktop keeps a horizontal health trace; mobile reflows state and metric rows rather than shrinking proof.
- Status dots and progress paths are semantic accents, not decorative objects.

### Capability Cards

- Six cards in a 3-by-2 desktop grid with compact icon fields.
- Desktop summaries are static headings. Mobile summaries become real disclosure buttons with visible expanded state.

### Operating Model

- Five connected nodes inside one framed tool.
- Auto-advance includes a pause control, stops after manual node selection, and disables live announcements while playing.
- Reduced-motion preferences remove automatic and connector motion.

### QTS Operating Architecture

- The former consulting-style solution cards are replaced by one product console: \`One architecture. Four operating layers.\`.
- The console pairs an upward Architecture Map, active-layer detail, and a \`LIVE ARCHITECTURE VIEW\`.
- Foundation, Integration, Security, and Operations use status, capabilities, metrics, and explicit reference labels.
- System modules expose continuous flows such as \`Source → Integrate → Govern → Serve\`; stages stay on one line at every supported breakpoint.
- Layer signal motion has a visible 44px pause/play control and stops under reduced motion.

### Security Control Center

- A glass control center pairs a model security score and four system states with a five-stage control map.
- User-supplied demonstration values stay visibly qualified as `Model data`, `Reference`, `Example`, or `Sample`.
- Desktop evidence uses four dashboard cards; mobile converts them to native disclosure buttons.
- The animated control path has a 44px pause/play target and is disabled under reduced motion.

### Scenario Cards

- Local technical artwork leads each card.
- Challenge, Solution, and Result remain visually distinct.
- Results must stay technical scope or explicitly labeled targets.

### Pricing

- Pricing communicates three engagement models: Architecture Assessment, Platform Delivery, and Managed Operations.
- Commercial structure is expressed as custom scope, with assumptions and third-party costs separated.
- Comparison uses a semantic table on desktop and labeled stacked rows on mobile.
- FAQ uses native `details` and `summary` disclosure behavior.

## Do's and Don'ts

### Do:

- **Do** lead with real product UI or local system artwork.
- **Do** preserve visible labels such as `target` for unverified performance numbers.
- **Do** qualify security demonstrations as model, reference, example, or sample data.
- **Do** show architecture as an operating console with selectable layers and explicit system states.
- **Do** explain pricing through scope drivers when no approved rates exist.
- **Do** keep required dashboard state readable on mobile.
- **Do** use motion to explain system flow and provide a pause mechanism.
- **Do** use full-page bands and constrained inner shells.

### Don't:

- **Don't** use unapproved customer logos, testimonials, certifications, or business outcomes.
- **Don't** invent prices, discounts, certifications, or live security performance.
- **Don't** add a standalone `Liên hệ` navigation item; conversion language is `Trao đổi với QTS`.
- **Don't** stack decorative cards inside cards or turn every section into a floating panel.
- **Don't** add discrete gradient orbs, bokeh, generic stock technology imagery, or ornamental diagrams.
- **Don't** shrink operational proof to make the mobile dashboard fit; reflow it.
