# School Success Feedback — Internal Dashboard Tracker

Source: *[2026] Tilli-Measures Navigator* — "Experience the dashboard" sessions
- **1 Sep 2026** — Kalani Bandara, Mayur Arvindh, Ishani Rai
- **4 Sep 2026** — Ashwini Lothe, Mayur Arvindh, Ishani Rai

Scope: the internal Tilli platform-admin dashboard (`tilli.html` → `assets/tilli-admin.js`, data in `assets/tilli-org-data.js`).

**Status key:** ✅ Done · 🟡 Partial · ⬜ Not started · 💬 Needs discussion · ⏸ Parked

Last updated: 21 Oct 2026 (Phase A: #4 #5 #6 #12 #14 #17 · Phase B: #1 #13 · Phase C: #7 · Phase D: #9 #10 #11)
Also 22 Oct 2026: Users & Invitations merged into one menu item (see *Users* below).

---

## Summary

| # | Area | Item | Status |
|---|---|---|---|
| 1 | Schools | Per-teacher assessment log inside a school | ✅ |
| 2 | Schools | Auto-delete empty grades / sections | ✅ |
| 3 | Schools | Divide schools by country | ✅ |
| 4 | Templates | Mark the latest template to deploy | ✅ |
| 5 | Templates | Created date, last edited, created by | ✅ |
| 6 | Templates | Archive templates | ✅ |
| 7 | Deployments | School-group links | ✅ |
| 8 | Issues | Reply to / contact the reporting user | ⏸ (skipped for now) |
| 9 | Ask Tilli | Instant completion answers (school / group / who completed) | ✅ |
| 10 | Ask Tilli | Data points → report for school follow-up | ✅ |
| 11 | Knowledge Base | Manuals | ✅ (draft text) |
| 12 | Control Room | Search and jump straight to a school | ✅ |
| 13 | Schools | Archive a whole school group | ✅ |
| 14 | Schools | CSV of the All Schools list | ✅ |
| 15 | Results | Assessment results → Skill → Report → stats | ⏸ 💬 |
| 16 | Templates | Use the observation-report deployment flow for all templates | ⏸ 💬 |
| 17 | Issues | Highlight issues by school | ✅ |
| 18–24 | — | Already in place (see bottom) | ✅ |

---

## Not started

### 1. Per-teacher assessment log inside a school ✅ (21 Oct 2026)
- School hub → Assessments → **Teacher assessment log**: one row per teacher (name, email, sections, number of students), one column per teacher deployment. Each cell is Completed / In progress (x/y) / Not started. A summary line ("8 of 12 teachers done with …") and a CSV export sit above the table.
- Data: live and wizard-created schools use real teacher memberships (new `TilliAPI.teachersFor`) and real completions when teacher lanes are deployed through the planner. Other schools get generated demo teachers, with statuses weighted by the school's results.
- Gap: for mock schools, "In progress" counts are synthetic.

**Original note:**
*Feedback (4 Sep): "In school → get the status of the assessments done by each teacher (like an assessment log for teachers)."*
- Today: only a **per-student** log (School hub → Assessments → *Student assessment log*). The Staff tab shows no completion.
- To do: one row per teacher, columns per teacher-facing assessment, Completed / In progress / Not started.

### 4. Mark the latest template to deploy ✅ (21 Oct 2026)
- **Latest** = the newest *published, non-archived* template for each phase + audience (`publishedAt`). Cards show "★ Latest" or "Older version". Drafts get no badge.
- The New-deployment picker lists only published templates, grouped by phase · audience with Latest first. It shows a warning when an older version is picked.
- Demo: "Baseline · Teacher Report (2025)" is the older version.
- Gap: the school-hub deployment planner uses its own hard-coded assessment lists, so Latest only drives the New-deployment picker.

**Original note:**
*Feedback (4 Sep): "Show which is the latest template to deploy."*
- Today: template cards only show Published / Draft. No version or "latest" marker.

### 5. Template created / edited / author ✅ (21 Oct 2026)
- Templates carry `createdAt/By`, `updatedAt/By` and `publishedAt`. Every create, edit, publish, duplicate and archive stamps them. Shown on the card footer and in the template menu.

**Original note:**
*Feedback (1 Sep): "Date of creation and latest edited + who created (templates)."*
- Today: these fields aren't in the template data. The Audit Trail logs the events but cards don't show them.

### 6. Archive templates ✅ (21 Oct 2026)
- Templates have Active / Archived tabs. Archive / Un-archive is in the template menu and logged to the Audit Trail. Archived templates are hidden from new deployments, the Latest calculation and the Control Room "Draft assessments" card.

**Original note:**
*Feedback (1 Sep): "Archive the templates."*
- Today: the template menu has Edit / Duplicate / Publish / Delete only.

### 7. School-group links on Deployments ✅ (21 Oct 2026)
- Each group has a stable `code`. Group links look like `measures.tilli.app/g/<code>/parent` and `…/teacher`. Direct Assessment stays per school because it runs on a classroom device.
- Shown on each group's page (Group links). Each link has Copy and **Open ↗**. *(22 Oct 2026: the Deployments → Master Links tab was removed — per-school links are on each school's Assessments tab as "Links to share".)*
- **Open** goes to the landing page prototype (`index.html?group=<code>&as=parent|teacher`): the role step is skipped and the school picker lists only that group's active schools. Parents start at the picker; teachers keep the email-first flow and see the short list if they're new.
- Gap: real `/g/<code>/…` routing needs the production app. Archived groups have no link.

**Original note:**
*Feedback (1 Sep): "School group links on deployments."*
- Today: master links exist per school only.

### 8. Respond to an issue ⏸ — skipped for now (21 Oct)
*Feedback (1 Sep): "Respond to issue → to the user, connect with the user."*
- Today: Issue Reports only lets you change the status (open / investigating / resolved).

### 9. Ask Tilli — instant completion answers ✅ (21 Oct 2026)
- AI Assistant → **Ask Tilli** is now a full chat, using the same layout as the school admin's: history, new/delete chats, an "Answering about" scope (whole portfolio / group / country / school), starter prompts, and export as .txt. Chats are saved in this browser.
- Scripted answers (`platformAskAnswer` in `tilli-admin.js`) read the dashboard's own data:
  - completion for a school, with a per-deployment table and a link to the hub;
  - completion for a group, a country or the whole portfolio: the average, how many schools are on track / midway / behind, and the lowest schools;
  - who hasn't finished at a school: teachers not started or in progress (from the teacher log), and parent/student responses outstanding.
- A school, group or country named in the question wins over the picked scope.
- Gap: answers are rule-based (a scripted preview); swap in a model call later.

**Original note:**
*Feedback (4 Sep): "The completion rates of the whole school / school group — helpful when the school POC contacts and they need an answer right away."*
*Feedback (1 Sep): "Instead of going and checking in xx school who (teacher / student) has completed."*
- Today: the Ask Tilli page is a placeholder. The floating bubble only routes there.

### 10. Ask Tilli — reports for follow-up ✅ (21 Oct 2026)
- Ask for a "follow-up report" (optionally "below 40%", or for a group / country / school). You get the schools under the threshold with completion, the coordinator's name and email, and how many teachers haven't started. Buttons: **↓ Download CSV** (adds group, country, stage and open issues) and **Copy as text** (ready to paste into an email). The default threshold is 50%.

**Original note:**
*Feedback (1 Sep): "Ask Tilli data points, improvement / change → to create a report, follow up with schools."*

### 11. Manuals ✅ (21 Oct 2026) — draft text, edit freely
- AI Assistant → **Knowledge Base** now holds 9 searchable manuals: onboarding, grades & sections, students, templates, deployments & links, archiving, issues, exports, Ask Tilli. Steps deep-link into the dashboard.
- The content lives in the `MANUALS` array in `tilli-admin.js`. Ask Tilli answers "how do I…" questions from it.

**Original note:**
*Feedback (1 Sep): "Random → can we create manuals?"*
- The Knowledge Base page (also a placeholder) could host them.

### 13. Archive a whole school group ✅ (21 Oct 2026)
- **Archive group** is in the group's Manage menu (on the group page and the All Schools list). It is gated: you type ARCHIVE. It archives every school in the group (`archivedByGroup`). **Un-archive** restores only those schools; one that was archived on its own beforehand stays archived.
- All Schools → Archived tab shows "Archived groups", then "Archived schools". The group page shows an archived banner with Un-archive.
- The group-admin console for an archived group shows an "archived — contact Tilli" notice.
- Archived groups are hidden from the group pickers (Add School wizard, invite, school editor). A school in an archived group can't be un-archived on its own: un-archive the group or move the school.
- Gap: groups are in-memory mock data, so archive state resets on reload.

**Original note:**
*Feedback (4 Sep): "How to archive the schools in school groups."*
- **Decision (21 Oct):** archive the **whole group**. Archiving individual schools inside a group already works (group page → Archived tab).
- Today: the group menu has Rename and Delete only.
- To do: an "Archive group" action that archives every school in it, plus un-archive.

---

## Partial

### 12. Search and jump to a school from the Control Room ✅ (21 Oct 2026)
- Typing in the top-bar search suggests up to 6 schools (by name, code or city). Arrow keys and Enter jump to the school's hub. "See all results" opens the full search page.
- The Control Room has a "Find a school" field with the same behaviour.

**Original note:**
*Feedback (1 Sep): "When I log in, would like to search and go to the school from platform overview."*
- Exists: global top-bar search → a results page (schools, students, users…).
- Missing: jump straight to a school as you type (typeahead), and a school picker on the Control Room itself.

### 14. Downloadable CSV ✅ (21 Oct 2026)
- All Schools has a "↓ Schools CSV" button that exports the current view (tab, country and search all apply): 16 columns per school.

**Original note:**
*Feedback (1 Sep): "Downloadable CSV."*
- Exists: group Assessments CSV, group Staff CSV, school results CSV, Deployments → Results CSV.
- Missing: a CSV of the All Schools list itself.

### 17. Highlight issues by school ✅ (21 Oct 2026)
- Issue Reports has a school filter, plus a "Most open issues" strip of school chips (click to filter). Tabs and the crash group follow the filter.
- School cards and list rows show a red "N open issues" chip that opens the school's Issues & Logs tab. Auto-crash reports count once per crash signature.

**Original note:**
*Feedback (1 Sep): "Highlight the issue based on school."*
- Exists: School column in Issue Reports; Issues & Logs tab per school.
- Missing: filter or group by school in Issue Reports; a marker on school cards when they have open issues.

---

## Parked / needs discussion

### 15. Assessment results → Skill → Report → stats ⏸ 💬
*Feedback (1 Sep), with a reference Drive file.*
- Exists: skill tabs on each student's profile.
- Missing: a school-level skill report. **I haven't reviewed the Drive reference. To discuss later.**

### 16. Observation-report deployment flow for all templates ⏸ 💬
*Feedback (1 Sep): "Student observational report to be part of template + use the deployment feature of observational report to deploy rest of the templates."*
- Done: the observation report is a template card.
- Open: whether the other templates should deploy per phase the way the observation form does, instead of through Deployments. **The intent needs confirming.**

---

## Done

### 2. Auto-remove empty grades / sections ✅ (21 Oct 2026)
*Feedback (4 Sep): "If a grade / section does not have any students within xx days of creation of school, the grade / section gets auto deleted."*
- **Window: 60 days.** Chosen over 30 because rosters often arrive weeks after the MoU or wizard. Removing too early is worse than leaving an empty row.
- **Every grade and section has its own clock** (`addedAt`). For the starting structure, the clock begins when the school is created. Anything added later, or added back, starts a fresh 60 days. This means a school can ask for a grade or section again and it won't be removed the next day.
- A section is removed once it has had 0 students for 60 days. A grade goes too when it ends up with no sections and no students.
- Where it shows:
  - **School hub → Settings → Manage grades / sections:** an explanatory note, a "Nd left" tag on every empty section (amber within 14 days), and an **Auto-removed** list with an **Add back** button.
  - **Hub Overview + school cards:** a flag like "3 empty sections · auto-remove in 10 days" within 14 days of removal.
  - **Audit Trail:** "System / Service Role · Auto-removed empty grade / section". (Since 23 Oct 2026 the Control Room's Recent activity shows Change History, not the Audit Trail, so these no longer appear there.)
  - **Add-School wizard (Structure step):** a one-line note about the rule.
- Demo data: Asian Grammar (10 days left), Royal College Colombo (all grades removed, can be added back), Sunrise (one old empty section removed), Greenfield (a section added 12 days ago, 48 days left).
- Knobs (`assets/tilli-org-data.js`): `EMPTY_STRUCTURE_TTL_DAYS = 60`, `EMPTY_STRUCTURE_WARN_DAYS = 14`.
- Known gaps:
  - Schools created in the wizard (stored in TilliAPI) show the countdown but are **not pruned**. Their structure lives in localStorage and is rebuilt on every load.
  - The mock runs the "daily job" once at page load against a fixed TODAY. The real backend needs a scheduled job.

### 3. Divide schools by country ✅ (21 Oct 2026)
*Feedback (1 Sep): "Divide into countries."*
- **All Schools:** a country switch (All countries · India · Sri Lanka, with counts). The list of countries comes from the data. The switch applies to group cards, independent schools, search and the 0-students filter. Counts follow the Active / Archived tab.
- List view has a new **Location** column (city, country). Grid cards show the country.
- Not yet: the switch isn't on a group's own page (most groups are single-country today).

### 18–24. Already in place before this round ✅
- 18 — Clubbing schools into groups *(4 Sep: "Clubbing at school was great!")*
- 19 — Select a group first, then see its schools *(1 Sep)*
- 20 — Everything inside the school: add / merge / delete students, deletion logs, assessment results *(1 Sep)*
- 21 — Deployments inside the school's page *(1 Sep)*
- 22 — Master links *(1 Sep: "Master links are good ✅")* — now "Links to share" on each school's Assessments tab (22 Oct 2026)
- 23 — Self-guided assessments moved under Templates *(1 Sep)*
- 24 — Student observation report is part of Templates *(1 Sep)*

### Users — no change requested
*Feedback (1 Sep): invitations not used so far; role change used only once.*
- 22 Oct 2026: Users and Invitations are now one menu item (**Users & Invitations**) with tabs, a shared filter bar (search · role · school · school group) and a paged Users table — one sidebar line instead of two.

---

## Known issues to share with Mayur (23 Oct 2026)

Changes made on 23 Oct 2026: **Base grades** (every grade/section keeps a fixed base, shown as "Sunflowers (Grade 1)" / "Rose (Grade 1A)" when renamed, used by Ask Tilli; rename in Grades & sections; teacher sign-up lists the school's own grades), **Rollout stage removed** (no wizard step, no Stage column/chip/CSV column, not in Ask Tilli), **Country + City** required, **Add School wizard trimmed** (Grades step text cut, hover reason on a greyed-out Next), **Board** is required (Add School and Edit school), **Other** asks for the board name, Edit school can change boards, Board mix counts each board separately, **Staff Members** counts real staff accounts, and Control Room **Recent activity** shows Change History.

Open issues that came out of those changes:

**Board**
- **Bars can add up to more than the school count.** A school with several boards counts once under each board in Analytics → Board mix, so the total won't match *Active Schools*. *Possible fix:* a line under the chart such as "N schools · M run more than one board".
- **Board names typed under Other aren't matched to each other.** "Montessori" and "montessori", or a typo, each get their own bar. *Possible fix:* when saving, match the typed name to an existing one regardless of upper/lower case.
- **Older schools saved as plain "Other" can't be saved until someone types the board name.** This is intended, but it may surprise whoever opens Edit school.
- **Some school edits are lost on reload.** On schools created through the wizard, changes to name, type, city and country disappear after a reload. Only board and group are saved properly. *Possible fix:* one save call that covers every field.

**Staff Members tile**
- **Invited School Group Admins aren't counted.** They're stored as accounts but not added to the platform user list, so they're missing from the tile and from Users. *Possible fix:* add them to the list when they're invited, or merge accounts into the count.
- **The "+N" badges on the other stat tiles are made up.** They should come from real history once it exists, or be removed.

**Recent activity (Control Room)**
- **Admin-only actions are no longer on the Control Room.** Template publishes, role changes, archives and the system's "auto-removed empty section" entries only appear in the Audit Trail. *Possible fix:* a small "Admin actions →" link next to View all.
- **View all can show fewer changes than Recent activity.** Change History opens on *Past 7 days*, but Recent activity shows the 10 newest changes from any date, so on a quiet week some rows won't appear after clicking View all. *Possible fix:* let the link set the date range (e.g. `?range=all`).
- **One busy school can fill all 10 rows.** For example, a teacher entering a whole class at once. *Possible fix:* group rows by school, or limit how many rows one school can take.

**Rollout stage (removed)**
- **The stage still exists in the data, just not on screen.** Sample schools still have a stage, and it's used to decide which phases get sample history. Real schools no longer get one. If the team wants contract status back (MoU signed / Renewed), it should be a separate setting on the school page, not a wizard step.
- **Ask Tilli's "running" now means "has some completion".** It used to mean "not at MoU". A school with phases deployed but 0% done now counts as "not started yet".

**Add School wizard**
- **Edit school uses free-text Country and City, but the wizard uses fixed dropdown lists.** A typo or "india" in Edit school won't match "India", and that school drops out of Analytics → Outcomes by region and the country grouping. *Possible fix:* give Edit school the same Country → City dropdowns as the wizard.
- **The hover reason on a greyed-out Next may not appear in Firefox or Safari.** It uses the browser's built-in tooltip, which those browsers don't always show on disabled buttons. *Possible fix:* show the reason as small text under Next while it's disabled.
- **The 60-day auto-remove rule is only visible after a grade is added.** It moved into a ⓘ next to the totals line, which is hidden while there are no grades. *Possible fix:* mention it in the Profile step's intro if people get caught out.

**Base grades**
- **Demo schools now read "Kindergarten (UKG)" / "Kindergarten A (UKG A)".** Kindergarten counts as UKG, so the base shows in brackets. *Possible fix:* if it looks noisy, take `kindergarten` out of the inference list in `tilli-api.js` so it's no longer read as UKG.
- **One grade per base.** A school can't add two separate Grade 1s (e.g. English- and Tamil-medium). *Workaround:* one grade with renamed sections ("English (Grade 1A)", "Tamil (Grade 1B)"). *Possible fix if needed:* allow repeated bases and give their sections distinct letters.
- **Rename reloads a wizard-created school's structure, which drops unsaved additions.** Adding a grade or section in Grades & sections for these schools only lasts until reload, so a rename undoes anything added since. *Possible fix:* save add-grade and add-section to the school's stored data, as rename now does.
- **Teacher invites are matched by grade and section name on rename.** Names that differ only in spacing won't update. *Possible fix:* store a section ID on invites.
- **CSV columns moved.** Roster, teacher and history CSVs gained Base grade / Base section columns, so anything reading them by column position is off by one or two.
- **Promotion changed for Grade 6 and above.** These grades used to "promote" to themselves; they now step up a base (Grade 6 → Grade 7).
- **Labels are cached per screen.** A rename made in another tab shows after the next screen change or reload.
- **Long names can crowd the school admin's overview diagram.** Labels like "Sunflowers (Grade 1)" may overlap at the whole-school view.

**Change History**
- **A school's sample history disappears when it goes live.** Sample history is only generated for schools without a live data store. When a school switches to live, its sample rows disappear and only copied Audit Trail rows are left. *Possible fix:* pre-fill the live store with the sample history when the school switches.
