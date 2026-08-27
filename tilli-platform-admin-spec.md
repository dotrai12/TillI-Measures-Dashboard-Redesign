# Tilli Platform Admin — Build Spec

**Audience for this doc:** Claude Code (build agent)
**Product surface:** Internal Tilli platform admin. This is the layer **above** school admins (Coordinator/Principal). No school-admin or parent-facing screens are in scope here.
**Scope:** Parity rebuild. Every capability in the current 17-screen admin survives; nothing is cut silently. The work is re-organising the information architecture, consolidating scattered context, and making the landing page actionable. Items that are redundant or cross-product are **flagged** in §10, not removed.
**Role model (v1):** A single **Super Admin** role with full access. But every destructive/write action is tagged `[GATED]` so a permission layer (Ops, Support, read-only) can be dropped in later without re-architecting. See §9.

**Out of scope for this spec (already handled downstream):** colours, fonts, design system, spacing, iconography, bottom bar / mobile chrome. Do not invent visual design. Build structure, behaviour, states, and data flow.

---

## 1. Global principles

These apply to every screen. Read them once; they are assumed everywhere below.

1. **Server computes, client renders.** All aggregates, queues, counts, tier/status derivations, and filtered views are computed server-side and passed to the frontend as structured objects. The frontend does not re-derive business logic (e.g. "school is stalled", "invitation is expiring", "duplicate detected"). This prevents rule drift between layers.
2. **Every list is filterable, searchable, and paginated.** Default page size 25. All lists expose the same filter/sort/search contract.
3. **Every destructive action is gated + logged + confirmed.** `[GATED]` = will be permission-checked later. Every such action writes to the audit trail (§8.4) and requires a typed/explicit confirmation, never a bare button.
4. **Empty, loading, and error states are required, not optional.** Each module below names its empty state. Loading = skeletons, not spinners-on-blank. Errors are inline and retryable.
5. **Deep-linking everywhere.** Every entity (school, student, user, deployment, issue) has a stable URL. Every count/badge in the Control Room and School Hub links to the pre-filtered list that produced it.
6. **Nothing is a dead end.** A student row links to its school hub; an issue links to the school + page; a deployment links to its template and school. Cross-links are specified per module.

---

## 2. Information architecture (new)

Six top-level sections. The old nav was flat (17 items in loose groups); this regroups by *what the internal user is trying to do*, and introduces two new surfaces (Control Room, School Detail Hub) that consolidate what used to be scattered.

```
Global search (persistent, top)  →  schools · students · users · invitations · deployments

1. CONTROL ROOM            (was: Platform Overview — rebuilt as an action queue)
2. SCHOOLS
     ├─ All Schools        (was: Schools Management — groups, active/archived, add/edit/archive)
     └─ School Detail Hub  (NEW — consolidates one school's students, staff, assessments, issues, logs)
3. STUDENTS
     ├─ Student Directory  (NEW global roster — read/search across schools)
     ├─ Add Students       (was: Manage Students — manual + CSV)
     └─ Merge Students     (dedupe + merge history)
4. ASSESSMENTS
     ├─ Templates          (incl. the Teacher Observation Form — an Observation-audience template)
     ├─ Self-Guided        (gamified EMT / Hearts & Flowers / Memory Game)
     ├─ Deployments
     │    ├─ Deployments   (deploy any template, incl. the Observation Form)
     │    └─ Results        (was: AMES Data / Results & Data — responses for every deployment)
     └─ Master Links
5. PEOPLE
     ├─ Users
     └─ Invitations
6. AI ASSISTANT            (cross-product — flagged §10)
     ├─ Ask Tilli
     └─ Knowledge Base
7. PLATFORM HEALTH
     ├─ Issue Reports
     ├─ Health Monitor
     ├─ Deletion Logs
     └─ Audit Trail        (NEW — optional, §8.4 + §10)
```

**Old → new map** is in Appendix A so parity can be verified at a glance.

---

## 3. Control Room  *(landing page — replaces Platform Overview)*

**Problem it solves:** the current Overview shows vanity stats (8 groups / 61 schools / 3,195 students / 384 staff) and a "recently added" list. It tells you nothing that needs doing. The internal team lands here every day and should immediately see *what needs attention*.

**Layout, top to bottom:**

### 3.1 Needs-Attention queue (primary)
A set of queue cards, each showing a count and deep-linking to the pre-filtered list. Server returns each as `{ key, label, count, severity, deeplink, items[] }`. Order cards by severity, then count. A card with count 0 collapses to a muted "all clear" row rather than disappearing (so the team trusts the queue is live).

Cards to compute:
- **Open issues** — count of Issue Reports with status `open` (currently 35). Severity high. → Issue Reports, filtered `open`.
- **Platform health** — current Health Monitor state (`healthy` / `degraded` / `down`). If not healthy, this card floats to the top regardless of count. → Health Monitor.
- **Schools with 0 students** — active schools where `student_count = 0` (e.g. Asian Grammar School, Compassion International, Royal College Colombo). Signals a stalled onboarding. → All Schools, filtered.
- **Users with no role** — accounts with `role = none` and no school. These are dead accounts cluttering User Management. → Users, filtered `no role`.
- **Expiring / expired invitations** — invitations expiring within 7 days, or already `expired` and never activated (e.g. the expired NMAJS admin invite). → Invitations, filtered.
- **Duplicate students detected** — pairs the system flags as likely duplicates (same normalised name and/or admission number within a school). Feeds Merge. See §4.3 for the detection contract. → Merge Students, pre-loaded.
- **Draft assessments** — templates or observation-form phases still in `draft` that a deployment may be waiting on (e.g. Endline / Midline teacher self-reports sitting in Draft). → Templates, filtered `draft`.
- **Deployments needing attention** — deployments `ending within 3 days` (still live, window closing) and deployments `scheduled` whose start date has passed but status hasn't flipped to live. → Deployments, filtered.

> Do **not** hardcode any of the example values above — they are illustrative of the state in the source screens. All counts are live from the server.

### 3.2 Platform stats (secondary)
Keep the four tiles (School Groups, Active Schools, Total Students, Staff Members) but demote them below the queue and add context: each tile shows the current number **and** a delta vs. 30 days ago (`+3 schools`, `+412 students`) when history is available; if no history, show number only. Tiles are not clickable unless they map to a list (Schools → All Schools; Staff → Users filtered to staff roles).

### 3.3 Recent activity (tertiary)
A single reverse-chronological feed merging: schools added, students merged, students deleted, roles changed, deployments created, templates published. Each row: timestamp, actor, action, entity (linked). This is the human-readable face of the Audit Trail (§8.4) and replaces the old "recently added schools" list. Cap at 20, "view all" → Audit Trail.

### 3.4 Quick actions
Persistent buttons: **Add School** `[GATED]`, **Invite User** `[GATED]`, **New Deployment** `[GATED]`, **New Template** `[GATED]`. These are shortcuts into the respective create flows with nothing pre-filled.

**Empty state:** if the platform genuinely has nothing in any queue, show "Nothing needs your attention right now" plus the stats and recent activity. (Rare, but specify it.)

---

## 4. Schools

### 4.1 All Schools  *(was: Schools Management)*
Parity with the current screen, kept clean.

- **Header actions:** New Group `[GATED]`, Add School `[GATED]`. Grid/list toggle.
- **Group filter chips** across the top (All + each school group with its count), matching current behaviour. Chips have an overflow menu (the `⋮` per group) for group-level actions: rename group `[GATED]`, delete/empty group `[GATED]`.
- **Active / Archived tabs** with counts (e.g. Active 61 / Archived 5).
- **Search** by school name or code.
- **School card** shows: name, type (e.g. "Independent school"), code (e.g. `ARUG-4164`), group (or "No group"), and three stats — grades, students, staff. Primary actions: **Edit** `[GATED]`, **Archive** `[GATED]`. Clicking the card (or its arrow) → **School Detail Hub** (§4.2), *not* an edit modal. This is the key change: the card is a doorway to the hub, not just an editor.
- **Add School** flow `[GATED]`: name, type, group (optional), initial grades/sections. On create → land on the new school's hub.
- **Archive** `[GATED]`: confirm, then move to Archived tab. Archiving must not delete students or data; it hides the school from active lists and (specify) suspends its deployments and master links. Un-archive available from the Archived tab.

**Empty state:** "No schools yet — add your first school."

### 4.2 School Detail Hub  *(NEW — the biggest win)*
**Problem it solves:** today, understanding one school means visiting Schools, Manage Students, Merge, Deployments, Master Links, Users, Invitations, Deletion Logs, and Issue Reports separately, filtering each by hand. This hub pulls a single school's entire picture into one place. Everything here is **auto-scoped to this school** — no school selector, no cross-school leakage.

**Header (persistent across tabs):** school name, code, type, group, active/archived status; quick stats (grades, sections, students, staff); primary actions Edit `[GATED]`, Archive `[GATED]`. A breadcrumb back to All Schools.

**Tabs:**

**(a) Overview**
- Structure summary: grades and sections tree with per-section student counts.
- Assessment progress: for this school, the status of each phase (Baseline/Pre, Midline/Mid, Endline/Post) — deployed? window? completion %? Pulls from Deployments + Observation Form deployment state.
- This school's open issues (count + latest few) → links into the Issues tab.
- Onboarding flags: 0 students, 0 staff, no active deployment, no master link shared — whichever apply, shown as small warnings mirroring the Control Room logic but scoped here.

**(b) Students**
- Roster for this school: searchable/filterable by grade, section, name, admission number. Columns: name, admission number, grade/section, status.
- **Add student** `[GATED]` — manual or CSV, school pre-selected (the current Add Students form, minus the school picker). CSV upload with validation preview before commit.
- Row actions: view student, edit `[GATED]`, delete `[GATED]` (writes to Deletion Logs).
- **Merge within this school** → opens Merge (§4.3) pre-scoped to this school.
- Inline link to this school's slice of Deletion Logs.
- Empty state: "No students yet — add students or import a CSV."

**(c) Staff & Access**
- Users at this school (from User Management), with role and assigned sections. Row actions: change role `[GATED]`, edit sections `[GATED]`, remove from school `[GATED]`.
- This school's invitations (pending / activated / expired) with resend `[GATED]` and revoke `[GATED]`.
- **Invite to this school** `[GATED]` — the New Invitation flow, school pre-filled.
- Empty state: "No staff yet — invite a school admin or teacher."

**(d) Assessments**
- Deployments scoped to this school (the Deployments table, filtered): assessment, type, phase, time window, status. Actions: new deployment `[GATED]` (school pre-filled), edit/end `[GATED]`.
- Master Links for this school: the per-school hub links (parent / teacher / direct), each with Copy Link. This is where the current Master Links "School Links" list belongs, per-school.
- Which templates / observation-form phases this school has access to, and their publish state.
- Download CSV of this school's results.

**(e) Issues & Logs**
- Issue Reports filtered to this school (reporter, role, page, device, date, status) with the same status controls as the global screen (§8.1).
- Deletion Logs filtered to this school.

**(f) Settings**
- Edit profile `[GATED]`, manage grades/sections `[GATED]`, group assignment `[GATED]`, archive `[GATED]`.

> **Data contract:** the hub loads from a single `GET /schools/:id/summary` returning a structured object with nested `structure`, `assessment_progress`, `flags`, and counts, plus lazy-loaded tab data. Don't fan out to nine endpoints from the client.

### 4.3 Merge Students  *(kept, upgraded)*
Parity with current (Step 1 select master, merge, history) plus the detection feed that powers the Control Room card.

- **Step 1 — Select master student:** search by name / admission number. "This profile is kept; all merged data re-links here."
- **Step 2 — Select duplicate(s):** choose the profile(s) to merge in. Show a side-by-side diff (name casing, admission number, grade/section, assessment counts) so the operator can confirm they're the same child before committing. `[GATED]`
- **Merge action** `[GATED]`: re-links assessment data to master, deletes the duplicate, writes both a Merge History row and a Deletion Log row (as today). Requires explicit confirmation naming both records.
- **Suggested duplicates:** server returns likely-duplicate pairs (same normalised name — case-insensitive/trimmed — and/or same admission number within a school). This list is what the Control Room "Duplicate students detected" card counts and links to. Each suggestion pre-loads Step 1/Step 2 for one-click review (never one-click merge — always confirm).
- **Merge History** table: date, master, duplicate (deleted), re-linked count, skipped count. Filter by school and date.

**Note the current data smell (flag, don't fix blindly):** merge history shows many rows with `re-linked 0` and `skipped 0` — merges that moved no assessment data. Surface a subtle "0 re-linked" indicator on such rows so the team can spot no-op or mistaken merges. Real fix is Masoomi/data-side; the UI just makes it visible.

---

## 5. Students *(global)*

### 5.1 Student Directory *(NEW)*
A global, cross-school read/search roster — the thing that's missing today (you can only reach students via a school). Search by name or admission number across all schools; filter by school, group, grade, section. Columns: name, admission number, school, grade/section. Row → opens that student inside their School Hub (Students tab), not a separate global student page, to avoid two sources of truth. Primarily a lookup tool; write actions happen in the school context.

### 5.2 Add Students *(was: Manage Students)*
The existing global add form (manual + CSV) with the school selector retained, for when the operator is working across schools. Functionally identical to the hub's Add-student, minus the pre-scoping. Both call the same endpoint.

### 5.3 Merge Students
Global entry point to §4.3 (same tool, no school pre-scope).

> These three are grouped so "everything student-shaped" lives in one section, while day-to-day student work still happens inside the School Hub.

---

## 6. Assessments

Parity — every current capability kept. The old standalone **Observation Form** surface is dissolved: it is an assessment template (edited under Templates), deployed through the normal Deployments flow, and its responses read from Results — now a tab under Deployments. This removes the three-way overlap the old §10.4 flagged between Templates / Observation Form; only Templates and Self-Guided remain as distinct authoring surfaces.

### 6.1 Templates
- Grid of assessment templates. Each card: title, audience tag (Teacher / Parent / Direct Assessment / **Observation**), status (`Published` / `Draft`), description.
- Actions per template (`⋮`): edit `[GATED]`, duplicate `[GATED]`, publish/unpublish `[GATED]`, delete `[GATED]`.
- **Teacher Observation Form** is a first-class template (audience: Observation). Because it carries a shared question bank published *per phase* (Pre/Mid/Post) rather than a single status, its card opens a dedicated editor instead of the generic `⋮` menu:
  - **Question bank** — the shared ~21-item bank, with Preview and Download CSV.
  - **Phase publishing** — Pre / Mid / Post, each with a publish/unpublish toggle `[GATED]`. Publishing a phase makes it deployable. (The old per-school *access* panel is gone; schools receive the form by being deployed to — §6.3.)
- New Template `[GATED]`.
- Filters: audience, status, phase. Draft templates feed the Control Room "Draft assessments" card.

### 6.2 Self-Guided Assessments
- Grid of gamified assessments (EMT 1/2/4, Hearts & Flowers, Memory Game), each with its skill tags (SEL / Cognitive) and a Manage action `[GATED]`.
- Manage → configure that game's questions/parameters and school access.

### 6.3 Deployments *(two tabs: Deployments · Results)*
Deployments is now the home for both *pushing* an assessment out and *reading* what came back.

**(a) Deployments tab**
- Global table: assessment, school, audience, phase, time window, chain, status (`Scheduled` / `Live` / `Ended`).
- New Deployment `[GATED]`; the assessment picker includes every template, **including the Teacher Observation Form** — this is how a school "gets" the observation form (replacing the old per-school access panel). Row actions edit / end / duplicate `[GATED]`.
- Status is **server-derived** from the time window + publish state (don't let the client compute Live/Ended from dates). Deployments whose window is closing or whose scheduled start has passed feed the Control Room card.
- "Gamified" badge where applicable; chain column for chained follow-up assessments. Each row deep-links into the Results tab, pre-filtered to that assessment.

**(b) Results tab** *(was: AMES Data / Results & Data)*
- One inspectable row per deployment: school, assessment, phase, audience, responses / expected, completion %, status, updated. Filter by phase and free-text (school or assessment); Download CSV. Observation responses land here alongside every other assessment — no separate observation results view.

### 6.4 Master Links
- Three hub links (Parent / Teacher / Direct Assessment), each with the "Entry points only / hide chained follow-up assessments" toggle and Copy Link, plus the expandable per-school link list with Copy Link per school.
- The per-school links also surface inside each School Hub → Assessments (§4.2d). Same data, two entry points.

---

## 7. People

### 7.1 Users *(User Management)*
- Search by name/email; filters: role, school, school group. "N users found" count.
- Columns: user (name + email), role, school, change-role control, actions.
- **Change role** `[GATED]` inline (Assign role / Teacher / School Admin / School Group Admin / etc.).
- Where a user has a school + role: **Sections** `[GATED]` (assign sections) and **Remove from school** `[GATED]`.
- **Delete user** `[GATED]` (the trash action) — confirm + audit.
- **"No role" filter** is a first-class quick filter; it's what the Control Room "Users with no role" card links to. Consider bulk-select for cleaning these up `[GATED]`.
- Note: current screen reads "1000 users found" — confirm whether that's a true count or a page cap; pagination/virtualisation required at this scale.

### 7.2 Invitations
- Table: recipient (name + email), role, school, status (`Activated` / `Account Created` / `Expired`), delivery (e.g. "Email sent"), created, expires, actions.
- **New Invitation** `[GATED]`: recipient, role, school, delivery method.
- Row actions: **Reset password** (where an account exists), **Resend** `[GATED]` (esp. for expired/expiring), **Revoke** `[GATED]`.
- Filters: status, delivery method, sort (newest first). Expiring/expired invitations feed the Control Room card.

---

## 8. Platform Health

### 8.1 Issue Reports
- **Support notification recipients** panel: list of emails that get notified on new issues, each with active toggle `[GATED]` and remove `[GATED]`; add-recipient input `[GATED]`.
- **Issue list:** reporter (name/email + role), school, grade/section, page, device/browser, date, status (`open` / `investigating` / `resolved`). Status tabs (All / Open / Investigating / Resolved) with counts. Filters: role, school, date range, search by name/admission number.
- Row: view detail `[GATED for status change]`; change status `[GATED]`. Detail shows full report + reporter context + a link to the school hub and the reported page.
- Auto-crash reports (role `Auto-Crash`) are grouped/collapsible so a burst of identical crashes from one device (as in the source data) doesn't drown the human-filed issues. Open count here is the Control Room's top card.

### 8.2 Health Monitor
- Current platform health state + recent history/incidents. Whatever signals it currently tracks are kept. Its state drives the Control Room health card and floats to the top when not `healthy`.

### 8.3 Deletion Logs
- Audit trail of student deletions (as today): deleted-at, student name, code, grade/section, school, deleted-by. Search + school filter. "N records found" count.
- Deleted-by must distinguish a human actor (e.g. a named user) from `System / Service Role`, exactly as the current data does, so bulk system deletions are legible.
- Read-only. This is evidence, never editable.

### 8.4 Audit Trail *(NEW — optional, see §10)*
Today, deletions are logged and merges have their own history, but **role changes, archives, publishes, deployment edits, and invitation actions are not centrally logged.** Recommend one append-only audit trail capturing every `[GATED]` action: timestamp, actor, action, entity, before/after where relevant. Deletion Logs and Merge History become filtered views of it. This is what powers Control Room "Recent activity" (§3.3). Marked optional because it's the one place this spec proposes *new* capability rather than reorganising — your call in §10.

---

## 9. Gated actions register *(for the future permission layer)*

Every action below is full-access for the v1 Super Admin, but must be built behind a single permission check so a role layer drops in later. Group them so roles can be defined against groups, not 40 individual flags.

| Group | Actions | Likely future non-super role that keeps it |
|---|---|---|
| **School structure** | add/edit/archive school, manage groups, manage grades/sections | Ops |
| **Student data — safe** | add student, CSV import, edit student | Ops / School Success |
| **Student data — destructive** | delete student, **merge students** | Super Admin only |
| **Staff & access** | invite, resend, revoke, change role, assign sections, remove from school, delete user | Ops (invite/resend); Super Admin (role/delete) |
| **Assessment authoring** | create/edit/publish/unpublish/delete templates, configure observation form + phases, manage self-guided, school access toggles | Super Admin / Assessment lead (Masoomi) |
| **Deployments** | create/edit/end deployments | Ops |
| **Health/support** | change issue status, manage notification recipients | Support |
| **Read + export** | view any list, download any CSV, global search | everyone (incl. read-only) |

The **freeze scenario** you just sent School Success maps cleanly to this: "read + export only, no add / merge / edit" = the Read+export group ON, everything else OFF. Build so that state is expressible.

---

## 10. Open decisions — flag list for Ishani

Lock these before/at build. Defaults noted; none block starting on the reorganisation itself.

1. **AI Assistant is cross-product.** Ask Tilli + Knowledge Base configure the *Ask Tilli* product, not Measures. Keep them in this admin (current default), or split them into a separate Ask Tilli admin later? *Recommend: keep for now, grouped under their own section, revisit when Ask Tilli gets its own admin.*
2. **Audit Trail (§8.4).** Build the unified append-only log now (recommended — it's load-bearing for Control Room "Recent activity" and closes the gap where role changes/archives/publishes aren't logged), or ship v1 with only the existing Deletion Logs + Merge History and add it later? *Recommend: build a minimal version now.*
3. **Naming fixes.** ~~(a) Observation Report vs Form. (b) "AMES Data" → Results & Data.~~ **Resolved:** the observation surface is now the **Teacher Observation Form** template, and AMES Data is the **Results** tab under Deployments. Confirm the label "Results" reads clearly for the team.
4. ~~**Three assessment-authoring surfaces.**~~ **Resolved:** Observation Form is folded into Templates, so only Templates and Self-Guided remain as authoring surfaces. Open question deferred: whether the Observation Form should eventually become an ordinary single-status template, or keep its bespoke per-phase editor.
5. **Student Directory write-through.** Confirm the global directory is lookup-only and all student writes happen in the school context (recommended — one source of truth), vs. allowing edits from the global list.
6. **Users "1000 found".** Confirm whether that's a real count or a cap; sets the pagination/virtualisation approach.
7. **Duplicate-detection rule.** The suggested-duplicates feed needs its match rule locked (name-normalised only? admission-number match? both?). This is a Masoomi-adjacent data call. *Recommend: same-admission-number OR same-normalised-name within a school, shown as suggestions only, never auto-merged.*

---

## Appendix A — Old → new parity map

| Current screen | Lands in | Notes |
|---|---|---|
| Platform Overview | **Control Room** (§3) | Rebuilt: action queue primary, stats demoted, recent activity feed |
| Ask Tilli | AI Assistant → Ask Tilli (§6-AI) | Cross-product, flagged |
| Knowledge Base | AI Assistant → Knowledge Base | Cross-product, flagged |
| Schools (Management) | Schools → **All Schools** (§4.1) | Card now opens the Hub |
| — | Schools → **School Detail Hub** (§4.2) | NEW; consolidates the scattered context |
| Manage Students | Students → **Add Students** (§5.2) + hub Students tab | Same endpoint, two entry points |
| Merge Students | Students → **Merge** (§4.3) | Upgraded with suggestions + diff |
| — | Students → **Student Directory** (§5.1) | NEW global roster (lookup) |
| Templates | Assessments → Templates (§6.1) | Now also hosts the Observation Form |
| Student Observation Report | Assessments → Templates → **Teacher Observation Form** (§6.1) | Folded in — an Observation-audience template; deploy via Deployments, results under Deployments |
| Deployments | Assessments → **Deployments** tab (§6.3a) | Status server-derived; assessment picker now includes the Observation Form |
| Master Links | Assessments → Master Links (§6.4) + hub Assessments tab | Same data, two entry points |
| Self-Guided Assessments | Assessments → Self-Guided (§6.2) | Parity |
| AMES Data | Assessments → Deployments → **Results** tab (§6.3b) | Merged: results nested under Deployments |
| Invitations | People → Invitations (§7.2) | Parity |
| Users | People → Users (§7.1) | "No role" first-class filter |
| Deletion Logs | Platform Health → Deletion Logs (§8.3) | Read-only evidence |
| Health Monitor | Platform Health → Health Monitor (§8.2) | Feeds Control Room |
| Issue Reports | Platform Health → Issue Reports (§8.1) | Auto-crash grouping added |
| — | Platform Health → **Audit Trail** (§8.4) | NEW, optional |

**Parity check:** all 17 current screens are accounted for. The only *new* surfaces are Control Room (rebuild of Overview), School Detail Hub, Student Directory, and the optional Audit Trail — no capability removed.
