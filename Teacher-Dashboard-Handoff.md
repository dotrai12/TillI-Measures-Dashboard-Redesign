# Teacher Dashboard — Handoff for Mayur

**What this is:** everything in the new teacher dashboard sample — every screen (with screenshots), the rules behind what each screen shows, colours and wording, and a clear list of what you need to build or connect.

**What "new" means here:**
| | Version |
|---|---|
| **Deployed today** (`origin/main`) | commit `fa94671` |
| **New sample** | commits `0124c72` + `ad70135`, plus the latest uncommitted fixes in `assets/teacher-dashboard.js` (phone layout fixes made while taking these screenshots) |

The sample runs on **demo data in the browser** (generated scores + `localStorage`). Anything marked **[DB]** has to come from the real database.

**Related file:** [Teacher-Dashboard-Tasks.md](Teacher-Dashboard-Tasks.md) — the task-by-task tracker with the decision log (T1–T19).

---

## Contents
1. [What changed vs. the deployed version](#1-what-changed-vs-the-deployed-version)
2. [How to run the sample](#2-how-to-run-the-sample)
3. [Navigation](#3-navigation)
4. [Screens and features](#4-screens-and-features)
5. [The rules — "if this, then show that"](#5-the-rules--if-this-then-show-that)
6. [Colours and type](#6-colours-and-type)
7. [Words we use (and don't)](#7-words-we-use-and-dont)
8. [**For Mayur — what to build and connect**](#8-for-mayur--what-to-build-and-connect)
9. [Open product decisions](#9-open-product-decisions)
10. [Which file does what](#10-which-file-does-what)

---

## 1. What changed vs. the deployed version

| Area | Change | Task |
|---|---|---|
| **Levels** | One scale everywhere: **Sprouting → Growing → Blooming** (teacher, parent PDF, parent page, school admin, platform admin). Observation rating adds **Seed** below Sprouting (rating screen only). "Not assessed yet" for no data. Same cut-offs everywhere: 34 / 67. | T1 |
| **Observations** | **21 questions per child, 6 per page**. Every tap is saved; an interrupted child resumes on the right page. | T2, T13 |
| **Wording** | Softer child labels ("Sprouting · Attention next", "Next to practise", "N children could use a little extra"). | T5 |
| **Windows** | **Baseline / Midline / Endline** everywhere. Dates instead of week numbers. CSV columns use the new names. | T6 |
| **Skill groups** | **Social-Emotional** and **Cognitive** everywhere. | T7 |
| **Assess** | Journey first; tap the open step → "who's still to do" screen. Tracker is one screen ("Done so far") with real completion dates; tap a child → their all-windows timeline. | T8, T12 |
| **Garden** | Phone tab "Garden"; home garden picture opens the class garden; back links fixed. | T9 |
| **Insights** | Overview boxes say "N skills · Mostly [level]". ⓘ explanations next to scores. | T10, T11 |
| **Journey** | Check-ins removed; pre/post-training surveys stay required. | T14 |
| **Perspectives** | List first with Teacher / Parent / Student written out; radar chart folded away. | T15 |
| **Phone** | Hover tooltips → tap an ⓘ on touch devices. | T16 |
| **Parent reports** | Preview a report on screen before downloading. | T17 |
| **Parent reminders** | "Parents still to finish" list + copyable reminder messages. | T18 |
| **Not changed** | First-time setup — everything stays required. | T19 |
| **Parked for later** | T3 (replace hardcoded data), T4 (hide the Preview-state switch). | T3, T4 |

---

## 2. How to run the sample

- Serve the folder with any static server and open `teacher.html?school=Little%20Sprouts%20School&email=<teacher email>`.
- A new email runs the **first-time setup**; once done, the dashboard opens.
- **Preview state** (top-right box, internal only): switches the whole dashboard between **Baseline / Between / Midline / Endline** so every state can be reviewed. Not for teachers — see T4.
- The **section chips** at the top (All · Kindergarten A · Kindergarten B) scope every page to one class.

---

## 3. Navigation

| Desktop / tablet | Phone (< 640 px) |
|---|---|
| Left sidebar: **My Garden · Students · Ask Tilli · Assess · Insights**, profile at the bottom. Tablet shows icons only. | Bottom bar: **Garden · Students · (Ask Tilli, raised centre) · Assess · Insights**. |
| Floating Ask Tilli bubble opens a side chat. | No bubble — the centre tab opens Ask Tilli full screen. |
| Hover shows tooltips. | Tap an **ⓘ** for the same tooltip (touch devices, detected with `@media (hover: none)`). |

Section chips (top) stay on every page except Profile and Ask Tilli.

---

## 4. Screens and features

### 4.1 First-time setup (one time, all required)

| | |
|---|---|
| ![Setup intro](handoff-screens/01-setup-intro.jpg) | ![About you](handoff-screens/02-setup-about-you.jpg) |

![Reflection](handoff-screens/03-setup-reflection.jpg)

- **4 "about you" steps:** About you · School (pre-filled, school locked) · Grades and sections · Classroom (subjects, resources). **Next** stays disabled until every field is filled.
- **Reflection:** 10 questions (1–5 scale, one choice question, two written). Every answer required. Questions come from the reflection bank (`TilliAPI.getReflectionConfig`) so Masoomi / Ishani can edit them without a rebuild.
- **Add students:** pre-filled from the school roster; "Enter my garden" stays disabled until the list is valid.
- Nothing can be skipped or done later (T19).

### 4.2 My Garden — home screen (changes with the window state)

| Baseline | Between |
|---|---|
| ![Baseline](handoff-screens/04-garden-baseline.jpg) | ![Between](handoff-screens/05-garden-between.jpg) |
| **Midline** | **Endline** |
| ![Midline](handoff-screens/06-garden-midline.jpg) | ![Endline](handoff-screens/07-garden-endline.jpg) |

From top to bottom:
1. **Greeting** ("Good morning/afternoon/evening, [first name]") + "Your [class] garden".
2. **Garden picture** — tappable, opens the class garden. "See each child's plant →" link underneath.
3. **Caption** for the state (e.g. "Your garden is resting — scores next update at Midline (Jun 18)").
4. **Celebration line** — only when children genuinely grew (see rules).
5. **Level mix** — Blooming / Growing / Sprouting counts (+ "Not assessed yet" if any). Hidden at Baseline.
6. **"Do what you came for"** — only when a window is open: progress bar, "X of N children done", "Window closes [date]", **Continue → next: [name]** (goes straight into that child's questions).
7. **This week's idea** — rotates weekly, with "Ask Tilli for more".
8. **Who could use you** — up to 3 children, each with "Ask Tilli for an idea".

### 4.3 Class garden and All classes

| Class garden | All classes |
|---|---|
| ![Class garden](handoff-screens/08-class-garden.jpg) | ![All classes](handoff-screens/09-all-classes.jpg) |

- **Class garden:** one plant per child (hover / tap ⓘ for name, level, skill counts, "View [name] →"; tap the plant to open the child). Legend, "N children could use a little extra" cards, Garden highlights (2 strongest skills), Growing areas (3 weakest skills, each with "Ask Tilli for a class activity").
- **All classes** (only linked when the teacher has 2+ sections): one bush per section; tap a bush → pop-up listing every child with "Good at / Next to practise" → "Open [class] garden". "Plant a new bush" adds a class.

### 4.4 Students

| Students list | Child — Overview |
|---|---|
| ![Students](handoff-screens/10-students-list.jpg) | ![Overview](handoff-screens/11-student-overview.jpg) |
| **Child — Skills** | **Child — Perspectives** |
| ![Skills](handoff-screens/12-student-skills.jpg) | ![Perspectives](handoff-screens/13-student-perspectives.jpg) |

![History](handoff-screens/14-student-history.jpg)

- **List:** search, sort by State / Name / Growth, UID chip, level line, skill counts per level. Buttons: 🕘 History, ☑ Parent reports, + Add students.
- **Child header:** name, class, parent email, Student UID, skill counts, previous classes, ✎ Edit (name + UID, UID must be unique), history clock.
- **Overview:** "Something that grew", "Start by focusing on", overall growth line (Baseline · Midline · Endline).
- **Skills:** "How skills are scored ⓘ", 12 skill cards in two groups, each with Base / Mid / End bars, Teacher / Parent / Student %, Ask Tilli.
- **Perspectives:** all 12 skills, biggest difference first, Teacher / Parent / Student values written out, "Worth a conversation" badge, radar chart folded under "See it as a chart".
- **History:** across the years (trend + skill-by-skill table + handover notes) and this year's rows (**this year's rows are hardcoded — T3**).
- A child with no data shows only "No assessment data yet → Start baseline for [name]".

### 4.5 Assess

| To-do — the journey | Who's still to do |
|---|---|
| ![Journey](handoff-screens/15-assess-journey.jpg) | ![Still to do](handoff-screens/16-assess-still-to-do.jpg) |

![Observation page](handoff-screens/17-observation-page.jpg)

| Done so far (+ parent reminders) | Child timeline |
|---|---|
| ![Done so far](handoff-screens/18-done-so-far.jpg) | ![Timeline](handoff-screens/19-child-timeline.jpg) |

- **To-do tab — the journey:** Pre-training survey → Baseline observations → Post-training survey → Midline observations → Endline observations. Each step Complete / Active / Locked.
- **Tap the open window's step** → **Who's still to do**: started children first ("Started · 9 of 21" → Continue), then "Not started" → Start, a "Start with [next] →" shortcut, search when > 8 children, "Done (n)" folded. Between windows: "🌿 Nothing to observe right now. Midline opens Jun 18."
- **Observation:** 21 questions, 6 per page (6·6·6·3). Each card: question number, group, skill, behaviour, 4 options **Seed / Sprouting / Growing / Blooming**. "Next page →" disabled until the page is answered ("3 left on this page"). Last page: "Finish → next child". One dot per question; "Page 2 of 4 · 9 of 21 answered"; class progress "X out of N completed · Y pending".
- **Done so far tab:** window cards (ring X/N, "N still to go" or "🔒 Not deployed yet"), **parents still to finish** box, table of each child × Teacher / Parent (Home) / Student parts (e.g. 1/2) with ✓ and the real completion date, "Your classes at a glance" (2+ sections only), History, Download CSV.
- **Tap a child's row** → their timeline across all three windows with "Done · [real date]", "In progress", "Waiting", or "🔒 Not open yet", and Start / Continue on the open window only.

### 4.6 Insights

| My class — overview | My class — growth + every skill |
|---|---|
| ![Overview](handoff-screens/20-insights-overview.jpg) | ![Growth](handoff-screens/21-insights-growth.jpg) |
| **Perspectives** | **Compare my sections** |
| ![Perspectives](handoff-screens/22-insights-perspectives.jpg) | ![Compare](handoff-screens/23-insights-compare.jpg) |

- **Class Skill Overview ⓘ:** 3 boxes ("1 skill · Mostly Sprouting", …) that filter the list; each skill row = a stacked bar of how many children are at each level + the majority level; tap a row → the children in each level + "Ask Tilli how to build [skill]".
- **Growth over time ⓘ** (only from Midline on): one line chart, filter Overview / Social-Emotional / Cognitive / one skill; Table view toggle; "Endline opens Sep 24" note.
- **Every skill, up close:** Base / Mid / End per skill, tap for a Tilli idea.
- **Perspectives ⓘ:** "Worth a closer look" (biggest gaps, reframed as a conversation) + every skill × three viewpoints.
- **Compare my sections:** only when the teacher owns 2+ sections in the same grade. Never across grades, never another teacher's class, no benchmark.
- Before Baseline is in, Insights shows the overview on clearly labelled **sample** data.

### 4.7 Parent reports

| Select children | Preview |
|---|---|
| ![Select](handoff-screens/24-parent-reports-select.jpg) | ![Preview](handoff-screens/25-parent-report-preview.jpg) |

- Students → ☑ Parent reports → select children → **👁 Preview** (one report at a time, ‹ / ›) or **⬇ Download PDFs** (one A4 PDF per child).
- Report sections: Hello [child]'s family · 01 How we look (3 lenses + level meanings) · 02 The 12 skills · 03 [Child]'s skill levels · 04 Snapshot summary · 05 What you can do at home (tips for the 4 lowest skills).

### 4.8 Profile and Teaching Mirror

![Profile](handoff-screens/26-profile-mirror.jpg)

- Details from setup (editable via ✎ Edit details — currently hidden under the Preview-state box, see 8.4), grades taught, join date.
- **Teaching Mirror:** average of the teacher's 1–5 answers per category (Mindsets, SEL Competencies, Practices, Climate, Wellbeing), timeline of reflections with ▲/▼ change vs the previous one. A **sample** "After training" mirror shows until the real post-training survey is taken.

### 4.9 Ask Tilli

![Ask Tilli](handoff-screens/27-ask-tilli.jpg)

Full screen (nav) or side panel (bubble). Chat history, "Answering about" class scope, starter prompts. Many cards elsewhere open Ask Tilli with a pre-written prompt (e.g. "Ask Tilli for an activity").

### 4.10 Phone

| Home | Plant ⓘ | Observation (resumed) | Growth chart ⓘ |
|---|---|---|---|
| ![Phone home](handoff-screens/28-phone-garden.jpg) | ![Plant info](handoff-screens/29-phone-plant-info.jpg) | ![Phone observation](handoff-screens/30-phone-observation-resume.jpg) | ![Phone chart](handoff-screens/31-phone-growth-chart.jpg) |

Same screens, stacked for a narrow screen. Rating options sit 2 × 2 on phones. Chart readouts open from the ⓘ chips under the chart.

---

## 5. The rules — "if this, then show that"

### 5.1 Score → level
| Score (0–100) | Level | Colour token |
|---|---|---|
| below 34 | **Sprouting** | `--lvl-1` |
| 34 – 66 | **Growing** | `--lvl-2` |
| 67 and above | **Blooming** | `--lvl-3` |
| no data | **Not assessed yet** (not a level) | grey `--ink-300` |

- The same cut-offs apply on **every** dashboard (teacher, parent, school admin, platform admin).
- **Observation rating** (teacher, per question): 1 = Seed · 2 = Sprouting · 3 = Growing · 4 = Blooming. "Seed" appears only here.
- A skill's score combines teacher observation, parent survey and the child's own tasks. **How they're weighted is not defined yet** — see 9.

### 5.2 A child's plant (overall state)
Worked out from the child's 12 skills:
- **overall** = average of the 12 skill scores now; **overallPre** = average at Baseline; **growth** = overall − overallPre.
- Rules, checked in this order:

| If… | Plant | Shown as |
|---|---|---|
| no assessment data | **waiting** | sprout, "Not assessed yet" |
| overall level is Blooming **or** growth ≥ 16 points | **blossoming** | open flower |
| overall level is Sprouting **or** 3+ skills at Sprouting **or** the biggest teacher/parent/student gap on any skill ≥ 30 | **tending** | sprout, listed in "could use a little extra" |
| otherwise | **growing** | tulip |

> ⚠ Because of the "or" rules, a child whose overall level is **Growing** can still be listed as needing a little extra (screenshot 08 — Anaya). See 8.4.

### 5.3 Window state → what the home screen shows
| State | Window open? | Garden picture | Caption | Level mix | "Do what you came for" | "Who could use you" note |
|---|---|---|---|---|---|---|
| **Baseline** | yes | seedlings | "Freshly planted…" | hidden ("N children, ready to begin") | Baseline progress | empty text until baseline is in |
| **Between** | no | growing | "Your garden is resting — scores next update at Midline (date)" | shown | hidden | "Unchanged since baseline — the same N…" |
| **Midline** | yes | more flowers | "Growing season…" | shown | Midline progress | "Down from N at baseline" |
| **Endline** | yes | full bloom | "Full bloom…" | shown | Endline progress | "Down to N now, from M at baseline…" |

- **Celebration line** shows only if at least one child grew **≥ 8 points** since Baseline: Midline "N of your plants have grown since baseline", Endline "N plants blossomed across the whole year". Never shown if nobody grew.
- **"Continue → next: [name]"** = the child whose observation was interrupted (draft) first, else the first child not done.
- **Who could use you** = children whose plant is *tending*, max 3, each with their lowest skill.

### 5.4 Assessment completion
Each child, in each window, has 3 informants with a set number of parts:

| Informant | Parts | Completed when |
|---|---|---|
| 👩‍🏫 Teacher | 1 (the 21-question observation) | all 21 answered + Finish |
| 🏠 Parent | 2 (demographic + foundational skills survey; behavioural survey) | both parts done |
| 🧒 Student | 5 (IDELA direct assessment, Emotion Matching ×2, Memory Game, Hearts & Flowers) | all 5 done |

- **Window status for a child:** **Complete** = all 3 informants done · **Not started** = nobody has done any part and nothing is started · **In progress** = anything in between (a teacher who has answered at least one question counts as started).
- **Window unlocked** (shown in Done so far) if: Tilli has deployed it, **or** the preview state includes it, **or** any child already has progress in it. Otherwise "🔒 Not deployed yet" / "Not open yet".
- **Completion dates** are only ever real: teacher = when the observation was saved; parent/student = latest completion time recorded. If none is recorded → just "Done". **Never the window's scheduled date.**

### 5.5 The To-do journey
Steps in order: Pre-training survey · Baseline observations · Post-training survey · Midline observations · Endline observations.
- The **current step** comes from the window state: Baseline → Baseline obs · Between → Post-training survey · Midline → Midline obs · Endline → Endline obs.
- Steps **before** the current one = Complete; the current one = Active; later ones = Locked.
- An observation step that is Active becomes **Complete as soon as every child's teacher observation is done**.
- **Post-training survey** = Complete only when the teacher has really retaken the reflection; otherwise Active once its turn has come.
- No window open → "🌿 Nothing to observe right now. [Next window] opens [date]."

### 5.6 The observation flow
- 21 questions, `OBS_PAGE_SIZE = 6` per page → pages of 6 · 6 · 6 · 3.
- **Next page** only when every question on the page has an answer. **Back** goes one page back.
- Every tap is saved as a **draft** (per teacher + child + window). Opening the child again restores the answers and opens the **page with the first unanswered question**, with "↺ Picked up where you left off".
- **Finish** saves the observation, deletes the draft and moves straight to the **next child still pending**: rest of the current class in list order (wrapping round), then other classes. None left → "Every child is observed for [window] 🌸".
- "Who's still to do" order: started (draft) children first, then not started.

### 5.7 Insights
- A window counts as **measured** for a class when, on average, at least **half of each child's three informants** are in for that window. Growth over time and Every skill only show once there's a second point (Midline or later).
- **Class Skill Overview:** for each skill, children are counted per level; the skill's colour is the level **most** children are at (a tie goes to the **lower** level). The 3 boxes count **skills**, not children.
- **Gap** for a skill = highest − lowest of the three viewpoints. "Worth a closer look" = the 3 biggest gaps of **12+ points**. On a child's Perspectives, "Worth a conversation" = gap **22+**.
- **Compare my sections:** shows only grades where the teacher owns 2+ sections; prompts = the 3 biggest section-to-section differences of **10+ points**.
- Before Baseline is measured, the page shows the "Between" sample, labelled "Sample view".

### 5.8 Parent reminders (Done so far)
- A child is listed when their **parent part for the selected window is not complete**.
- **Group reminder** (safe for a class WhatsApp group — no names): "Hello parents 🌱 A gentle reminder: the Tilli [window] parent survey for [class] closes on [date]. It helps us see how your child is growing at home. If you've already finished it, thank you! — [teacher]"
- **One-to-one message** (names the child): "Hello! A gentle reminder that [child]'s Tilli [window] parent survey closes on [date]. It helps us see how [child] is growing at home. Thank you! — [teacher]"
- Both texts are drafts awaiting product review.

### 5.9 Students list
- Sort **State** = tending → waiting → growing → blossoming; **Name** = A–Z; **Growth** = biggest growth first.
- Line under the name: Sprouting child → "Sprouting · [lowest skill] next"; Growing → "Growing"; Blooming → "Blooming"; no data → "Not assessed yet".

---

## 6. Colours and type

**Fonts:** headings **Quicksand** (`--font-heading`), body **Montserrat** (`--font-body`).

### 6.1 Levels
| Level | Main `--lvl-n` | Soft `-soft` | Wash `-wash` | Text `-ink` |
|---|---|---|---|---|
| Sprouting (1) | `#26BDE2` | `#7FD6EE` | `#D9F5FF` | `#1B7F99` |
| Growing (2) | `#E3A40E` | `#F2CF6B` | `#FCF0C8` | `#8A6400` |
| Blooming (3) | `#56C02B` | `#7FCB95` | `#DDF3E3` | `#348C11` |
| (level 4, unused in teacher view) | `#348C11` | `#56C02B` | `#CDE9C0` | `#1E5A0A` |

### 6.2 Brand and neutrals
| Token | Hex | Used for |
|---|---|---|
| `--green-500` | `#56C02B` | primary buttons, active states |
| `--green-600` | `#49A524` | borders on selected |
| `--green-700` | `#348C11` | headings, "done" text |
| `--pink-400` / `--pink-600` | `#E866B0` / `#E91E8C` | avatar, celebration text |
| `--cyan-500` / `--cyan-700` | `#26BDE2` / `#1B7F99` | focus ring, info |
| `--yellow-500` | `#FCC30B` | sun, help bubble |
| `--orange-500` | `#F99B1C` | warnings / delete hover |
| `--ink-900` / `-700` / `-450` / `-300` | `#141414` / `#474747` / `#5B6170` / `#9AA3AF` | text (strong → muted) |
| `--line-200` | `#ECEEF2` | borders |
| `--surface-100` | `#F8F9FB` | soft backgrounds |
| `--wash-green` / `-cyan` / `-yellow` / `-pink` | `#F1FFEC` / `#D9F5FF` / `#FFF6A8` / `#FFF6FB` | tinted cards |
| `--warn-wash` | `#FFF1DC` | warning / active step background |
| `--danger-700` | `#B22447` | errors |

### 6.3 Status, viewpoints, charts
| Thing | Colours |
|---|---|
| Complete | background `--wash-green`, text + dot `--green-700` |
| In progress | background `--wash-yellow`, text `#8A6400`, dot `#F2CF6B` |
| Not started | background `--surface-100`, text + dot `--ink-300` |
| 👩‍🏫 Teacher / 🏠 Parent / 🧒 Student | `#4A90D9` / `#56C02B` / `#F0A84A` |
| Growth chart lines (in order) | `#2A78D6`, `#EB6834`, `#1BAF7A`, `#EDA100`, `#E87BA4`, `#008300`; "class average" dashed `--ink-300` |
| Garden bush blooms (per section) | `#FFFFFF`, `#F0A84A`, `#EFA9B8`, `#5AA9E6`, `#A99BD6`, `#E4756B` |
| Garden sky | `linear-gradient(#E6F4F8 → #EAF5EC → #F1FFEC)`; Endline sky `#FDEFF4 → #EAF5EC → #F1FFEC` |

### 6.4 Parent report PDF (own palette)
Ink `#2C2A3A` · body `#3A3850` · navy `#3B3170` · lavender `#EEEAFD` · peach `#FBEFE6` · mint `#E6F4EC` · yellow `#FDF9E8` · pink `#F9E8EF`. Level colours reuse `--lvl-1/2/3`.

---

## 7. Words we use (and don't)

| Use | Don't use |
|---|---|
| **Sprouting · Growing · Blooming** (levels) | Beginner / Learner / Expert, Emerging / Developing / Secure, Needs attention / Strong |
| **Seed** — only the lowest observation rating | Seed anywhere else |
| **Not assessed yet** | Need more data |
| **Baseline · Midline · Endline** | Pre / Mid / Post, Mid-year, End of year (as names), week numbers |
| **Social-Emotional · Cognitive** | Executive Function, EF |
| **Done so far** (tracker tab) | Tracker, Completed rate |
| **Next to practise**, "could use a little extra" | Needs help, "start here" |
| Dates ("Due Jun 18") | "Week 14" |

---

## 8. For Mayur — what to build and connect

### 8.1 Connect to the real database **[DB]**
| # | What | Today in the sample | Needed |
|---|---|---|---|
| 1 | **Observation questions** | 21 demo questions in `OBS_QUESTIONS` (each mapped to a skill) | `obsQuestions()` returns the **Teacher assessment template** from the platform admin for the open deployment: id, text, skill key, in order |
| 2 | **Observation answers** | saved per **question id**, 1–4 (`{ q01: 3, … }`) | store per teacher + child + window; compute each skill score from its questions |
| 3 | **Drafts (unfinished observations)** | browser storage (`TeacherStore` in `teacher.js` — the swap point) | API call per tap (or short debounce) so it works on another device; delete on Finish; merge per question if two devices edit at once |
| 4 | **Completion timestamps** | teacher only; parent/student via `TilliAPI.completedAt()` if recorded | a timestamp for **every** informant part so every "Done" shows a real date |
| 5 | **Scores and levels** | random demo scores | compute levels **in one place** with the 34 / 67 cut-offs and use them on every dashboard |
| 6 | **Window names, dates, state** | hardcoded (Apr 2 / Jun 18 / Sep 24) + Preview switch | from the school's deployments (one source for every dashboard) |
| 7 | **Started-but-unfinished** | "In progress" in the teacher view | report it as "In Progress" in admin and CSV completion data too |
| 8 | **CSV export** | columns like `Memory Game (Baseline)` | update anything that imports the old `(PRE)/(MID)/(POST)` columns |
| 9 | **Parent survey link** | none | add to both reminder messages once it exists |
| 10 | **Child History rows** | same 4 rows for every child | real assessment history per child (T3) |

### 8.2 Parked (do later)
- **T3** — replace hardcoded values: History rows, "Good morning" + "week 14" on the class garden, landing deadlines, journey dates, "of 9 parts".
- **T4** — hide the **Preview state** box from real teachers (keep it for internal review, e.g. behind `?preview=1` or an internal role). Today it also **covers the Profile "Edit details" button and the section chips on phones**.

### 8.3 Waiting on a decision
- **T11** — whether teachers see **percentages at all** (Masoomi / Kavi). The ⓘ text lives in `SCORE_INFO` / `PERSP_INFO`.

### 8.4 Inconsistencies found while taking these screenshots (please check)
| # | What you'll see | Where | Why |
|---|---|---|---|
| a | Endline home says "**6 plants blossomed** across the whole year" while the level mix shows **0 Blooming** | 07 | celebration counts children who grew ≥ 8 points, but the word "blossomed" reads as "reached Blooming" — reword or change the rule |
| b | Midline "Who could use you" says "**Down from 1** at baseline" while listing **2** children | 06 | "baseline" count uses overall Baseline level; "now" uses plant state — different rules |
| c | A child shown as "**Growing overall**" sits under "could use a little extra" | 08 | the *tending* rule also triggers on 3+ Sprouting skills or a 30-point gap (5.2) |
| d | Growth chart plots **Midline (in progress)** but "Every skill, up close" shows **Mid: —** | 21 | the chart plots the open window early; the cards wait for "measured" |
| e | Journey says **Baseline "All 6 observed · Complete"** while Done so far shows **Baseline 2/6** | 15 vs 18 | the journey counts the teacher's part only; Done so far needs all three informants — label them differently |
| f | In Midline, **Post-training survey and Midline observations are both "Active"** | phone journey | two steps can be active at once |
| g | "0 students reached Blooming since baseline" pill and "Good morning" at any time | 08 | hardcoded / sample (T3) |
| h | Growth chart is **very small on a phone** | 31 | consider opening the **Table view** by default on phones |
| i | **Need-help bubble** overlaps content on phones (e.g. "Window closes Apr 2") | 28 | add bottom padding or move the bubble |
| j | Parent report preview: wide tables reach the right edge | 25 | check the PDF margins |

### 8.5 Fixed during this pass (already in the code)
- Class garden: a top-row plant's info card was cut off → fixed (`.plant-bed` no longer clips).
- Phone observation: 4 rating buttons stacked in a column (24 buttons per page) → now **2 × 2**.
- Phone growth chart: the readout opened off-screen → now kept inside the chart.
- Child timeline link said "Back to tracker" → "**Back to Done so far**".

### 8.6 Please keep (teachers liked these)
One-job home screen with **Continue → next**, auto-advance to the next child, "Who could use you", "This week's idea", Ask Tilli next to every finding, gentle wording on Perspectives / Compare, bulk parent PDFs, chart ↔ table toggle, honest empty states.

---

## 9. Open product decisions
| Topic | Question | Owner |
|---|---|---|
| Percentages | Show % to teachers, or only levels? | Masoomi / Kavi |
| Scoring | How are teacher / parent / student combined into one skill score? | Research |
| Skill groups | Critical Thinking and Metacognition are in **Social-Emotional** in the data — correct? | Research |
| "Not seen yet" | Allow a "not seen yet" answer so a teacher isn't forced to guess? | Research |
| Reminder texts | Approve the two parent reminder messages | Product |
| Post-training "Not now" | The retake screen has "Not now — back to my dashboard"; keep it now that the survey is required? | Product |
| Home "Continue" | Should it open the still-to-do list instead of going straight to the next child? | Product |
| Celebration wording | "N plants blossomed" vs the actual rule (grew ≥ 8 points) — see 8.4 a | Product |

---

## 10. Which file does what
| File | What's in it |
|---|---|
| `teacher.html` | page shell; loads everything below |
| `assets/teacher.js` | first-time setup, reflection, student roster, saved teacher data (`TeacherStore`) incl. observations + drafts |
| `assets/teacher-dashboard.js` | the whole dashboard: garden, students, assess (journey, still-to-do, observation pages, Done so far, timeline, reminders, CSV), insights, parent report + preview, profile/mirror, Ask Tilli, styles |
| `assets/dashboard-data.js` | demo class data, score → level, plant state rules, completion roll-ups, preview states |
| `assets/school-data.js` | demo school roster + past classes |
| `assets/tilli-api.js` | shared demo "API": school, students, deployments, completions (`markComplete`, `completedAt`), reflection bank, history, colour palette (`TilliPalette`) |
| `assets/tilli.css` | design tokens (colours, type, spacing) and shared components |
| `parent.html`, `admin.html` + `assets/admin*.js`, `tilli.html` + `assets/tilli-admin.js` | parent, school-admin and platform-admin dashboards (level names + cut-offs updated to match) |
| `Teacher-Dashboard-Tasks.md` | task tracker + decision log |
| `handoff-screens/` | the screenshots in this document |
