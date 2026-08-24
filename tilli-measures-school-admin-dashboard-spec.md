# Tilli Measures — School Admin Dashboard
## Build Spec v1.0

**For:** Claude Code
**Scope:** Features, flows, interactions, states, permissions, data contracts.
**Not in scope:** Visual design, colour, typography, spacing, illustration. Design system is already configured in the project — use it. Do not introduce the teacher dashboard's garden/plant metaphor anywhere in this product surface.

---

## 1. What this is

A separate dashboard surface for **school leadership**, sitting alongside (not inside) the teacher dashboard. One codebase, two role-based views.

It answers four questions, in this priority order:

1. **Is it happening?** — is the programme actually running across my sections
2. **Is it working?** — have children moved between skill bands since baseline
3. **Can I show it?** — can I export something defensible for a board meeting or newsletter
4. **Where do I intervene?** — which sections need support, and are raised concerns being handled

Design for **infrequent, high-stakes visits** — roughly 4–6 logins per academic year, often immediately before a meeting. Assume the user has forgotten the interface since last time. No onboarding tours, no progressive disclosure that hides the primary answer, no assumption of remembered context.

---

## 2. Roles and permissions

Two roles use this dashboard. Both are defined in `tilli-measures-identity-access-spec.md` — this document specifies what each sees here.

### Governing rule

> **Identity depth ≠ outcome depth. Admin roles see _who_. Teachers see _how_.**

No leadership role can view an individual child's SEL results. This is enforced **server-side**, not by hiding UI. The API must reject student-level outcome requests from admin and principal roles regardless of the client.

### Permission matrix

| Capability | Coordinator / Admin | Principal (view-only) | Teacher |
|---|---|---|---|
| Student names, roster, enrolment | Full, all sections | ❌ Counts only | Own sections |
| Assessment completion by student | Full, all sections | ❌ Counts only | Own sections |
| **Individual student SEL results** | ❌ | ❌ | ✅ Own sections only |
| Section-level skill bands & movement | ✅ All sections | ✅ All sections | Own sections |
| Grade and school aggregates | ✅ | ✅ | ❌ |
| Raised concerns — names | ✅ | ❌ Counts only | Own sections |
| Roster edits, grade migration | ✅ | ❌ | ❌ |
| Teacher–section assignment | ✅ | ❌ | ❌ |
| Set school targets | ✅ | ❌ View only | ❌ |
| Export reports | ✅ | ✅ | ❌ |
| Invite / revoke users | ✅ | ❌ | ❌ |

### Config flag: `leadership_student_results_visible`

Per-school, **default `false`**. When a school contractually requires leadership access to student-level results:

- Setting is toggled by Tilli staff only, not by school users
- All student-result access by admin/principal roles is written to an access log (actor, student, timestamp)
- A persistent, non-dismissible notice appears in the **teacher** dashboard: school leadership can view individual student results at this school
- Build the flag and the log now. The UI it unlocks can be deferred — see §11.

---

## 3. Data cadence — read this before building anything

Two data streams with completely different refresh rates share this dashboard. Conflating them is the primary failure mode.

| Stream | Source | Updates | Examples |
|---|---|---|---|
| **Continuous** | Product activity | Live / daily | Ask Tilli usage, assessment completion progress, roster changes, raised concerns |
| **Periodic** | Assessment windows | **3× per academic year** | Skill bands, band movement, all outcome data |

### Rules

- Every module rendering **periodic** data carries a cadence label: `Baseline · July 2026` and `Next: Midline · November 2026`. Not a tooltip. Visible in the module.
- Periodic modules never render a flat line or a zero as if it were a result. Before midline exists, the module shows a "not yet measured" state, not an empty chart.
- Never place a continuous metric and a periodic metric in the same visual comparison. They will be read as the same timescale.
- Assessment points are always named — `Baseline`, `Midline`, `Endline` — never dated x-axis ticks alone, never "Term 1/2/3".

---

## 4. Navigation

Five destinations. Order is fixed and identical across roles; `Roster` is **absent** for Principal, not disabled — remaining items do not reorder.

| # | Destination | Coordinator | Principal |
|---|---|---|---|
| 1 | Overview | ✅ | ✅ |
| 2 | Implementation | ✅ | ✅ |
| 3 | Outcomes | ✅ | ✅ |
| 4 | Roster | ✅ | ❌ |
| 5 | Reports | ✅ | ✅ |

**Mobile:** bottom tab bar, `100dvh`. No app download. Principal sees four tabs, coordinator five. No raised centre action — that pattern belongs to the teacher dashboard's Ask Tilli.

**Global header:** school name, current academic year, role badge, account menu. Academic year is a selector when more than one year of data exists (see §10.3).

---

## 5. Screens

### 5.1 Overview

Role-aware landing. Answers "is anything wrong?" in one screen without scrolling on desktop.

**Modules, in order:**

1. **Status line** — one sentence, generated server-side. Example shapes:
   - `12 of 14 sections are active. 2 sections have had no activity in 4+ weeks.`
   - `Midline assessment opens in 12 days. 3 sections have not completed Baseline.`
   - No metaphor, no encouragement, no exclamation.

2. **Quiet sections** — *the most important module on the dashboard.* Lists sections by name with days since last activity, descending. Shows sections only, never "3 sections are inactive" as a bare count.
   - Threshold configurable per school, default 21 days
   - Row action: `View section` → Implementation, deep-linked and filtered
   - Coordinator gets an additional row action: `Message teacher` (opens the compose flow, §6.4)
   - Empty state (nothing quiet): explicit confirmation — `All sections active in the last 21 days.` Not a blank panel.

3. **Assessment window status** — current window name, open/closed, dates, completion as `X of Y sections complete`. If no window is open, shows the next one and its date.

4. **Open concerns** — count of teacher-raised concerns by status (`New`, `Routed`, `Closed`).
   - Coordinator: count is clickable → concern queue with names
   - Principal: count is **not clickable**, and carries a static line — `Names are visible to the counsellor and coordinator only.` This line is deliberate. It is the artefact that earns leadership trust in the privacy model; do not remove it as clutter.

5. **Last outcome snapshot** — a compressed read of the most recent completed assessment point, linking into Outcomes. Carries the cadence label. Before baseline exists, shows the not-yet-measured state.

**Principal differences:** modules 1, 2, 3, 5 render identically. Module 4 is count-only as described. No message action on quiet sections.

---

### 5.2 Implementation

"Is it happening." Powered entirely by **continuous** data.

**Filters (persist in URL):** grade, section, date range (default: last 30 days).

**Modules:**

1. **Section activity table** — one row per section. Columns:
   - Section
   - Teacher (name)
   - Last activity (relative — `4 days ago`)
   - Ask Tilli sessions (in range)
   - Assessment completion for the current/most recent window (`28 / 34 students`)
   - Status chip: `Active` / `Slowing` / `Quiet`
   - Sortable on every column. Default sort: last activity, oldest first. **The problems are at the top by default** — do not default to alphabetical.

2. **Activity over time** — sessions per week across the school, filterable to grade or section. Continuous data, so a real time series is appropriate here.

3. **Teacher effort indicator** — Ask Tilli sessions and questions resolved, per section. Framed as *support delivered*, not teacher surveillance. Column header language: `Support requests answered`, not `Teacher usage`. Do not build any teacher-ranking or leaderboard view.

4. **Completion detail** (coordinator only) — drill into a section to see which students are outstanding for the current assessment window, by name. This is completion status only. **No scores, no bands, no skill data on this screen at any depth.**

---

### 5.3 Outcomes

"Is it working." Powered entirely by **periodic** data. Every module here carries a cadence label.

**Scope selector:** School → Grade → Section. Three levels, breadcrumbed. **The chain terminates at section.** There is no student level in this screen for any role, and no route exists for one.

**Modules:**

1. **Skill band distribution** — for the selected scope and assessment point, distribution across bands per skill. Band labels come from the shared skill-label source; do not hardcode them.

2. **Interpretation line** — a sentence beneath each skill's distribution explaining what the shape means.
   - **Content is data, not code.** Load from a content table keyed by `(skill_id, grade_band, assessment_point, distribution_shape)`.
   - Authored and signed off by Masoomi. Ship with a fallback and a visible placeholder if a key is missing — never render a distribution with no interpretation.
   - Phrasing is **developmental**, not empirical: "children at this stage typically…". It must not reference other schools, other cohorts, or Tilli's aggregate data. See §9.

3. **Movement since baseline** — for the selected scope: net movement between bands from Baseline → current point, per skill. Expressed as band movement, not score deltas.
   - Renders only when ≥2 assessment points exist. Before that, shows: `Movement will appear after Midline · November 2026.`

4. **Progress over time** — the three assessment points as named markers, per skill. Never interpolate a line between points that don't both exist yet.

5. **Target vs actual** — if the school set targets at baseline (§6.3), shows target band distribution against actual. Absent entirely if no targets were set. Do not show an empty target module as a prompt.

6. **Compare sections** — conditional on the selected grade having ≥2 sections. Side-by-side band distribution. Same conditional pattern as the teacher Insights `Compare My Sections` module — reuse the component if the data shape allows.

**Explicitly not built:** any comparison against other schools, national data, normative bands, or Tilli's aggregate dataset. See §9.

---

### 5.4 Roster — coordinator only

Operational. Identity data, never outcome data.

**Modules:**

1. **Student list** — searchable, filterable by grade and section. Columns: name, student ID, grade, section, enrolment status, parent claim status. No SEL data in any column, sort, or filter.

2. **Grade migration** — the promote / add / remove flow. This is a full flow, not an inline edit. Detailed in §6.2.

3. **Teacher–section assignment** — assign and reassign teachers to sections. Reassignment does not move historical data: a teacher's access to a section's student results ends when the assignment ends, but the section's data continues.

4. **User management** — invite, resend, revoke for teacher, coordinator, principal roles. Revoke is immediate and session-invalidating.

5. **Duplicate review queue** — near-match student duplicates surfaced for manual resolution, per the identity spec. Behind the near-match config flag; if the flag is off, this module is absent.

---

### 5.5 Reports

Export. **Both roles have full access here** — this is the screen the principal came for.

**Three outputs:**

1. **Leadership summary (PDF, one page)**
   - Scope selector: school or single grade
   - Assessment point selector
   - Contents: sections running, students assessed, band distribution by skill, movement since baseline, target vs actual if targets exist, interpretation lines
   - **No individual students. No section-level teacher attribution.**
   - Generated server-side. Reuse the WeasyPrint → qpdf pipeline from the parent snapshot report.

2. **Newsletter paragraph (copyable text)**
   - Generated from the same data, in plain parent-facing language
   - No band names, no percentages presented as scores, no skill jargon
   - Presented in a copy-to-clipboard block, editable before copying
   - This is a small feature with disproportionate value — the principal writes the parent newsletter personally

3. **Data export (CSV)**
   - Coordinator: roster and completion CSV (identity + completion, **no scores**)
   - Both roles: aggregate outcomes CSV at section level and above
   - No student-level outcome CSV exists for either role. Not a UI restriction — the endpoint does not exist.

Every export carries the assessment point name and generation date in the artefact itself.

---

## 6. Flows

### 6.1 First login (either role)

1. Land on Overview
2. If the school has no completed assessment point: outcome modules show not-yet-measured states; Overview status line reads to the next window
3. No tour, no modal, no checklist. If a role has nothing actionable, the screen says so in one sentence.

### 6.2 Grade migration (coordinator)

Full build. Not a patch on the existing roster editor.

1. **Entry** — Roster → `Start grade migration`. Available only within a configured migration window, or manually unlocked by a coordinator with a confirmation step.
2. **Review** — system proposes a promotion for every enrolled student (Grade N → N+1). Displayed as a reviewable list, grouped by current grade.
3. **Adjust** — per student, coordinator can: `Promote` (default), `Retain`, `Remove` (left the school), or reassign to a specific section. Bulk actions available per grade and per section.
4. **Add** — new intake students added in the same flow, individually or by CSV upload. CSV maps to the hybrid student ID scheme from the identity spec.
5. **Exit-grade handling** — students in the terminal grade are proposed as `Graduating`, not `Promote`.
6. **Preview** — a summary before commit: `X promoted, Y retained, Z removed, N added`. Section-by-section resulting headcounts, with a warning on any section exceeding the configured size limit.
7. **Commit** — single confirmation. Explicitly states that historical assessment data remains attached to the student and to the prior section.
8. **Post-commit** — an undo window (default 24h) that reverses the entire migration as one transaction. After that, changes are individual edits only.

**Data integrity requirement:** migration must never orphan historical results. A section's past assessment data belongs to the section-year, not to the current roster.

### 6.3 Setting targets (coordinator)

1. Available only when a Baseline assessment point is complete, and only before Midline opens
2. Per grade, per skill: set a target band distribution for Endline
3. Principal is notified in-app and can view but not edit
4. Targets appear in Outcomes and in the leadership summary export
5. Targets are optional. If never set, all target modules are absent — no nagging, no empty prompts

### 6.4 Concern routing

1. **Teacher raises** a concern about a student in their own section (originates in the teacher dashboard, not here)
2. **Concern enters the queue** with status `New`
3. **Coordinator sees** the queue with student names, section, teacher, date, and the teacher's note
4. **Coordinator routes** to a counsellor (see open decision §11.1) or marks `Handled internally`. Routing requires a note.
5. **Principal sees** counts by status only. No names, no notes, no section attribution at any point.
6. **Closure** — coordinator closes with an outcome note. Closed concerns remain in the queue, filterable.

**Never:** surface a concern as an alert, a red badge, or an alarm state anywhere a child is identifiable. This is a routing queue, not a warning system.

### 6.5 Role switching

A user holding both coordinator and principal roles (possible at small schools) sees the union of permissions, not a toggle. Do not build a "view as principal" mode.

---

## 7. States

Every module implements four states. Do not ship a module with only the loaded state.

| State | Rule |
|---|---|
| **Loading** | Skeleton at module level. Never block the whole screen — Overview renders progressively as modules resolve. |
| **Empty — no data yet** | Explains *why* and *when* data will appear. `Movement will appear after Midline · November 2026.` Never a blank panel or a zeroed chart. |
| **Empty — nothing to report** | Explicit confirmation, distinct from the above. `All sections active in the last 21 days.` The absence of problems is itself the answer. |
| **Error** | Module-scoped. States what failed and offers retry. One failed module does not take down the screen. |

**Permission-denied is not a state.** Data a role cannot see is absent from the response, not returned-and-hidden. The only exception is the deliberate count-with-explanation pattern on concerns (§5.1.4).

---

## 8. Interactions

- **Filters persist in the URL.** A principal must be able to send `?grade=3&point=midline` to a deputy and have them see the same screen.
- **Every drill-down is reversible** via breadcrumb, and every breadcrumb chain terminates at section.
- **Table sorting persists** within a session, per table.
- **No auto-refresh.** Data changes 3× a year. A polling loop or live-updating counter creates a false impression of liveness. A manual refresh control on Implementation only.
- **No infinite scroll.** Paginate the roster; the coordinator is looking for a specific student.
- **Deep links from Overview** carry their filter state into the destination screen.
- **Export is non-blocking** — generation runs server-side with a progress state; the user can navigate away and collect the file.

---

## 9. Content constraints

Hard rules. These are contractual and pedagogical, not stylistic.

**Never build, and never leave a hook for:**
- Comparison to other schools, anonymised or otherwise
- National, regional, or normative benchmark bands
- Any statement referencing Tilli's aggregate dataset across schools
- Ranking of sections, teachers, or grades against each other in a way that implies performance evaluation of staff

**Interpretation lines must be developmental, not empirical.** `Children at this stage typically…` is permitted. `Compared to similar schools…` and `In our data across schools…` are not. If a content key is missing, render the placeholder — do not fall back to a generic empirical claim.

**Skill labels** come from the shared source of truth and require Masoomi's sign-off. Do not hardcode, do not paraphrase, do not abbreviate for column width.

**No alarm states anywhere a child is identifiable.** No red, no warning icon, no "at risk" language on any screen that shows or implies a specific student.

**Scores are never exposed to leadership** in any form — not as a number, a percentage presented as a score, an average, or a derived index. Leadership sees band distributions and movement between bands.

---

## 10. Technical notes

### 10.1 Enforcement
Role permissions are enforced at the API layer. The client must not be the only thing preventing a principal from fetching student outcomes. Assume the client is hostile.

### 10.2 Audit
Log all access to: student identity data, the concern queue, and any student-result access under the `leadership_student_results_visible` flag. Actor, target, timestamp, action.

### 10.3 Academic year
All data is scoped to an academic year. The year selector appears only when >1 year exists. Prior-year data is read-only, including for coordinators. Grade migration is the boundary between years.

### 10.4 Component reuse
Where the teacher dashboard's Insights modules take a scope parameter, reuse them rather than reimplementing. Specifically: skill band distribution, progress over time, compare sections. Do not reuse the teacher dashboard's landing/hero pattern or any metaphor-carrying component.

### 10.5 Mobile
Full feature parity except grade migration and CSV upload, which are desktop-only with a clear message on mobile. Everything else, including all exports, must work on a phone — the principal will open the leadership summary on the way into the board meeting.

---

## 11. Open decisions — resolve before building the affected area

### 11.1 Is there a counsellor role?
Currently the access spec defines coordinator + principal view-only. The concern routing flow (§6.4) assumes concerns route *somewhere*. At a school with two full-time counsellors and 1,800 students, "which section needs support" is arguably the counsellor's screen, not the principal's.

**Options:** (a) counsellor as a distinct role with section-level outcome access plus concern names; (b) counsellors given the coordinator role; (c) no counsellor role, concerns terminate with the coordinator.

**Blocks:** §5.1 module 4, §6.4 steps 4–6. Build the queue with a `routed_to` field that accommodates a role reference either way.

### 11.2 Second-factor strength for admin roles
Carried over from the identity/access spec. Leadership roles see school-wide identity data — the case for a stronger factor here than for teachers is stronger than it was when the spec was written. Per-school setting. Masoomi to weigh in.

### 11.3 Near-match duplicate handling
Behind a config flag per the identity spec. Determines whether §5.4 module 5 exists.

### 11.4 Interpretation content coverage
The content table needs a signed-off entry for every `(skill, grade_band, assessment_point, distribution_shape)` combination before Outcomes can ship without placeholders. Scope this with Masoomi early — it is a content dependency, not an engineering one, and it will be the critical path.

---

## 12. Out of scope for v1

- Ask Tilli inside the admin dashboard
- Any parent-facing view
- Cross-school or multi-branch aggregation
- Scheduled or emailed reports
- In-dashboard messaging beyond the single `Message teacher` action in §5.1
- Custom report builder
- The UI unlocked by `leadership_student_results_visible` — build the flag and log, defer the interface
