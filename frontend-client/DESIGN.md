---
name: QTS Public Website
description: Enterprise engineering interface that makes complex digital systems visible, inspectable, and operable.
colors:
  qts-navy-deep: "#07143d"
  qts-navy: "#0b1f5c"
  qts-navy-hover: "#123a9c"
  interface-blue: "#3b82f6"
  system-blue: "#5ea7ff"
  signal-blue: "#78c4ff"
  signal-live: "#38d9ff"
  paper: "#f5f8fc"
  paper-blue: "#eaf2fb"
  surface: "#ffffff"
  ink: "#111a37"
  muted-ink: "#52627a"
  structural-border: "#b8cbe0"
  milestone: "#4a62a0"
  hero-text: "#ffffff"
  project-art-paper: "#f1e4d1"
  capability-field: "#f5f8fc"
  capability-ink: "#0f172a"
  capability-primary: "#1e40af"
  capability-border: "#cbd5e1"
  structural-rule: "rgb(11 31 92 / 16%)"
  structural-rule-dark: "rgb(120 196 255 / 24%)"
  navy-shadow-soft: "rgb(7 20 61 / 6%)"
  navy-shadow: "rgb(7 20 61 / 14%)"
  focus: "#3b82f6"
  success: "#176b4d"
  error: "#a12b35"
  success-soft: "#edf8f3"
  error-soft: "#fff1f2"
typography:
  scale:
    micro: "0.55rem"
    technical: "0.625rem"
    technical-large: "0.6875rem"
    label: "0.75rem"
    node: "0.8125rem"
    small: "0.875rem"
    caption: "0.9375rem"
    body: "1rem"
    hero-brand-mobile: "1.0625rem"
    lead: "1.125rem"
    subheading: "1.25rem"
    capability-heading: "1.5rem"
    mobile-heading: "1.35rem"
    project-title: "1.625rem"
    section-heading: "1.75rem"
    hero-display-mobile-wide: "1.875rem"
    capability-heading-large: "2rem"
    story-number: "2.25rem"
    workflow-number: "2.5rem"
    story-number-large: "2.75rem"
    workflow-number-large: "3rem"
    hero-display-laptop: "3.25rem"
    display-large: "3.5rem"
    hero-display-desktop: "3.75rem"
  display:
    fontFamily: "Sora Variable, Be Vietnam Pro, Arial, sans-serif"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  headline:
    fontFamily: "Sora Variable, Be Vietnam Pro, Arial, sans-serif"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0"
  body:
    fontFamily: "Be Vietnam Pro, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  lead:
    fontFamily: "Be Vietnam Pro, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  small:
    fontFamily: "Be Vietnam Pro, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Be Vietnam Pro, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.045em"
  button:
    fontFamily: "Be Vietnam Pro, Arial, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
rounded:
  square: "0px"
  tag: "4px"
  control: "6px"
  card: "8px"
spacing:
  shell-mobile: "1.25rem"
  shell-desktop: "4rem"
  control-y: "0.75rem"
  control-x: "1.25rem"
  section-mobile: "4rem"
  section-desktop: "7rem"
components:
  button-primary:
    backgroundColor: "{colors.qts-navy}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.qts-navy-hover}"
  form-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tag}"
  system-map:
    backgroundColor: "{colors.qts-navy-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.square}"
    border: "1px {colors.structural-rule-dark}"
  project-record:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.qts-navy-deep}"
    rounded: "{rounded.tag}"
    border: "1px {colors.structural-rule}"
---

## Overview

**Creative North Star: "Enterprise Digital Intelligence."** QTS presents operational work as a system that can be inspected, implemented, and improved. Architecture, integration, security, and operations are the visual identity rather than decorative technology imagery.

**The Blueprint Rule.** Establish hierarchy with full-bleed system fields, ruled divisions, numbered steps, and purposeful rectangular modules before adding decoration. The landing page follows a Map / Diagram macrostructure: offer, system map, delivery method, capabilities, solution flows, technical project records, then contact.

**Key Characteristics:** square structural geometry; low-radius controls; solid navy blueprint fields; pale-blue reading surfaces; one-pixel topology; route-specific system diagrams; restrained reveal and data-flow motion; Sora and Be Vietnam Pro in defined roles.

## Colors

Primary colors are deep `#07143D` and navy `#0B1F5C` for structure, with `#123A9C`, `#3B82F6`, `#5EA7FF`, and `#78C4FF` for hierarchy. Paper `#F5F8FC`, pale blue `#EAF2FB`, and white carry reading surfaces. Cyan `#38D9FF` is reserved for live status, active nodes, data flow, focus, and hover feedback.

The implementation exposes stable palette aliases for shared UI work: `--qts-navy`, `--qts-navy-hover`, `--qts-navy-light`, `--qts-slate`, and `--qts-blue-accessory`. Components should consume these aliases rather than introducing page-local navy or blue values.

**The Field-and-Marker Rule.** Use navy as a structural field, pale blue as a supporting field, and cyan only as a live marker. Keep paper and surface as the default reading planes; use ink and muted ink for text hierarchy. Warm paper may appear only inside the original project blueprint artwork and must not become a page theme.

Structural borders organize sections, cards, galleries, and form partitions. Success and error colors appear only in contact-form feedback, paired with their soft background and darker text treatment.

## Typography

Sora carries semantic display headings at 600-700. Be Vietnam Pro carries body copy, labels, metadata, controls, and the brand statement at 400-800. Letter spacing is neutral for prose and headings; compact uppercase technical labels may use `0.045em` to `0.08em` tracking.

**The Operational Type Rule.** Sora supplies geometric authority while Be Vietnam Pro keeps Vietnamese text compact and legible. Technical microcopy may drop to the documented 9-11px range only inside stable diagrams, never for body content.

## Layout

The page shell is centered at a maximum of 88rem. It keeps 2rem side gutters by default and 4rem from 48rem upward; the landing hero tightens to 1.25-1.5rem gutters below 768px. Sections use 4rem vertical padding on mobile, 5rem at small sizes, and 7rem on large screens.

**The System Grid Rule.** Use broad, edge-aligned rectangular sections and visible border lines. On large screens, capability and content layouts expand into 12-column grids; they collapse to single-column stacks or concise two-column form rows on smaller screens.

Headings and labels use `.display-wrap` behavior in implementation so long Vietnamese content can wrap without horizontal overflow. Header navigation overlays the landing hero, becomes a solid white field on internal routes or after scroll, and compresses from 6rem to 4.5rem. Below large screens, navigation becomes a conditionally rendered modal drawer. The document reserves 5.5rem of scroll padding below the fixed header; anchored targets use a 6rem scroll margin.

## Elevation & Depth

The system is flat by default. Surfaces are differentiated through navy, pale blue, paper, white, and structural borders. A restrained shadow is allowed only on command buttons and the contact form where separation improves usability.

**The Flat Field Rule.** Structural borders and color fields create depth. System maps, the partner rail, stories, records, and footer remain flat; do not introduce glass, nested cards, gradient blobs, or a broad elevation scale.

Hero depth comes from a solid navy field, quarter-grid rules, live connectors, and a responsive Business -> Data / Integration / Security -> Operations topology. Project diagrams keep their accessible original blueprint artwork without decorative hover scaling.

## Shapes

Structural modules and status blocks use a 0px radius. Form fields and records use 4px, command controls use 6px, and isolated cards may use at most 8px. The partner rail and system diagrams stay square. Borders are 1px except deliberate 2px focus and active cues.

**The Controlled Geometry Rule.** Keep page structure, data rows, and operational modules square. Avoid pills, nested cards, oversized rounded containers, and decorative circular controls.

## Components

### Buttons and Links

Primary actions use a solid navy or white fill, bold text, a 6px radius, and at least a 3rem height. The landing hero uses one white action with navy text: `Khám phá năng lực`. Secondary editorial links remain text plus an arrow and a structural underline. Hover changes border or fill without decorative gradients; active states compress slightly.

**The Decisive Action Rule.** Reserve filled buttons for meaningful forward movement. The first viewport has one priority action only; navigation does not add a competing filled CTA.

### Cards and Project Media

Landing capabilities form one connected four-layer system map. Project records use a stable document layout with an `8 / 5` architecture diagram on mobile and a full-height media column on desktop, followed by technology tags, three icon-led metrics, and native disclosure. Records use a white surface, 1px rule, 4px radius, and no card shadow. Scope and target values never count up because they are not live or verified KPIs. Project records stay anonymous, carry an illustration/metric caveat, and never imply verified business outcomes.

### Capability Stack

The detailed capability route is an ordered Architecture Layers stack, not a card grid and not a timeline. Four flush layers use `01 / 04` identity, a 48px monochrome line-icon container, a Sora title with one short rule, and separate outcome lists labeled `Phạm vi` and `Đầu ra`. The stack uses `#F8FAFC`, `#0F172A`, `#1E40AF`, and `#CBD5E1` as its local enterprise field. A 4% blueprint grid is allowed because the surface is explicitly an architecture model. Hover and fragment-target states draw one 2px left accent, strengthen the icon, and emphasize the lists without lifting the row or implying clickability. Each layer reveals its number, icon, summary, and lists at 0/100/200/300ms with 600ms exponential ease-out; reduced motion is fully static. Below 768px the identity becomes a compact horizontal header and the two lists stack; from 768px they form two columns below the summary; the full four-track layer begins only at 1200px.

### Workflow Journey

The landing workflow is a four-stage horizontal journey on `#F8FAFC`: `Khảo sát → Blueprint → Triển khai → Vận hành`. One continuous `rgba(15,23,42,0.12)` rail joins the stages, while a navy progress stroke draws from the rail start to the viewport-active node. Large `#B8C3D8` 48px milestone numbers act as visual anchors; monochrome Phosphor light icons use MagnifyingGlass, Blueprint, CloudArrowUp, and Pulse. Each stage ends with a compact `Đầu ra` row and directional marker. Pointer hover temporarily supersedes viewport emphasis so only one stage is visually active; stages never lift or behave like clickable cards. Below 768px the same semantic list becomes a vertical timeline without horizontal scrolling or DOM reordering. Stages reveal at 100ms intervals and reduced motion presents the complete journey immediately.

### Solution Story

The landing solution section is a light architecture document, not a dark card wall. Each record uses an identity rail, an authored problem statement, and a four-node data pipeline on wide screens. Pale blue fields, 4px corners, 1px rules, and monochrome Phosphor line icons match the technical reference without introducing decorative dashboards. Below 1344px the pipeline becomes a vertical flow; below 768px the identity rail becomes a compact horizontal header without horizontal page scrolling.

Rows enter once with a 600ms fade-and-20px rise using `cubic-bezier(.16,1,.3,1)`. Numbers reveal at 100ms, authored headline lines begin at 150ms, pipeline content begins at 250ms, and the outcome rule draws before its text. The viewport-active row replays a sequential node-and-connector signal at 700ms intervals; inactive rows retain full text contrast and only mute their structural accents. Node hover changes border, background, and icon emphasis in 200ms without lift. Reduced motion presents every record, line, node, connector, and outcome immediately.

### Forms and Feedback

Inputs and textareas are white, square, and border-led. Focus shifts the border/ring toward navy while the global focus-visible outline remains explicit; disabled fields preserve shape and become unavailable through cursor and opacity. The contact form uses success, error, and unavailable status blocks with matching semantic colors and live announcements.

### Navigation and Disclosure

The header uses one compact navigation row with three triggers opening full-width mega panels: Năng lực, Giải pháp, and Dự án. The single “Trao đổi với QTS” action owns the project-conversation path; there is no competing Contact navigation item. The header is transparent over the landing hero and solid white on internal routes or after scroll. Desktop navigation uses a cyan underline on dark and QTS blue on light. Mobile mounts a labelled modal drawer only while open, traps focus, closes on Escape, restores focus, and locks body scroll. Solution and project disclosures use native square `details` rows.

### Motion and Accessibility

Motion uses native CSS and small IntersectionObservers. Sections reveal once with transform-led movement while content remains readable before the observer fires. Topology connectors and active signals loop gently; the fifth solution stage is sequenced with the first four. The partner strip is the only continuous data rail and its duplicate is hidden from assistive technology. Keyboard focus uses a visible blue/cyan outline. Reduced motion removes spatial movement while preserving all content and architecture.

Partner marks use local assets inside one flat, square, keyboard-scrollable rail. They stay normalized with `object-fit: contain`, muted grayscale by default, and stronger contrast on pointer hover. Publication requires brand approval and never implies unverified client proof.

## Do's and Don'ts

### Do:

- **Do** use Sora 700/600 for display headings and Be Vietnam Pro 400-800 for body, labels, metadata, and controls.
- **Do** build pages from navy structural fields, pale signal-blue support planes, paper/surface reading planes, and 1px borders.
- **Do** use square structural modules, 4-8px corners, clear focus outlines, responsive stacking, and the 88rem shell.
- **Do** keep the topology-led navy hero, cyan data signal, authored three-line title, and reduced-motion behavior.

### Don't:

- **Don't** add rounded pills, glass, decorative gradients, nested cards, gradient blobs, or a broad shadow vocabulary.
- **Don't** add customer logos, testimonials, certification badges, leadership profiles, or quantified outcomes until each item has an approved source.
- **Don't** replace the operational narrative with a generic SaaS dashboard, equal-card wall, or centered stock hero.
- **Don't** use motion that bypasses `prefers-reduced-motion`, hides keyboard focus, or makes navigation states ambiguous.
- **Don't** let long Vietnamese display text create horizontal overflow at the 320px support floor.
