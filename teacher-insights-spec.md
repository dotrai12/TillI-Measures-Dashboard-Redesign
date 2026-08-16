# Tilli Measures — Teacher "Insights" page

Build spec for the teacher's Insights destination. **Structure, behavior, states, and copy only — apply the existing design system for all fonts, colors, spacing, and components. Do not introduce new visual styling.** This is the **teacher** view only; a separate school-leader view comes later (noted where relevant).

---

## Purpose

Insights is where a teacher goes to **sit down and think / plan** — not the quick glance-and-go of the My Garden landing. It answers three teacher questions:
1. Where is my class strong, growing, and needing focus? (and did it grow over time)
2. How do teacher / parent / student views compare, and what should I do about differences?
3. (If I teach more than one section of a grade) what's working in one class that could help another?

Guardrails that hold across the whole page:
- **Growth framing, never deficit.** No red/alarm, no "class average %," no children's names in a "needs work" list.
- **Every insight ends in an action** — almost always an Ask Tilli button. Never a bare gap statistic.
- **Data updates 3×/year** (Baseline/Pre → Midline/Mid → Endline/Post). Before a window has data, show an honest empty state, never blank dashes that look broken.
- **Keep it planning-friendly on a phone** — the teacher is often on a small screen between periods.

---

## Structure — sub-tabs, not one long scroll

Three sub-tabs. The third only exists conditionally.

1. **My class** (default)
2. **Perspectives**
3. **Compare my sections** — **only rendered if the teacher teaches 2+ sections of the same grade.** Single-section teachers never see this tab (no empty tab).

Section context (which section is active) comes from the global section picker, consistent with the rest of the app.

---

## Sub-tab 1 — My class

Top to bottom:

### a) Skill-band summary (headline — the 3 boxes)
Three grouped boxes summarizing where the class sits across the 12 skills:
- **A place to focus** — skills where most children are at Beginner level.
- **Developing** — skills where most are at Learner level.
- **Growing strong** — skills where most are at Expert level.

Rules:
- Each box shows a **count** + the **named skills** in it (list the skill names, don't just show a number).
- Box **width can flex with the count**; if a box holds **more than 3 skills, lay them out in 2 columns.**
- **No traffic-light red/amber/green.** Use the design system's growth tones; "A place to focus" is framed as opportunity, not failure.
- This is the readable **replacement for the old stacked "Class Skill Overview" bar chart** — do not also render that bar chart.
- **Naming distinct from My Garden:** the landing page sorts *children* into bands (blossoming/growing/tending). This sorts *skills*. Keep the labels clearly about skills ("Growing strong," "A place to focus") so the two band systems don't get muddled.
- This summary lives here at the top of Insights. **Remove it from / do not add it to the My Garden landing page** (the landing stays a calm doorway).

### b) Progress Over Time
- Shows each skill's proficiency across **Pre / Mid / Post** so growth is visible. The three phases must be **visually comparable** (grouped/side-by-side or a clear before→after), not a single current-value bar.
- Empty state per phase: if a window hasn't happened yet, say so plainly (e.g. "Midline opens in January") — never a bare "—".

### c) Detailed Skill Breakdown
- One card per skill, grouped by **Social-Emotional (6)** and **Cognitive (6)** via a toggle/tab.
- Each card: skill name, SEL/Cognitive tag, **Pre/Mid/Post progression**, and **Perspectives** (Teacher / Parent / Student-Direct percentages as plain text — this is where the perspective numbers live).
- Card tap → Ask Tilli about building that skill.
- Empty state: unmeasured phases show the honest "not yet" state, not blank dashes.

---

## Sub-tab 2 — Perspectives

The idea (compare Teacher / Parent / Student-Direct views) is valuable; the **radar / spider chart is retired** — teachers can't read it. Show instead:

### a) Perspective cards
- Per skill (or a compact list): the three numbers side by side — Teacher / Parent / Student-Direct — as clear labeled values. (Same numbers already shown on the skill cards; presented here for comparison.)

### b) "Worth a closer look" prompts (reframed gaps)
- Replace raw gap stats like *"Student Direct rates 34% higher than Teacher"* with a **gentle, actionable prompt**, e.g.:
  > "Your class rate themselves much higher than you do on Cognitive Flexibility. That's worth a closer look — it can mean the skill shows up differently at home or in play. **Ask Tilli why this happens →**"
- Never phrase a gap as the teacher being wrong. Frame difference as information, always paired with an Ask Tilli action.
- Keep at most the few largest, most meaningful gaps — don't list all twelve.

---

## Sub-tab 3 — Compare my sections (conditional)

**Only shown when the teacher has 2+ sections of the same grade.** Purpose: help a teacher improve her *own* practice by comparing her *own* classes — never a ranking.

Scope rules (important):
- **Her own sections only.** Never other teachers' sections.
- **Within the same grade only** (e.g. Grade 2 — A vs Grade 2 — B). Do **not** offer cross-grade comparison (comparing a Pre-K class to a Grade 1 class isn't meaningful). If she teaches sections across multiple grades, let her pick which grade to compare within; only her own sections of that grade appear.
- **No grade-average / benchmark line.** The teacher view compares her sections to *each other*, not to a norm. (Benchmarking against a grade average is a school-leader feature — later.)

Content:
- Her sections side by side across **Pre/Mid/Post**, and **skill by skill**, so she can see where one class is ahead of another.
- **Framing is curious, never evaluative.** Language like "What's working in 2B that could help 2A?" — never "your best/worst class," no leaderboard, no ranking of her own classes.
- Each notable difference ends in an Ask Tilli prompt ("Ask Tilli for an activity to bring to 2A").

---

## What is NOT on the teacher Insights page

- **Compare Sections in Grade** in the leader sense — section comparisons that include sections she doesn't teach, and the **grade-average benchmark**. These move to the **school-leader dashboard** (later).
- The **radar / Multi-Perspective spider chart** — retired for teachers.
- Any **class-average single percentage**, traffic-light red framing, or children's names in a deficit list.
- The stacked "Class Skill Overview" bar chart (replaced by the skill-band summary).

---

## States & data

- All score data is placeholder until the backend connects — build the layouts, but **every unmeasured value renders as an honest empty state**, not a blank dash or a fake number.
- Before Baseline: the whole page shows a gentle "your first insights arrive after baseline" state rather than empty modules.
- The conditional third tab keys off the teacher's own section assignments.

---

## Accessibility & responsive

- Fully responsive; mobile-first (teachers plan on phones too). Sub-tabs collapse to a scannable control on small screens.
- Multi-column skill-band boxes reflow to single column on narrow screens.
- All values distinguishable without color alone; every actionable prompt is a real button with an accessible name.
- Respect `prefers-reduced-motion`.

---

## Build order

1. Insights shell with the sub-tab switch; render tab 3 conditionally on 2+ same-grade sections.
2. **My class:** skill-band summary (count + named skills, 2-column when >3, growth tones) → Progress Over Time (Pre/Mid/Post comparable) → Detailed Skill Breakdown cards (SEL/Cognitive toggle).
3. Honest empty states for every unmeasured phase + pre-baseline whole-page state.
4. **Perspectives:** perspective cards + reframed "worth a closer look" Ask-Tilli prompts (no radar).
5. **Compare my sections:** own-sections-within-a-grade, no benchmark, curiosity-framed, Ask-Tilli on differences.
6. Responsive + reduced-motion + a11y pass.

**Done when:** a teacher opening Insights sees, in plain language, where her class is strong and where to focus (with growth she can track over time); can understand perspective differences without a radar and knows what to do about them; if she teaches multiple sections of a grade, can learn from her own classes without being ranked; and never sees a blank-looking module, a bare gap %, or anything that reads as a judgment on her or a child.
