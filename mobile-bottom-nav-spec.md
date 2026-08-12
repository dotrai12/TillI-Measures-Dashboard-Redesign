# Tilli Measures — Mobile bottom navigation bar

Build spec for the teacher dashboard's mobile navigation (web app, runs in a mobile browser). **Structure and behavior only — apply the existing design system for all fonts, colors, spacing, and tokens. Do not introduce new visual styling.**

---

## What this is

A fixed bottom tab bar for the phone/narrow-viewport layout of the teacher dashboard. Five destinations, with **Ask Tilli raised and highlighted in the center**. Above the content sits a **sticky section picker** (not part of the nav bar, but specified here because they work together).

Applies at the mobile breakpoint only. On tablet/laptop/desktop the navigation becomes the side rail / sidebar as already defined — this bar is the small-screen form.

---

## The five destinations

Left to right:

| Position | Label | Destination | Icon (use design-system equivalent) |
|---|---|---|---|
| 1 | My | Home / garden glance — who needs attention now | plant / sprout |
| 2 | Students | Full roster, searchable → student detail | people |
| 3 | **Ask Tilli** (center, raised) | Opens Ask Tilli chat | spark / sparkles |
| 4 | Assess | Enter and track observations | clipboard-check |
| 5 | Insights | Growth, perspectives, compare sections | bar chart |

Notes:
- **"Assess" merges the old "Observations" + "Completion" tabs** into one destination. Inside Assess: sub-tabs for To-do / Enter / Completed (progress view at top, entry one tap in). Do not ship Observations and Completion as separate tabs.
- Use one consistent name per destination across the whole app. If the current build says "Analysis," rename to "Insights" everywhere for consistency.

---

## Center Ask Tilli button — rules

The center item is deliberately different from the other four. It is an **action**, not a place, and should read as the app's primary "get help / do something" affordance.

1. **Raised above the bar.** The circular button sits higher than the row (negative top margin / overlaps the top edge of the bar), matching the common center-action pattern.
2. **Keep the text label.** Show "Ask Tilli" beneath the circle. Do not rely on the icon alone — teachers are not all tech-savvy and must be able to read what it is.
3. **One tap opens Ask Tilli directly.** No radial menu, no fan-out of options. Tap → Ask Tilli chat opens (full-screen sheet on mobile).
4. **It is the only highlighted element in the bar.** The center button carries the accent treatment. The other four tabs must not compete — the active tab among them shows its state with a subtle/quiet treatment (e.g. label weight or a soft fill), never the same strength as the center button. If two elements shout, neither reads.

---

## The other four tabs — behavior

- Icon above, text label below. Label always visible (no icon-only tabs).
- Exactly one of the four shows an "active/current" state at a time, quietly.
- Whole tab is tappable, not just the icon.
- Tapping the already-active tab scrolls that view to top (nice-to-have).

---

## Section picker (sticky top bar) — works with the nav

The section picker is **not** in the bottom bar (it changes *what you're viewing*, not *where you are*), but it must be present for the mobile layout to work.

- Sticky to the top of the viewport; persists across all five destinations and survives scroll.
- A horizontal, scrollable row of section chips (teacher may have up to ~6 sections). Selected chip clearly marked; one tap to switch.
- Must be obvious and easy — always visible, no menu to open, no hidden gesture.

---

## Layout & accessibility requirements

- **Fixed to the bottom of the viewport**, above content, across all five destinations.
- **Use `100dvh` (dynamic viewport height), not `100vh`,** so the bar is never hidden behind the mobile browser's address bar as it shows/hides on scroll.
- Respect the bottom **safe-area inset** (`env(safe-area-inset-bottom)`) so the bar clears the iOS home indicator.
- Every tap target ≥ 44px.
- Semantic `<nav>` with an accessible label; each item a real link/button with an accessible name (icon-only is not enough — labels are present anyway).
- Active tab exposed to assistive tech (e.g. `aria-current="page"`).
- Respect `prefers-reduced-motion` for any press/scroll animation.
- Distinguish the center button from the others by shape + position, not color alone (colorblind-safe).

---

## Responsive behavior

- **Mobile (narrow viewport):** this bottom bar + sticky section picker.
- **Tablet / laptop / desktop:** hide the bottom bar; navigation reverts to the side rail / sidebar already defined for those breakpoints. Same five destinations, same labels, same order intent.
- Nothing here is native-app-only — it is standard HTML/CSS/JS and runs in a mobile browser with no install. (Optional, later: a PWA manifest so teachers can "Add to Home Screen" for an app-like, address-bar-free feel — additive, not required now.)

---

## Build order

1. The five-item bar structure with the four flat tabs + center raised button (label under each).
2. Wire routing: each tab switches destination; center opens Ask Tilli chat sheet.
3. Active-state logic (one quiet active tab; center always the accent).
4. Sticky section picker above content.
5. `100dvh` + safe-area + reduced-motion + a11y pass.
6. Confirm the desktop side-rail still renders above the mobile breakpoint and the bar is hidden there.

**Done when:** on a phone browser, a teacher sees five clearly-labeled destinations with Ask Tilli obvious in the center, can switch section in one tap from a always-visible top row, and the bar never hides behind the address bar or home indicator.
