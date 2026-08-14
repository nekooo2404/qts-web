---
name: QTS Public Website
description: Technical, austere corporate system for translating operational problems into implementable digital systems.
colors:
  qts-navy: "#162660"
  qts-navy-deep: "#0e193f"
  signal-blue: "#d0e6fd"
  signal-blue-soft: "#eef6ff"
  warm-paper: "#f1e4d1"
  paper: "#f8fbff"
  surface: "#ffffff"
  ink: "#111a37"
  muted-ink: "#536078"
  structural-border: "#b8cbe0"
  focus-amber: "#7b4f19"
  focus-on-dark: "#f1e4d1"
  success: "#176b4d"
  error: "#a12b35"
  success-soft: "#edf8f3"
  error-soft: "#fff1f2"
typography:
  display:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "normal"
  body:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "normal"
rounded:
  square: "0px"
spacing:
  shell-mobile: "2rem"
  shell-desktop: "4rem"
  control-y: "0.75rem"
  control-x: "1.25rem"
  section-mobile: "4rem"
  section-desktop: "7rem"
components:
  button-primary:
    backgroundColor: "{colors.qts-navy}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1.25rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.qts-navy-deep}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0.75rem 1.25rem"
    height: "3rem"
  form-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
  capability-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.qts-navy-deep}"
    rounded: "{rounded.square}"
    padding: "1.75rem"
---

## Overview

**Creative North Star: "The Operational Blueprint" / "Bản thiết kế vận hành."** QTS presents operational work as a system that can be inspected, implemented, and improved. The public site is technical, austere, modern-minimal, and upright: QTS navy creates structural fields, pale signal-blue carries supporting information, and warm paper marks the human point of action.

**The Blueprint Rule.** Establish hierarchy with full-bleed system fields, ruled divisions, numbered steps, and purposeful rectangular modules before adding decoration. The landing page follows the implemented Narrative Workflow: problem, delivery method, capabilities, sample work, then project contact.

**Key Characteristics:** square geometry; flat light surfaces; QTS navy structure; full-bleed systems imagery; precise borders; restrained reveal and hover motion; Inter throughout.

## Colors

Primary colors are QTS navy for structure and its deeper counterpart for hero fields and action-hover states. Signal-blue and its soft field provide technical contrast without becoming a dominant wash. Warm paper is the emphasized marker, selection color, and focus treatment on dark surfaces.

**The Field-and-Marker Rule.** Use navy as a structural field, signal-blue as a supporting field, and warm paper only to identify priority, brand, or interaction. Keep paper and surface as the default reading planes; use ink and muted ink for text hierarchy.

Structural borders organize sections, cards, galleries, and form partitions. Success and error colors appear only in contact-form feedback, paired with their soft background and darker text treatment.

## Typography

Inter Variable is the single typeface for display, interface, and body copy. Heavy display type anchors hero and section headings; headings remain tightly led with normal tracking. Body copy is calm and readable with the implemented 1.75 line-height, while navigation, labels, categories, and counts use bold uppercase compact text.

**The Operational Type Rule.** Let size, weight, case, and alignment carry hierarchy. Do not introduce a decorative display face, tight negative tracking, or a second branded type family.

## Layout

The page shell is centered at a maximum of 88rem. It keeps 2rem side gutters by default and 4rem from 48rem upward; the document never drops below a 20rem body width. Sections use 4rem vertical padding on mobile, 5rem at small sizes, and 7rem on large screens.

**The System Grid Rule.** Use broad, edge-aligned rectangular sections and visible border lines. On large screens, capability and content layouts expand into 12-column grids; they collapse to single-column stacks or concise two-column form rows on smaller screens.

Headings and labels use `.display-wrap` behavior in implementation so long Vietnamese content can wrap without horizontal overflow. Header navigation is sticky; below large screens, the nav becomes a toggled vertical menu and the contact action is removed from the header. Anchored sections leave 5.5rem of scroll margin below the sticky header.

## Elevation & Depth

The system is flat by default. Surfaces are differentiated through navy, pale-blue, paper, white, and structural borders rather than a shadow scale.

**The Single Lift Rule.** The only reusable elevation is the ambient raised shadow for capability cards and the contact form. It is diffuse and low-contrast, never a floating-card stack or a dramatic depth cue.

Hero depth comes from a full-bleed systems image beneath a navy overlay and quarter-grid rules. Project imagery uses CSSgram filters (`mayfair`, `hudson`, and `reyes`) as a controlled photographic treatment, with a small scale increase on hover.

## Shapes

Everything is square: controls, cards, navigation states, form fields, status blocks, and image frames use a 0px radius. Borders are 1px except deliberate 2px accents in the header, key text links, and structural callouts.

**The Square Geometry Rule.** Do not soften QTS interfaces with pills, rounded cards, or circular controls. Icons may be compact glyphs, but their surrounding controls remain square and measured.

## Components

### Buttons and Links

Primary actions are rectangular navy blocks with white bold text, at least 3rem tall. On light surfaces, Hover.css sweep reveals deep navy; in the dark hero, the alternate outlined action turns white with deep-navy text on hover. Secondary editorial links are text plus an arrow, underlined by a 2px navy bottom border. Active links and buttons reduce opacity; action buttons may compress slightly.

**The Decisive Action Rule.** Reserve filled buttons for meaningful forward movement and use the contact route as the persistent project-conversation action.

### Cards and Project Media

Capability cards are bordered rectangular panels with one color field each, generous 1.75rem to 2.25rem padding, an icon/count row, and a low ambient lift. Gallery items are unboxed editorial records: filtered image, category label, title, copy, then a bottom structural border. The contact route uses a local schematic map asset as an honest broad-area reference, with a separate link to live OpenStreetMap lookup.

### Forms and Feedback

Inputs and textareas are white, square, and border-led. Focus shifts the border/ring toward navy while the global focus-visible outline remains explicit; disabled fields preserve shape and become unavailable through cursor and opacity. The contact form uses success, error, and unavailable status blocks with matching semantic colors and live announcements.

### Navigation and Disclosure

The sticky navy header has a warm-paper lower rule, a square Q mark, and uppercase navigation. The current route is a warm-paper block; inactive routes use white with a subtle white overlay on hover. Solution disclosures are square, border-separated `details` rows with numbered labels and a navy left rule for expanded content.

### Motion and Accessibility

Entrance content uses Animate.css fade/zoom reveals at 780ms, triggered once when it reaches the viewport. Hover.css sweep, float, grow, and image-scale responses are short state acknowledgements, not decorative loops. Keyboard focus is a 3px amber outline with 3px offset, changing to warm paper on dark QTS fields. With reduced motion enabled, smooth scrolling, animation, and transitions collapse to near-instant behavior.

## Do's and Don'ts

### Do:

- **Do** keep Inter Variable across display, interface, and body roles.
- **Do** build pages from navy structural fields, pale signal-blue support planes, paper/surface reading planes, and 1px borders.
- **Do** use square 0px-radius modules, clear focus outlines, responsive stacking, and the 88rem shell.
- **Do** use the single ambient raised shadow only for the implemented form and capability-card lift.
- **Do** retain CSSgram filtering for project imagery and preserve reduced-motion behavior whenever motion is added.

### Don't:

- **Don't** add rounded pills, soft card corners, gradient decoration, or a broad shadow vocabulary.
- **Don't** replace the operational narrative with a generic centered corporate hero or unsupported customer claims.
- **Don't** use motion that bypasses `prefers-reduced-motion`, hides keyboard focus, or makes navigation states ambiguous.
- **Don't** let long Vietnamese display text create horizontal overflow or make the body narrower than 20rem.
