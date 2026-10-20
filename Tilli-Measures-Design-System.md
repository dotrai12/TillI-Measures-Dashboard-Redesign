# Tilli Measures — Product Design System

**Applies to:** every dashboard surface — Teacher (`teacher.html`), School Admin (`admin.html`), Tilli Platform (`tilli.html`), Parent (`parent.html`).
**Source of truth for code:** `assets/tilli.css` (tokens + `ui-*` components). This document says *which* of those to use, *when*, and what is off-limits.
**Status:** v1.1 — 2026-10-19. Accent, title, band bar, meta text, cards, tooltips and Ask panel decided and implemented. Items still marked **⚑ Decision needed** await sign-off.

---

## 1. The one rule

> **Same job → same component → same look, on every surface.**
> Surfaces may differ in *tone* (warm vs. operational) and *density*. They may not differ in *how a band bar, a tab, a title, a KPI or a chart looks*.

If you need something the system doesn't have, add it to `tilli.css` as a `ui-*` component and use it everywhere — don't build a page-local twin (`ad-*`, `ov-*`, `mg-*` …).

---

## 2. Surface personalities

Each surface has a tone, but they share one skeleton.

| | Teacher | School Admin | Tilli Platform |
|---|---|---|---|
| Visits | Daily / weekly | 4–6× a year, before a meeting | Daily, internal |
| Tone | Warm, encouraging | Calm, plain, factual | Operational |
| Garden illustration | Yes (landing, garden, beds, empty states) | No illustration of plants/gardens | No |
| Emoji in copy | Sparingly (see §9) | None | None |
| Signature visual | Garden scene | **Band bar + headline number** | Tables |
| Max content width | 1080px (see §5) | 1080px | 1180px |

**What "no metaphor" on admin means:** no plant/garden *illustration* and no garden *verbs* ("tend", "plant", "bloom across the year"). It does **not** mean no graphics. Every admin screen still needs a visual anchor (§7).

---

## 3. Colour roles

Colour is semantic. A colour may only mean one thing per screen.

| Role | Token | Means | Never use for |
|---|---|---|---|
| Primary action / "on" state | `--green-500` / `--green-700` | Buttons, active nav, selected tab | Decoration |
| Band 1 (lowest) | `--lvl-1` (cyan) | Sprouting / Emerging | Buttons, links, chips that aren't about band 1 |
| Band 2 | `--lvl-2` (amber) | Growing / Developing | Warnings |
| Band 3 | `--lvl-3` (green) | Blooming / Secure | — |
| Perspectives | `--persp-teacher/parent/student` | Teacher / parent / child viewpoint | Anything else |
| Status | `--status-*` | Done / in progress / pending | Bands |
| Warning / danger | `--warn-*` / `--danger-*` | Problems needing action | "Needs focus" skills (those are band colours, not alarms) |
| Info / time | `--wash-cyan` + `--cyan-700` | Cadence chips, info notes | — |

**Hard rules**
- **Bands use `--lvl-*` only.** No `STATE_DOT` blush pink for Blooming, no green-500 for Growing. One band = one colour on every screen, legend, dot, flower petal and chart.
- **Page accent — decided 2026-10-19:** one green `--accent` set on every surface (admin's cyan override removed; cyan = Sprouting). Selected / hover / link states use `--accent`, `--accent-wash`, `--accent-ink`.
- **Secondary text — decided 2026-10-19:** sub-lines, notes, counts and eyebrows use `--text-meta` (= `--ink-450`, passes AA). `--text-faint` (`--ink-300`) is only for chevrons, separators, placeholders and disabled/locked states.
- **Chart series** (when a chart isn't showing bands) use `TilliPalette.GROWTH` in order. Never pick ad-hoc hex values in a renderer.
- **Washes** (`.ui-card.tint-*`) mark the two landing "doorway" cards, same on teacher and admin: **green** = the current check-in window card, **cyan** = the next-step / idea card. Headcount or band-mix strips use `.ui-card.sm.subtle` (grey). No other tinted cards.

---

## 4. Typography

Fonts: **Quicksand** for headings, **Montserrat** for everything else. Sizes come only from the 6-step `--fs-*` scale. No `font-size: Npx` in CSS or inline styles (SVG text attributes excepted, and those must use 11 or 13).

**Weights: 500 / 600 / 700 only. No ExtraBold (800) or Black (900) anywhere** — CSS, inline styles, SVG `font-weight` attributes — unless a design note explicitly calls for it. Bold emphasis (`<b>`, names, links, numbers) is 700. Google Fonts loads Montserrat at 500;600;700 only.

| Element | Class | Size | Colour |
|---|---|---|---|
| Page title | `.ui-screen-title` | `--fs-2xl` (32) | `--ink-900` |
| Page subtitle | `.ui-screen-sub` | `--fs-md` | `--ink-450` |
| Greeting (landing only) | `.ui-screen-title.greet` *(new)* | `--fs-2xl` | `--green-700` |
| Card / module title | `.ui-mod-title` | `--fs-lg` | `--ink-900` |
| Module note | `.ui-mod-note` | `--fs-sm` | `--ink-300` |
| Headline number | `.ui-kpi .num` | `--fs-2xl` (one hero per screen may use `.ui-kpi.hero` *(new)* = 48px) | `--ink-900` |
| Eyebrow | `.ui-eyebrow` | `--fs-xs` | `--ink-300` |
| Body | — | `--fs-md` | `--ink-600` |

- **Only the landing greeting is green** (`.ui-screen-title.greet`, teacher My Garden + admin Overview). Every other page title is ink.
- **One page-title component** — `.ui-screen-title` at `--fs-2xl` on every surface (`.dash-h1`, `.mg-hello`, `.ov-hello` retired). `.ui-screen-sub` carries the gap below the head; add `.flush` when the parent layout spaces it.
- **Card / section titles:** `.ui-title` (= `.ui-mod-title`, 18) · `.ui-title.md` (15) · `.ui-title.xl` (24). Meta lines: `.ui-meta` (13) / `.ui-meta.xs` (11).

---

## 5. Page anatomy

Every dashboard screen, on every surface, is built in this order:

```
Header (ui-header)       school · context            [scope chips / year]
──────────────────────────────────────────────────────────────────────
Page title + subtitle    (ui-screen-title / ui-screen-sub)
Primary tabs             (ui-filterchip.dark)                    optional
Hero module              ONE thing to look at first — number + visual
Supporting modules       cards, max 2 per row on desktop
```

- **Content width:** `--content-max` (1180) for every screen; landings (teacher My Garden, admin Overview) use `--content-narrow` (860, `.ui-narrow`). Page padding comes from `--page-pad-y` / `--page-pad-x` (28/40 → 22/26 ≤1023px → 16 ≤640px).
- **Grid:** 1 or 2 columns on desktop, 1 column at ≤760px. No 3-level layouts.
- **Gaps:** `--page-gap` between modules, `--space-4` inside cards.

---

## 6. Component catalogue — use this, not that

| Job | Use | Don't |
|---|---|---|
| Container | `.ui-card` (24px radius) for page-level modules; `.ui-card.sm` (16px) for compact / list cards. No 20px cards. Tints: `.tint-green/-cyan/-yellow` | Page-local cards that restyle the same box |
| Selectable card / option | `.ui-pick` (+ `.on`): 1.5px border selected or not, green + wash when on | Per-screen selected borders (1px / 2px / ring) |
| Checkbox square | `.ui-check` (+ `.on`) | — |
| Grey inset (note / outcome / quote inside a card) | `.ui-inset` | Hand-rolled surface-100 boxes |
| Hover tooltip | `.ui-tooltip[data-tip]` (+ `.help`, `.down`, `.end`, `.hover-only`) — 11px dark bubble, opens on hover **and** focus (tap on touch) | `.ad-tip`, `.hist-tip` |
| ⓘ affordance | `.ui-info` (15px, inline) / `.ui-info.lg` (24px tap target) | Three different ⓘ circles |
| Icon tile | `.ui-icontile` (round, `--icon-tile`; `.lg` 64, `.xl` 92) | Square vs round tiles for the same icon |
| Avatar | `.ui-avatar`; colour from `--avatar-bg/-fg` (teacher pink, admin green) | Page-local avatar classes |
| Floating Ask Tilli chat | `.ask-panel` + `.ask-*` in tilli.css (user bubble = `.ask-msg.user`) | Per-page chat styles |
| Card inside a card | **Not allowed.** Use a divider, a list, or a `.ui-card.subtle` *sibling* | `.ui-card > .ad-gradebreak > .ad-gs` (3 levels deep) |
| Primary tabs / view switch | `.ui-filterchip.dark` (black pill) | Dropdowns for 2–4 options; `.ui-seg` and `.ui-tabs` (to be retired) |
| Scope picker (section / grade) | Header `.ui-filterchip.solid` chips; dropdown only for >5 options | — |
| Filter | `.ui-filterchip` (`.sm` for small name pills; `aria-pressed="true"` = `.on`) | Custom chip styles (`.tip-chip`, `.ov-chip`, `.ov-stu` retired) |
| Status label | `.ui-chip` (ok / warn / info / muted) | Coloured text alone |
| Band label | `.ui-badge.lvl-1/2/3` | Plain coloured words |
| Assessment-point label | `.ui-chip.info` with ⓘ tooltip — "Endline", "Endline · in progress" | Two different cadence designs |
| Headline number | `.ui-kpi` | Ad-hoc big text |
| Progress toward a target | `.ui-meter` | Rings, except the window ring on Assess |
| Notes / banners | `.ui-note` (+ ok / info / warn / danger) | Tinted boxes with custom borders |
| Empty state | `.ui-empty` + one illustration (teacher) or icon (admin) + one action | Text-only empty cards |
| Table | `.ui-table` in `.ui-tablewrap` | — |
| Section navigation | `.ui-crumbs` on admin; `← Back` link on teacher | — |

---

## 7. Data visualisation (shared modules)

These are **one implementation each**, living in a shared file and taking a `scope` (`student` / `section` / `grade` / `school`). Today teacher and admin each draw their own, and they look different.

| Module | Shows | Form |
|---|---|---|
| **Band bar** | Mix of bands for a group | `.ui-bandbar` — pill, 100% stacked, `--lvl-*`; 14px (`--bandbar-h`) everywhere, `.hero` 22px for the one hero bar per screen; legend once per card |
| **Skill rows** | Band bar per skill | Skill name · `.ui-bandbar` · status word (`.ui-bandword.lvl-n`, ink tone, no dot) · chevron. Same on Teacher Insights and Admin Compare |
| **Progress over time** | Change across Baseline → Midline → Endline | Line chart, band-zone background (Sprouting / Growing / Blooming), `GROWTH` palette for series, ≤3 series |
| **Strengths / focus** | Top 2 and bottom 2 skills | Two lists side by side with band dots — a list, not tinted boxes |
| **Perspectives** | Teacher vs parent vs child | `--persp-*` colours; never shown to admin roles as scores (spec §9) |

**Visual-anchor rule:** every screen has at least one graphic (chart, bar, meter, illustration) above the fold. Screens that are only text and buttons (today: admin Reports, History, Roster) get a band-bar summary, a preview thumbnail, or a status meter.

---

## 8. Illustration & icons

- **Teacher:** garden art comes only from `flowerArt()` (flower-band.js). Retire `plantSVG`. One plant style per state: Blooming → flower, Growing → tulip, Sprouting → sprout.
- **Admin / Platform:** no plant art. Icons are the line-icon set already used in the nav (`ICONS` / `NAV_ICON` — merge into one shared set). Empty states use a 48px icon in a pale accent circle.
- **Icons are never emoji** in buttons. Use the line-icon set (history, download, preview, etc.).

---

## 9. Copy & density

- **Density budget per module:** one title, one note (≤ 1 sentence, ≤ 15 words), then the visual. Anything longer goes behind an ⓘ tooltip.
- **Page subtitle:** one sentence.
- **Numbers before words.** Lead with the figure, then explain it.
- **Teacher emoji:** at most one per heading, never in buttons, never in data labels. Perspective labels use the person icon + word, not 👩‍🏫 🏠 🧒 alone.
- **Admin:** no emoji, no exclamation marks, no encouragement (spec §5.1).
- **Privacy lines stay** even though they add words ("Groups only — no individual children"). They earn trust; keep them short.

---

## 10. Band vocabulary

**⚑ Decision needed.** The admin spec forbids the garden metaphor, but admin currently shows **Sprouting / Growing / Blooming** (`admin-data.js:43-45`). Options:

1. **One vocabulary everywhere** (Sprouting / Growing / Blooming) — best for consistency; principals and teachers talk about the same thing.
2. **Neutral on admin** (Emerging / Developing / Secure), garden on teacher — matches the spec, but the same chart says different words on two screens.

Whichever wins, the *colours* (`--lvl-*`) and *order* never change.

---

## 11. Checklist for any new screen or PR

- [ ] Uses `.ui-screen-title` + `.ui-screen-sub`; title is ink (unless landing greeting `.greet`)
- [ ] No hex values or one-off shadows/scrims in page CSS — tokens only (`--*-line`, `--scrim`, `--shadow-*`, `--text-meta`)
- [ ] One hero module with a number **and** a visual
- [ ] No card nested inside a card
- [ ] Bands drawn with the shared band-bar / skill-row modules and `--lvl-*` only
- [ ] Tabs are `.ui-filterchip.dark`
- [ ] All font sizes from `--fs-*`; no inline `max-width` / `font-size`
- [ ] Each module's note is one short sentence
- [ ] Works at 375px (one column, bottom nav, no sideways scroll)
