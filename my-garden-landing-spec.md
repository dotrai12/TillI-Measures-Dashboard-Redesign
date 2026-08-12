# Tilli Measures — "My Garden" landing page

Build spec for the teacher's landing page (the first screen after sign-in). **Structure, behavior, states, and copy only — apply the existing design system for all fonts, colors, spacing, and components. Do not introduce new visual styling.**

---

## The core idea (read this first)

Measures data updates **only 3 times a year** (Baseline → Midline → Endline). So this page is **not a live dashboard** — a teacher who opens it in an unchanged week must not feel there was no point.

Its real job: be a calm **doorway** to the two things teachers actually come for — **Ask Tilli** and **doing an assessment** — plus **one fresh idea each visit** so periodic check-ins feel worthwhile. The garden is the *feeling*; Ask Tilli, the open assessment window, and the weekly idea are the *reasons to return*.

Design principles that must hold on every state:
- **Lead with what they came for.** If an assessment window is open, it's the hero. If not, Ask Tilli is the hero.
- **Never fake change.** The scores/garden only move 3×/year — when they don't change, the page says so honestly and leans on the weekly idea instead.
- **Growth first, never deficit.** No red alarm framing, no "class average %," no children's names in a "needs work" list. Strengths and progress lead; the few children who need attention appear gently, with an action.
- **Every insight ends in an action** — almost always an Ask Tilli button.

---

## Page structure (same skeleton on every state)

Top to bottom:

1. **Greeting + section context** — "Good morning, [name]" and a one-line season note ("Your Grade 1 — A garden · week 14"). Section switching is handled elsewhere; just show the active section.
2. **Garden scene** — an illustrated garden representing the class. This is the calm frame, not the data. Its maturity reflects the current window (seedlings → growing → full bloom). It changes only across the 3 windows; when it hasn't changed, that's fine.
3. **Caption** — one short line naming the "season" (see per-state copy).
4. **Celebration line** (conditional) — only shown when the garden has genuinely moved since the last window (Midline, Endline). Absent at Baseline and between windows.
5. **Band mix** (conditional) — three counts (Blossoming / Growing / Ready to tend) that sum to the class size. This is the *one explainable number* that replaces any "average %." Hidden at Baseline (no prior data).
6. **Hero — "Do what you came for"** — context-aware (see State logic below).
7. **This week's idea** — one small, doable SEL activity or reflection prompt + an "Ask Tilli for more" button. **Rotates weekly**, independent of the data. This is the primary return lever between windows.
8. **Who could use you** — max 3 "tend" cards: a child's first name, a plain-language reason, and an action button. Honestly labeled as slow-changing. Empty state at Baseline.
9. **Quiet doorways** — small entry points to Ask Tilli, Students, Insights.

---

## State logic — 4 states

The page renders one of four states based on **whether an assessment window is open** and **which window it is**.

### A · Baseline (start of year, window open)
- Garden: seedlings only — there is no prior data.
- Caption: "Freshly planted — this is where the year begins."
- Celebration line: none.
- Band mix: hidden. Show instead: "24 children, ready to begin their year."
- **Hero = the open Baseline window:** title "Baseline is open"; blurb "Set the starting point for all [N] children — the garden they grow from."; progress ("[done] of [N] children done") with a progress indicator; deadline line; primary button "Continue → next: [student name]".
- This week's idea: present (e.g. a feelings check-in prompt).
- Who could use you: **empty state** — "Once baseline is in, this is where the 2–3 children who could use a little extra will appear." (No tend data can exist yet.)

### B · Between windows (most of the year, NO window open)
This is the most common state and the one that proves the concept.
- Garden: the most recently measured maturity (static). 
- Caption must be honest: "Your garden is resting — scores next update at [next window]."
- Celebration line: none.
- Band mix: shown, labeled as last-measured ("Last measured at baseline · [N] children").
- **Hero = Ask Tilli** (not an assessment). Title "Ask Tilli"; blurb "Your teaching changes every day — even when the scores don't."; then 2–3 tappable pre-filled starters, e.g.:
  - "An activity for a restless class"
  - "Help me plan tomorrow's lesson"
  - "A calm-down idea for one child"
- This week's idea: present — the main fresh thing on this state.
- Who could use you: shown, but honestly labeled as unchanged ("Unchanged since [last window] — the same [n] could use a little extra").

### C · Midline (mid year, window open)
- Garden: grown — taller plants, some blossoms.
- Caption: "Growing season — your garden has moved since baseline."
- **Celebration line: present** — "[n] of your plants have grown since baseline." (This is the earned, rare payoff of the 3×/year rhythm — make it feel good.)
- Band mix: shown, full class.
- **Hero = the open Midline window:** title "Midline is open"; blurb "See how far your class has come since baseline."; progress + deadline + "Continue → next: [student]".
- This week's idea: present.
- Who could use you: shown; typically shorter than baseline (growth is visible) — label the change ("Down from [x] at baseline").

### D · Endline (year end, window open)
- Garden: full bloom — the richest, warmest state.
- Caption: "Full bloom — the end of this year's journey."
- **Celebration line: present and biggest** — "[n] plants blossomed across the whole year."
- Band mix: shown, full class, framed as the year's story.
- **Hero = the open Endline window:** title "Endline is open"; blurb "The final check-in — capture how far every child has travelled."; progress + deadline + "Continue → next: [student]".
- This week's idea: present (e.g. a celebrate-growth prompt).
- Who could use you: usually shortest — ideally down to 1, framed as progress ("Just one now — down from [x] at baseline. Look how far they've come.").

---

## Component behavior

- **Garden scene:** illustration only, represents the class at the current maturity. Does not need to map 1:1 to individual children. Purely presentational. Reflects window maturity via which asset/variant is shown.
- **Celebration line:** render only when `grew_since_last_window > 0`. Never fabricate.
- **Band mix:** three integers that sum to class size; the single "number a teacher could explain to a parent." No decimals, no percentages-of-unknown.
- **Hero:** a single slot whose contents are decided by state (window-open → that window's assessment CTA; no window → Ask Tilli). The "Continue" button routes into the assessment entry flow at the next ungraded student. Ask Tilli starters open Ask Tilli pre-filled with that prompt.
- **This week's idea:** rotates on a weekly cadence regardless of assessment data. Pulls from a content set (ideally themed to the class's current growth areas). "Ask Tilli for more" opens Ask Tilli with the idea as context. Treat the content source as pluggable — the rotation is the point.
- **Tend cards:** max 3. First name + plain-language reason (never a skill code or jargon, never a score) + an Ask-Tilli action. Slow-changing; always honestly labeled with how they've changed since the last window. Never render children's names in a red/deficit list; this gentle card is the only place a struggling child is named, and always paired with an action.
- **Quiet doorways:** low-emphasis links to Ask Tilli, Students, Insights. The charts/roster live in Insights/Students — not on this landing page.

---

## What must NOT be on this page

- No "class average %" or any single undefined percentage.
- No red / alarm / deficit framing anywhere.
- No children's names in a "needs work" or "areas for growth" list (only the gentle tend cards).
- No stacked skill bar charts or the full student roster — those belong in Insights and Students.
- No streaks, badges, or "you haven't visited in N days" guilt. Periodic, useful check-ins are the goal — not forced daily engagement.

---

## Accessibility & responsive

- Fully responsive across phone, tablet, laptop, and large screens; mobile-first (teachers are often on phones, in a browser).
- All actions are real buttons/links with accessible names; the hero's primary action is reachable without scrolling on mobile where possible.
- Respect `prefers-reduced-motion` for any garden/idle animation.
- Band-mix states must be distinguishable without color alone.

---

## Build order

1. The page skeleton with the 9 slots and the 4-state switch (mock the "current window" as a prop/flag first).
2. Hero slot: window-open assessment CTA **and** the Ask-Tilli variant; wire routing.
3. This-week's-idea component with weekly rotation (stub the content source).
4. Tend cards (max 3, plain-language, empty state for Baseline).
5. Garden scene variants per window maturity + conditional celebration line + band mix.
6. Quiet doorways + responsive + reduced-motion + a11y pass.

**Done when:** a teacher opening this in an unchanged week still finds a reason to be here (Ask Tilli + a fresh idea), an open assessment window is impossible to miss, the garden celebrates real growth only when it happens, and nothing on the page could embarrass a teacher if a parent glanced at it.
