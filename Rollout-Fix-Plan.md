# Rollout fix plan — from the success-lead review (26 Oct 2026)

Source: Farah's walkthrough of `tilli.html` (create a school → deploy → Heritage Oaks), the plan-from-calendar idea, and the class-size follow-ups. Every decision below was answered by Ishani on 26 Oct 2026.

**How we work:** by priority, one phase at a time. At the end of each phase: check it in the browser, commit to `main`, then **stop** for your review before the next phase.

**Status key:** ⬜ Not started · 🟡 In progress · ✅ Done

---

## Phase 1 — Stop-ship (P0) · ✅ done 26 Oct 2026

| # | Item | What changes | Where | Status |
|---|---|---|---|---|
| 1.1 | **Past years on the leadership dashboard** | The `2026–27` chip becomes a year switcher. Overview, Outcomes and Reports show any closed year read-only (same data the Tilli side shows). "Your first results arrive…" only appears in a school's first year. | `admin.js`, `admin-data.js`, `created-school-bridge.js`, `tilli-api.js` (`yearSummary`, `outcomesIn`) | ✅ |
| 1.2 | **Start new year is guarded** | Hidden until every deployed window this year has ended. Tilli gets an "override" link. Secondary (not green) button. Confirm by typing `CLOSE 2026–27`. "GATED" chip replaced with a sentence. **Tilli team only.** | `tilli-admin.js` (Academic year card, rollover dialog) | ✅ |
| 1.3 | **School-side year-end becomes a request** | Roster's "Start grade migration" → **Ask Tilli to start next year** (shows as a Control Room card for Tilli). Once Tilli has started the year: the button becomes **See grade migration** (who moved up / stayed / graduated) and the school admin gets a notice on their Overview. | `admin.js`, `tilli-api.js`, `tilli-org-data.js` (Control Room card) | ✅ |
| 1.4 | **Grades without sections are kept** | A grade added with no sections survives Create school. Structure shows it with "No sections yet — add one before students or teachers can be placed here." | `tilli-api.js` (`createSchoolFull`, new per-school grade list), `tilli-admin.js` (wizard Review, Structure, Grades & sections) | ✅ |
| 1.5 | **Spreadsheet rows must match a real class** | A row whose grade/section the school doesn't have is an **error** ("No Grade 1 C at this school — add it in Grades & sections first") and isn't imported. Only upper/lower case and extra spaces are forgiven ("grade 1 a" = "Grade 1 A"). | `tilli-admin.js` (Add Students validate + import), `tilli-api.js` (stop `ensureSection` creating classes on import) | ✅ |
| 1.6 | **One school code** | The teacher join code is merged into the school code (e.g. `HROK-4410`): links, teacher sign-up and student assessments all use it. Every "school code" label means that one code. | `tilli-api.js` (`resolveJoinCode`, `verifySchoolCode`, `makeJoinCode`), `landing.js`, `assess.js`, `tilli-admin.js` (Staff & Access, Demo access card), `Demo-Logins.md`, walkthrough | ✅ |

✅ **Phase 1 check:** Heritage Oaks leadership dashboard shows 2024–25 / 2025–26; Start new year is hidden on a new school and asks for typing on Heritage; a school admin's request reaches the Control Room; a section-less grade survives Create; a CSV row for Grade 1 C is rejected; one code works for teacher sign-up.

---

## Phase 2 — Friction (P1) · ✅ done 26 Oct 2026

| # | Item | What changes | Where | Status |
|---|---|---|---|---|
| 2.1 | **Academic year + Jordan at Add School** | Profile asks **this year's start and end dates** (required; suggested from the country: Sri Lanka Jan–Dec, India Jun–May, Jordan Sep–Jun). **Jordan** + cities (Amman, Irbid, Zarqa, Aqaba, Madaba, Salt) in Add School and Edit school. Arabic / right-to-left screens are *not* in this plan. | `tilli-admin.js` (wizard Profile, Edit school), `tilli-org-data.js`, `tilli-api.js` (`yearsIn` uses the stored dates) | ✅ |
| 2.2 | **Deploy checks warn** | The Deploy dialog lists problems with a link to fix each: classes with no teacher, no students, items with no live template version for this phase. You can still deploy. | `tilli-admin.js` (Deploy phase confirm) | ✅ |
| 2.3 | **Dates are never silently rewritten** | End before start → inline error under the dates; Deploy stays disabled. The other date is never changed for you. | `tilli-admin.js` (phase planner) | ✅ |
| 2.4 | **One completion number: children fully done** | Every completion % (Tilli hub, Assessment progress, Year over year, past-year tables, school dashboard) = children who finished every assessment in the phase, shown as "28 of 56 children". Response counts, where shown, are labelled "responses" and counted the same way everywhere. | `tilli-api.js` (`statsFrom`, `completionStatsIn`), `tilli-admin.js`, `admin.js` | ✅ |
| 2.5 | **History shows when things happened** | Deploy entries are dated when the deploy happened, not by the window. No future dates above "Today". Fixes "observation**set** window" (missing space) at the same time. | `tilli-api.js` (history seeding + `phaseEvent`), `tilli-history.js` | ✅ |
| 2.6 | **Invite expiry from the real date** | New invitations expire 14 days from today (not from the fixed demo date). | `tilli-org-data.js` | ✅ |
| 2.7 | **Regenerate the school code** | Staff & Access → **Regenerate code** (Tilli + school admin). Warning first: "Every link and code you've shared stops working now." Old code stops at once. | `tilli-api.js`, `tilli-admin.js`, `admin.js` | ✅ |
| 2.8 | **Board-scoped school admins** | In multi-board schools each **grade** has a board (set in Add School → Grades and in Grades & sections; sections inherit). A school-admin invite chooses **All boards** or **Selected boards**. A board-scoped admin's dashboard only shows those boards' classes, children, completion and outcomes. | `tilli-api.js` (grade board, account boards, scoped reads), `tilli-admin.js` (wizard, Grades & sections, invite), `admin.js` + `created-school-bridge.js` (filter) | ✅ |
| 2.9 | **"Year N with Tilli" on the school Overview** | A card on the Tilli school Overview with the Year over year table. Outcome numbers labelled with their year and phase; one scale (0–100 band score) on both. | `tilli-admin.js` (`HUB.overview`, outcomes card) | ✅ |
| 2.10 | **Growth only between matching assessments** | Year over year marks a phase that used different assessments ("different assessments — not comparable"), and growth arrows only connect phases that used the same ones. | `tilli-admin.js` (Year over year), `tilli-api.js` (`yearSummary`) | ✅ |
| 2.11 | **No dead end on a child** | Opening a child at a school without full reports shows plain text ("Reports for this school aren't available here yet") and a **← Back to students** link. | `tilli-admin.js` (`SCREEN.student`) | ✅ |
| 2.12 | **Upload a CSV file + download a template** | Add Students → CSV gets **Upload .csv** and **Download template** next to the paste box. | `tilli-admin.js` | ✅ |

✅ **Phase 2 check:** create a Jordan school with dates; deploy on a school with no teachers (warnings shown); enter end < start (error, nothing moves); Heritage completion matches on both dashboards; no future-dated history; regenerate a code; invite a CBSE-only admin and see only CBSE grades.

---

## Phase 3 — New features · ✅ done 26 Oct 2026

### 3A. Plan from calendar

| # | Item | What changes | Status |
|---|---|---|---|
| 3.1 | **Calendar data** | One calendar per school: terms (start/end), exam blocks (each can be tagged to a board), holidays. Stored per academic year. | ✅ |
| 3.2 | **Timing rules, editable** | Defaults: Baseline starts 2 weeks into Term 1, runs 3 weeks · Midline starts ~2 weeks into the middle term, ≥10 weeks after Baseline ends · Endline ends ≥2 weeks before finals · windows stretch over holidays · never overlap an exam block (board-tagged exams only affect that board's grades). Editable on a **Scheduling rules** card on the Deployments page. | ✅ |
| 3.3 | **School admin puts the calendar in** | Leadership dashboard → **School calendar**: type it in, or **upload a PDF/photo** and Ask Tilli fills the form (simulated in this prototype; the school checks it). Status: *Waiting for Tilli*. | ✅ |
| 3.4 | **Tilli reviews and applies** | School → Assessments → Academic year card → **Plan from calendar** (also a Control Room card "Calendars to review"). Shows suggested Baseline / Midline / Endline dates, each with a one-line reason. **Apply** fills the phase dates as drafts — never deploys. Tilli can also enter/upload the calendar here. | ✅ |
| 3.5 | **Other entry points** | Add School → Profile (optional upload). Start new year dialog asks for next year's calendar. Group page: **Apply one calendar to all schools in this group**. | ✅ |
| 3.6 | **Calendar changes after deploy** | Never moves a deployed or scheduled window. Shows "Calendar changed: Midline now overlaps exams — shift it?" with a one-click shift. | ✅ |

### 3B. Class-size follow-ups

| # | Item | What changes | Status |
|---|---|---|---|
| 3.7 | **"Not confirmed" sizes** | Sizes set automatically from headcount show *not confirmed* and appear under Classes missing students until an admin saves one. | ✅ |
| 3.8 | **Waiting badge** | Count badge on the school admin's **Roster** menu and Tilli's **All Schools** menu when children wait for approval. | ✅ |
| 3.9 | **Ask on CSV import** | After an admin import changes a class's size: "Grade 2 A now has 15 — is that the whole class?" → **Yes** / **No, it should be __**. | ✅ |
| 3.10 | **Wizard size defaults to 30** | Add School's per-section count starts at 30 (editable). | ✅ |
| 3.11 | **Teachers can't create classes** | The **+ New** section chip is removed from the teacher's Add students. Missing classes are added by the school admin or Tilli. | ✅ |

✅ **Phase 3 check:** school admin enters a calendar → Tilli sees it, applies suggested dates (reasons shown) → nothing deploys; change the calendar after deploying → warning, no move; badge appears when a teacher sends a child for approval; CSV import asks about the class size.

---

## Phase 4 — Polish (P2) · ✅ done 26 Oct 2026

| # | Item | Status |
|---|---|---|
| 4.1 | Past-year tables scroll sideways at 1024px (Status column, Start new year cut off) → wrap / tighten columns | ✅ |
| 4.2 | School header counts (Students / Grades / Sections) update right after a CSV import, without a reload | ✅ |
| 4.3 | Any leftover unexplained chips/jargon from the review (sweep) | ✅ |

---

# Phase 5 — from Farah's re-review (26 Oct 2026, after Phases 1–4)

Decisions by Ishani, 26 Oct 2026: leadership can see each student for now · parents need no code (admission number only) · board scope: fix all three leaks · one add-grade / add-section save used by school admin and Tilli · individual assessments are taken by a parent or teacher themselves, results on the Tilli side only, a teacher arriving by link signs up as a full teacher (school code required). Mayur items (revoke/resend/reassign, invite expiry) are in the tracker.

## Phase 5A — Access and safety · ✅ done 26 Oct 2026

| # | Item | What changes | Status |
|---|---|---|---|
| 5.1 | **Self-joined teacher gets only the classes they pick** | The Add-your-students sheet is built from the classes picked in step 3, never the whole school. Only picked classes are saved. A teacher can't create a class. | ✅ |
| 5.2 | **"My class isn't listed"** | Exit at step 3 → a request the school admin (Overview warning + Roster badge) and Tilli (Control Room card) both see. No demo grade list for a real school. | ✅ |
| 5.3 | **Sign out clears the session** | Teacher and parent sign-out clear the saved session, so the student link no longer opens as that teacher. | ✅ |
| 5.4 | **Teacher sign-up: code first, then Confirm school** | No school search for teachers. Code → "Is this your school?" (name · city · board) → password. | ✅ |
| 5.5 | **Review who joined after a regenerate** | Memberships store when and how a teacher joined. After Regenerate code: "N teachers joined with the code in the last 30 days" with Remove. | ✅ |
| 5.6 | **Board scope, three leaks** | Scoped admins see only their boards' teachers (no false "no section" warning); invites pick a real in-scope class; Tilli / group drill-ins open as an all-boards viewer. | ✅ |
| 5.7 | **Board access stays maintainable** | Rollover sections keep their grade's board; Edit board access on Staff & Access; untagged-grades nudge. | ✅ |

## Phase 5B — School admin self-serves classes and students · ✅ done 26 Oct 2026

| # | Item | Status |
|---|---|---|
| 5.8 | One add-grade / add-section save in TilliAPI, used by Tilli too (fixes the CSV-loop known issue) | ✅ |
| 5.9 | School dashboard: Grades & sections (in-scope boards only) | ✅ |
| 5.10 | School dashboard: Add students (paste, .csv, template), in-scope classes only | ✅ |

## Phase 5C — Teacher and parent across the year · ✅ done 26 Oct 2026

| # | Item | Status |
|---|---|---|
| 5.11 | Teacher dashboard reads the school's roster; observations kept per year; completions only for the teacher's own children | ✅ |
| 5.12 | Parent after rollover: "New school year" notice, read-only last year, graduated children labelled | ✅ |
| 5.13 | Parents add a child by admission number only (no code) | ✅ |

## Phase 5D — Tilli team: windows and calendars · ⬜

| # | Item | Status |
|---|---|---|
| 5.14 | Results show only once every part of the window has ended | ⬜ |
| 5.15 | Plan from calendar never suggests a past window; Deploy blocks an end date before today | ⬜ |
| 5.16 | Calendar queue clears on any Tilli save; a school's draft after sending shows "unsent changes" | ⬜ |
| 5.17 | Shift on a Live window: disclaimer, then "only move the end date" or "move it and lose collected data" | ⬜ |
| 5.18 | One calendar for a group only touches schools with no calendar or a Tilli-entered one | ⬜ |
| 5.19 | Start new year confirm accepts any dash | ⬜ |
| 5.20 | + New deployment hidden for real schools (use the school's planner) | ⬜ |
| 5.21 | City "Other…" with free text; the new city joins the list | ⬜ |

## Phase 5E — School dashboard polish · ⬜

| # | Item | Status |
|---|---|---|
| 5.22 | Past-year Overview hides this year's warnings; exports name the year | ⬜ |
| 5.23 | "Ask Tilli to start next year" only once Endline is deployed | ⬜ |
| 5.24 | Waiting badge on the phone bottom nav (shipped with 5A) | ✅ |
| 5.25 | Key hover-only explanations become tap ⓘ tips | ⬜ |

## Phase 5F — Sessions (pre / post outside the phases) · ✅ done 26 Oct 2026 (built right after 5B)

For a separate parent or teacher session (e.g. a workshop): a pre and a post survey for that session only. Never part of Baseline / Midline / Endline, completion numbers or the school dashboard; schools can't see it. Decided by Ishani, 26 Oct 2026.

| # | Item | Status |
|---|---|---|
| 5.26 | **Data + API.** A session per school: name, who takes it (Parent / Teacher), template + version, single or **pre and post**, open/close dates per part. Answers saved per person and part; pre and post matched by email. | ✅ |
| 5.27 | **Tilli school → Assessments → Sessions.** + New session; each part gets its own link (Copy) and dates; End. | ✅ |
| 5.28 | **Link** opens sign-in / sign-up with the role preselected and goes straight into that part — never a dashboard. Parents skip adding a child; teachers sign up as full teachers (school code). | ✅ |
| 5.29 | **Runner** shows the template's real questions and saves the answers (self-guided games record a simulated score). Closed → a plain message. | ✅ |
| 5.30 | **Session page (Tilli only).** Collected: "18 of 24 did the pre · 15 did the post · 13 did both". Results by question type: rating scales and choices as bars (pre vs post side by side, plus moved up / same / down for people who did both), open text as a list, games as a score spread. | ✅ |
| 5.31 | **Download CSV** — one row per person (pre + post answers side by side), plus pre-only and post-only files. | ✅ |

---

## Risks to keep in mind

- **One code means a parent link reveals the teacher code.** Anyone holding a parent or student link could sign up as a teacher. *Mitigation available later:* teachers who self-join land as "waiting for the school admin to confirm".
- **Board-scoped admins need every grade to have a board.** Schools created before 2.8 have no grade boards; their board-scoped admins would see nothing until grades are tagged. *Plan:* single-board schools tag every grade automatically; multi-board schools show a "tag your grades" nudge.
- **Children-fully-done completion moves slower** than responses received. Numbers on Heritage and the demo schools will drop compared with today.
- **Simulated calendar upload.** The prototype fills the form with plausible dates; a developer swaps in real extraction.
- **`.xlsx` upload isn't included** (2.12 is `.csv` only); reading Excel needs a library.

## Docs updated alongside

`Super-Admin-Walkthrough.md` (missions for each phase), `Demo-Logins.md` (one code per school), `School-Success-Feedback-Tracker.md` (Mayur known-issues list), `Multi-Year-Schools.md` (year switcher shipped).
