# Handoff: Smart Titles — Settings Panel Redesign

## Overview
**Smart Titles** is a plugin for Thymer (a PKM app). It appends a collection's property
values after page names wherever those pages appear — references, search results, the
quick switcher. Example rendered title: **`Setup ↗ — Menu — Pro Tools`**.

This handoff covers a **redesign of the plugin's settings panel** — the surface where a
user picks which collections participate and which of each collection's properties appear
in the title (and in what order).

**The problem being solved:** the original settings panel stacked every collection as a
fully-expanded editor card in one long scroll. By the third collection it was cluttered and
required scrolling to find the collection you wanted to edit. The "Available properties"
grid (up to ~16 chips) was shown permanently per collection, dominating the height.

**The solution:** a **master-detail** layout — a compact, searchable list of all collections
on the left; a single editor pane on the right that stays put. The permanent
available-properties grid is replaced by a **"+ Add property" searchable popover**, so an
open editor stays short. Properties in the title can be **drag-reordered**.

---

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — runnable
prototypes that show the intended look and behavior. They are **not production code to copy
directly**. The task is to **recreate these designs in Thymer's existing front-end
environment**, using its established component patterns, state management, and styling
conventions. If a particular pattern (e.g. the popover) already exists in the host app, use
the host's version rather than re-implementing the prototype's.

The prototype uses React 18 loaded from a CDN with in-browser Babel and a small set of split
`.jsx` files. That setup is purely for prototyping convenience — ignore the loading mechanism
and translate the components/logic into the real codebase.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are final and
intentional. Recreate the UI to match, using the host codebase's libraries. Exact tokens are
listed under **Design Tokens** below.

---

## Recommended final configuration
The prototype includes a **Tweaks panel** (floating, bottom-right) that toggles between
layout/density/accent options. **That panel is a prototyping aid — do not build it into the
product.** Ship this resolved configuration:

- **Layout:** Two-pane (master-detail). *(An Accordion layout also exists in the prototype as
  an alternative for very narrow widths — see "Alternative layout" — but two-pane is the
  chosen direction.)*
- **Density:** Compact.
- **Accent color:** `#30CBBB`.

---

## Screens / Views

### 1. Settings Panel (Two-pane / master-detail) — primary
The whole feature is one panel. Intended to live in a settings modal/page ~920px max width.

**Layout (top to bottom):**
- **Header** — title "Smart Titles" + one-paragraph description. Padding `24px 26px 18px`,
  bottom border.
- **Body** — a horizontal flex split:
  - **Left rail** — fixed width `280px`, right border, slightly darker background.
    - Rail head: uppercase label "Collections" + a total-count pill.
    - Search field "Find a collection…".
    - Scrollable list of collection rows.
    - "+ Add collection" button pinned at the bottom (dashed border).
  - **Detail pane** — `flex: 1`, vertical scroll. Shows the editor for the selected
    collection (see Components → Collection Editor). Empty state: "Select a collection to edit."
- **Footer** — right-aligned "Cancel" (ghost) and "Save" (primary, accent) buttons. Top
  border, slightly darker background.

The panel is `max-height: calc(100vh - 64px)`; header and footer are fixed, only the rail
list and detail pane scroll independently.

**Responsive:** under 680px the two-pane stacks (rail on top, capped at 42% height, bottom
border instead of right border).

### 2. Alternative layout — Accordion (optional)
A single-column alternative for narrow contexts. Each collection is a row that collapses to a
one-line summary (name + live preview + property count) and expands inline to reveal the same
Collection Editor. Only one expands at a time. **Not the chosen direction** — implement only
if Thymer needs a narrow/single-column variant.

---

## Components

### Left rail — collection list
- **Rail head:** label "Collections" (`.st-label` style: 10.5px, uppercase, letter-spacing
  0.14em, color `--text-faint`) + total pill (11px, `--surface-2` bg, `--border`, radius 5px).
- **Search field:** magnifier icon + text input. Bg `--surface-2`, border `--border`, radius
  5px; border becomes `--accent-line` on focus-within. Placeholder "Find a collection…".
  Filters the list by collection name (and, in two-pane, by preview text).
- **Collection row (`.st-rail-row`):** full-width button, flex row, `gap 10px`, padding
  `11px 12px` (compact: `8px 10px`), radius 5px.
  - **Name** — Space Grotesk 600, 14px, `--text`; `flex: 1`, truncates with ellipsis.
  - **Count badge** — number of properties currently in the title. 11px, `--surface-3` bg,
    `--border`, radius 4px, min-width 22px, centered.
  - **Hover:** bg `--surface-2`. **Selected:** bg `--accent-soft`, border `--accent-line`,
    name color `--accent-text`, count badge transparent bg with `--accent-line` border +
    `--accent-text` text.
  - NOTE: the rail row intentionally shows **only name + count** — no preview line. (The live
    preview lives in the open editor, so repeating it in the rail was redundant.)
- **"+ Add collection" button (`.st-add-coll`):** centered, dashed `--border-2`, radius 5px,
  `--text-mut` text → `--accent-text` text + `--accent-line` border on hover. Opens the
  Add-collection picker (below).

### Collection Editor (detail pane)
Renders for the selected collection. Sections top to bottom:

1. **Editor header** — editable collection **name** (looks like a heading: Space Grotesk 700,
   19px; transparent border that shows `--surface-2` bg on hover and `--accent-line` border on
   focus) + a **"✕ Remove"** button (`.st-remove`: `--text-faint`, `--border`, radius 5px;
   hover turns text/border to a soft red `#ff8d7a`).
2. **"IN TITLE (IN ORDER)"** label, then a flex-wrap row of **property chips** + the
   **"+ Add property"** button.
3. **"SEPARATOR"** label + a small text input (per-collection; max 3 chars; ~44px wide, sized
   to match the buttons' height, centered, `--surface-2` bg, `--border-2`, radius 5px).
4. **"PREVIEW"** panel — live rendering of the resulting title (see Preview).

### Property chip (`.st-chip`) — reorderable
- A property currently in the title. **Same border-radius as every other control** (5px — no
  pill). Flex row, all children vertically centered: **`‹` move-left button** (SVG chevron),
  the property **name**, **`›` move-right button** (SVG chevron), then a small **× remove**
  button — mirroring the original plugin's chip design.
- Style: bg `--accent-soft`, border `--accent-line`, radius 5px, `cursor: grab`. Name color
  `color-mix(in srgb, var(--accent) 30%, white 70%)`, Space Mono 700, 13px (compact 12px).
  The `‹`/`›` chevrons are a dimmed accent; the leading `‹` is disabled (faded) on the first
  chip and the trailing `›` is disabled on the last.
- **Reordering — TWO ways, both required:**
  - **Arrows:** `‹` swaps the property with its left neighbor, `›` with its right neighbor.
  - **Drag:** HTML5 drag-and-drop. While dragging, the chip is `opacity: 0.4`; the hovered
    target shows a `box-shadow: -3px 0 0 var(--accent)` drop indicator on its left edge. On
    drop, the dragged property is spliced into the target's index.
- **×** removes the property from the title and returns it to that collection's available pool.

### "+ Add property" button + popover
- **Button (`.st-add`):** dashed `--border-2`, `--surface-2` bg, radius 5px, "+ Add property".
  Hover/open state: `--accent-text` text, `--accent-line` border, `--accent-soft` bg.
- **Popover (`.st-pop`):** a searchable menu of that collection's **available** properties
  (those not already in the title). 290px wide. Contains:
  - A search field (autofocused) "Search properties…". Filters by name or type. Enter adds the
    first match.
  - A scrolling list of items; each item = a small "+" glyph, the property **name**, and a
    muted **type tag** (`record` / `text` / `datetime` / `choice` / `image` / `url` /
    `number`). Click adds it to the title (appends to the end) and removes it from the pool.
  - A footer "N available · click to add".
  - **CRITICAL positioning detail:** the popover must **not** be clipped by the scrolling
    detail pane. In the prototype it is rendered via a **portal to `document.body`** with
    `position: fixed`, anchored to the button's bounding rect, and **flips above** the button
    when there's more room above than below. It closes on outside click, Escape, scroll, or
    resize. Reproduce this anti-clipping behavior with the host's popover/portal primitive.

### Add-collection picker
- Opens from "+ Add collection". Same popover treatment (portaled, fixed, flip-aware,
  closes on outside-click/Esc/scroll). 264px wide.
- Lists collections that exist in the workspace but **aren't yet configured** for Smart Titles,
  **alphabetically**, each with a search field "Search collections…" and a per-row property
  count ("N props").
- **This replaces the original native `<select>` dropdown** (a long alphabetical scroll list)
  with a searchable menu — picking a collection adds it (empty title, selects it for editing).
- In the real app this list comes from the workspace's collections API.

### Preview (`.st-preview`)
Live render of how the page title will look with the configured properties. This must match
the app's actual rendered output:
- **Page name** — the linked page. Color `--accent` (`#30CBBB`), **bold (700)**, **underlined**
  (underline-offset 3px, thickness 1px), immediately followed by a small **up-right arrow ↗**
  in `--accent` (indicates it's a link to the page).
- **Separator + each property value** — same teal hue as the accent but **dimmed**:
  `color-mix(in srgb, var(--accent) 60%, #000)`, **bold (700)**. The separator is the
  collection's own separator string (default varies per collection, e.g. `–`, `·`, `›`).
- Empty state: `Page name ↗  — no properties yet`.
- Container: `--surface` mixed slightly darker, `--border`, radius 6px, padding `14px 16px`,
  Space Mono 14px.

### Footer
- **Cancel** — ghost button (Space Grotesk 600, 13px, transparent bg, `--border-2`, radius
  5px; hover brightens text/border).
- **Save** — primary (accent `#30CBBB` bg, text `#08201d`; hover `filter: brightness(1.07)`).

---

## Interactions & Behavior
- **Select collection:** click a rail row → its editor loads in the detail pane (replaces
  whatever was there). Selected row highlights.
- **Search collections:** typing in the rail search filters the list live (name + preview).
- **Add property:** "+ Add property" opens the popover → click an item (or Enter on first
  match) → property appends to the title chips and leaves the available pool. Popover closes.
- **Remove property:** chip ✕ → property leaves the title and returns to the pool.
- **Reorder properties:** use the `‹`/`›` arrows on a chip (swap with neighbor) **or** drag a
  chip onto another. Live drop indicator on the target's left edge; dragged chip dims.
- **Edit collection name:** inline text input in the editor header.
- **Edit separator:** per-collection text input (≤3 chars). The preview updates live.
- **Add collection:** "+ Add collection" opens the picker → choose one → it's appended to the
  configured list, removed from the pickable pool, selected, and opened for editing.
- **Remove collection:** "✕ Remove" → collection leaves the configured list and is **returned
  to the pickable pool** (so it can be re-added). Selection falls back to the first remaining
  collection.
- **Live preview** updates on every change to properties, order, or separator.
- **Transitions:** subtle (0.12–0.15s) on hover/border/background. The popover has **no
  entrance opacity animation** (an earlier version did and it caused the popover to render
  invisible in some capture/headless contexts — keep resting state fully opaque).

## State Management
Per the prototype's model (translate to the host's state layer):
- `collections` — array of configured collections. Each: `{ id, name, separator, inTitle[],
  available[] }` where `inTitle` and `available` are arrays of `{ name, type }`.
- `catalog` — array of not-yet-configured collections (same shape minus `id`), kept
  alphabetical. Source of the Add-collection picker.
- `selectedId` — currently-edited collection (two-pane).
- `openId` — currently-expanded collection (accordion only).
- Picker open/anchor state for the portaled popovers.
- In the real plugin: `collections`/`catalog` come from the workspace's collections +
  properties API; Save persists the `{collectionId → ordered property ids + separator}` config.

## Design Tokens
**Colors**
| Token | Value | Use |
|---|---|---|
| `--accent` | `#30CBBB` | brand accent (links, selected, primary button, chips) |
| `--bg` | `#121313` | page background |
| `--surface` | `#1b1c1c` | panel surface |
| `--surface-2` | `#232525` | inputs, hover rows, pills |
| `--surface-3` | `#2a2c2c` | popover, count badges |
| `--border` | `#2c2e2e` | hairline borders |
| `--border-2` | `#383b3b` | stronger / dashed borders |
| `--text` | `#e9eae8` | primary text |
| `--text-mut` | `#9a9d99` | secondary text |
| `--text-faint` | `#686b68` | labels, faint text |
| `--accent-soft` | `color-mix(--accent 14%, transparent)` | chip/selected bg |
| `--accent-line` | `color-mix(--accent 38%, transparent)` | accent borders |
| `--accent-text` | `color-mix(--accent 72%, white 28%)` | accent text on dark |
| primary btn text | `#08201d` | text on accent button |
| remove hover | `#ff8d7a` | destructive hover |
| preview value | `color-mix(--accent 60%, #000)` | dimmed accent for property values |

**Typography**
- Headings / collection names / buttons: **Space Grotesk** (600–700).
- Everything else (labels, chips, inputs, preview, type tags): **Space Mono** (400/700).
- Sizes: panel title 22px/700; collection name (editor) 19px/700; rail name 14px/600;
  chip 13px/700 (compact 12px); body/desc 12.5px; preview 14px; labels 10.5px uppercase
  (letter-spacing 0.14em); type tags 11px.

**Radii** — keep them **uniform**: all interactive controls (rail rows, search fields, count
badges, chips, chip-×, the `+ Add property` / `+ Add collection` buttons, Cancel/Save, Remove,
separator input, popover items) use **5px** — no pills, no one-off rounder buttons. Only the
larger container surfaces differ slightly: shell 9px, popover 7px, preview 6px. (The user
explicitly wants everything on one consistent radius.)

**Spacing:** panel max-width 920px; rail width 280px; header padding `24px 26px 18px`;
editor padding `22px 26px 28px` (compact `16px 20px 20px`); footer padding `14px 22px`.

**Shadows:** panel `0 24px 60px -24px rgba(0,0,0,0.7)` + `0 0 0 1px rgba(255,255,255,0.02)
inset`; popover `0 18px 44px -16px rgba(0,0,0,0.8)`.

**Misc:** body has a faint accent radial-gradient glow top-right
(`radial-gradient(1200px 700px at 80% -10%, color-mix(--accent 7%, transparent), transparent 60%)`).

## Assets
- **Fonts:** Space Grotesk + Space Mono (Google Fonts in the prototype). Use the host app's
  font pipeline; Space Grotesk is the brand display face per the user.
- **Icons:** all drawn inline as tiny SVGs (grip dots, ✕, +, search magnifier, ↗ arrow,
  accordion caret). Replace with the host app's icon set where equivalents exist.
- **No raster images** are used.

## Files (in this bundle)
- `Smart Titles.html` — entry point; contains the **entire stylesheet** (`:root` tokens +
  all component CSS) and loads the scripts. Read the `<style>` block for exact CSS.
- `app.jsx` — top-level app: state, two-pane + accordion layouts, rail, add-collection picker.
- `editor.jsx` — Collection Editor, property chips + drag reorder, add-property popover,
  separator, preview, and the inline SVG icons.
- `data.jsx` — seed `SEED_COLLECTIONS` (configured) and `COLLECTION_CATALOG` (pickable). Use
  as a content/shape reference; real data comes from the workspace API.
- `tweaks-panel.jsx` — the prototyping-only Tweaks shell. **Not part of the product** — ignore
  for implementation.

Open `Smart Titles.html` in a browser to interact with the reference.
