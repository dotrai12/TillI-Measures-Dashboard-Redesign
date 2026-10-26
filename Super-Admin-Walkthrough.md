# Super Admin walkthrough — try every feature, step by step

A hands-on tour of the Tilli platform admin (`tilli.html`). It's ordered the way the work happens in real life: set up a school, plan its assessments, deploy them, watch progress, fix problems. Each mission ends with **✅ You should see** so you know it worked.

Tick the boxes as you go. Logins and school codes are in [Demo-Logins.md](Demo-Logins.md).

---

## Before you start

- [ ] Open `index.html` → **Get started** → **Tilli Team** → `team@tilli.org` (any password). You land on the **Control Room**. (Opening `tilli.html` directly also works.)
- [ ] **Want a clean slate?** Clear this site's local storage and reload — the four demo schools are rebuilt and anything you created is removed.
- [ ] Keep in mind: most portfolio schools run on a fixed demo date (27 Aug 2026). The four demo schools — **Banyan Tree, Lotus Valley, Kandy Hill, Colombo Kids** — are dated from the day they were seeded in your browser, so their "live" phases are live *today*.

**The demo schools at a glance**

| School | Code | Use it for |
|---|---|---|
| Kandy Hill | KNDY-8890 | A live Baseline, adding students, the own-class rule |
| Banyan Tree | BNYN-7712 | All three phases (two ended, Endline live) |
| Lotus Valley | LOTS-3390 | Deploying a phase that isn't deployed yet (Endline) |
| Colombo Kids | CLMB-6604 | Scheduled phases (nothing live yet) |
| Heritage Oaks | HROK-4410 | A school in its 3rd year: past years, year over year, starting a new year |
| Little Sprouts | LSPR-2210 | Student reports, editing and merging students |
| Sunrise | — | Issue reports, crash reports, auto-removed sections |
| Greenfield | — | Student assessment log and results CSV |
| Old Oak Montessori | — | The archived school (un-archive / delete) |

---

## Mission 1 — Find your way around (5 min)

- [x] **Control Room**: read the **Needs attention** cards. Click **Users with no role** → you land on a filtered list → **clear** → back.
- [x] In **Find a school**, type `Kandy` → pick **Kandy Hill School** → its school page opens. Go back.
- [x] **Platform stats**: click **Active Schools** and **Staff Members** (both are links).
- [x] **Recent activity** (the 10 newest school-side changes) → **View all →** opens Change History.
- [x] Click **? Help** (top right of any screen) → ask `what does completion mean` → **Continue in Ask Tilli →**.
- [x] Hover any small **ⓘ** next to a title (e.g. *Needs attention*) to see what it means.
- [x] Bottom-right bubbles: **Ask Tilli** and **Need help?** (email the team / report a problem).
- [x] **Analytics**: Outcomes by region, Board mix, then the **Completion ranking** — switch **Schools ↔ School groups** and click a row.

✅ You should see each card take you to a pre-filtered list, and Help answer in place.

---

## Mission 2 — Onboard a new school (10 min)

**Create it**
- [x] Control Room → **+ Add School** (or All Schools → **+ Add School**).
- [x] **Profile**: name it (e.g. *Test Academy*), tick a board (try **Other** → type a name), pick **Sri Lanka** → a city, choose a group — or **＋ New group…** to make one on the spot — and leave **Joined** as today. Name, board, country and city are required.
- [x] **Grades**: quick-add **Grade 1** and **Grade 2**, add a section to one, rename a grade or section by clicking its name (its base shows in brackets, e.g. *Sunflowers (Grade 1)*), add a custom grade by picking its **Base grade…**, watch the total update.
- [x] **First admin**: enter a name + email (or **Skip this step →**).
- [x] **Review** → **Create school**.

✅ The new school's page opens with a toast. Its **Staff & Access** tab shows a **Demo access & codes** card (coordinator login, school code).

**Fill it**
- [x] **Students** tab → **+ Add Students** → **Manual**: add two children to a section → **Import 2 students**.
- [x] **+ Add Students** again → **CSV import** → **Insert sample** → **Validate** (one row has an error) → **Import N valid rows**.
- [x] **Staff & Access** → **Copy code** on the **School code** (teachers who enter it join as teachers; it's also the code in the school's links).
- [x] **+ Invite to this school** → invite a teacher → note the **Temporary password** in **Invitation created** → **Copy credentials**.

✅ Students show in the directory with a pager; the invitation shows under **Invitations**.

---

## Mission 3 — Organise schools and groups (10 min)

- [ ] **All Schools**: switch **All countries / India / Sri Lanka**, toggle **▦ grid / ☰ list**, search `BNYN`.
- [ ] **↓ Schools CSV** downloads what you're looking at.
- [ ] Control Room → **Schools with 0 students** → see the filter banner → **clear**.
- [ ] **New Group** → create *Test Group*. Open any school → **Edit** → move it into *Test Group*.
- [ ] Open the group page (click it on All Schools):
  - [ ] **Group links** → **Open ↗** on the Parent link (you land on "Pick your school in …"), then on the Teacher link.
  - [ ] **↓ Assessments CSV** and **↓ Staff CSV**.
  - [ ] **Manage ⋯** → **Rename group**.
  - [ ] **Manage ⋯** → **Archive group** (type `ARCHIVE`) → it lands under **Archived** → open it → **Un-archive group**.
- [ ] **Archived** tab → **Old Oak Montessori** → **Un-archive**, then archive it again (`ARCHIVE`), then **Delete** (`DELETE`) if you want to see the full path.
- [ ] **Sunrise** → **Settings** → **Manage grades / sections** → see the days-left tags → under **Auto-removed** click **Add back**.

✅ Archiving a group takes its schools with it; un-archiving brings back only those.

---

## Mission 4 — Build and version an assessment template (15 min)

**The Templates list**
- [ ] **Templates** → switch **Grid / List**. In List, sort by **Template**, **Audience**, **History**.
- [ ] Read the **Phases** pills: `Baseline v2` = live version 2, `Midline ✎` = a draft, plain = not set up.

**Edit a live phase (Teacher Report)**
- [ ] Click **Teacher Report** → "Which phase do you want to work on?"
- [ ] **Baseline** → **History (2)** → **View** v1 (the 2025 version, read-only) → back.
- [ ] **Baseline** → **Edit** → you're in **Draft v3** ("v2 stays live until you publish").
- [ ] Open a question (click its title):
  - [ ] Change an option's **score**; add an option; toggle **Required**.
  - [ ] Turn on **Timed Question** and set seconds.
  - [ ] Pick a **Scoring Rule**; tick **Skills Evaluated**.
  - [ ] **Conditional Display**: show it only if an earlier question got a certain answer.
  - [ ] **Add Media** (pick an image) and an option image.
- [ ] Hover between two cards → **+** → add a **Short Answer** there. Add a **Section Break** from the bottom bar.
- [ ] Drag a card by its handle to reorder. Use a card's **⋮** → Duplicate / Move / Change type / Delete.
- [ ] **Scoring Configuration** tab → skills, highest scores, unscored questions.
- [ ] **+ Add Language** → *Tamil* → type a translation over a question.
- [ ] **Preview** (what respondents see) and **Download CSV**.
- [ ] **Publish v3** → confirm.

✅ Back on the phase picker, Baseline shows **Live v3** and **History (3)**.

- [ ] **History** → **Restore** v1 → it becomes a new draft → **⋮ → Discard this draft**.

**Set up an empty phase (Parent Report)**
- [ ] **Parent Report** → **Set up Midline** → **Copy from Baseline v1 · 12 questions** → edit → **Publish v1**.

**Correct-answer and timed templates**
- [ ] **EMT · Emotion Matching Task** → Baseline → **View v1**: correct options are marked.
- [ ] **Hearts & Flowers** → Baseline → **Edit** → tap the ○ next to an option to change the correct answer.

**New, duplicate, archive**
- [ ] **+ New template** → name + audience → it opens straight on the phase picker.
- [ ] On the list, the pencil on a template → **Duplicate** (its phases start as drafts) → **Archive** (it moves to **Archived**) → **Delete** (`DELETE`).

**The two special ones**
- [ ] **Teacher Observation Form** (pencil) → flip **Phase publishing** switches; **Download CSV**.
- [ ] **Teacher Reflection Questions** (pencil) → change a question's type, add one, reorder → **Save changes** (or **Discard**, **Reset to default**).

**Self-Guided Assessments** (bottom of Templates)
- [ ] Gear on **EMT 4** → change the item count / turn on **Published** → **Save changes**.

---

## Mission 5 — Plan and deploy a phase (15 min)

**Deploy a phase from scratch (Lotus Valley → Endline)**
- [ ] All Schools → **Lotus Valley** → **Assessments** tab → **Endline** tab.
- [ ] Set **Start** and **End** dates.
- [ ] Under **Not used in Endline**, **Turn on** a teacher, a parent and a direct assessment (direct asks **Where should it run?**).
- [ ] Drag chips between **In order** and **Any time**, and between **At school** and **At home** (only allowed places accept them).
- [ ] A chip's **⋯** → Earlier / Later in the order, Make it any time, Don't use.
- [ ] **Deploy phase** → read the summary → confirm.

✅ The tab shows **Live** (or **Scheduled** if the start is in the future), and deployed chips show their template version (e.g. **v1**).

- [ ] **Undeploy** → confirm → it goes back to draft.

**Scheduled phases (Colombo Kids)**
- [ ] **Colombo Kids** → Assessments → Baseline says **Goes live …**. Move the start date to today and watch it flip to **Live**.

**Add to a live phase (Kandy Hill)**
- [ ] **Kandy Hill** → Assessments → **+ Add assessment** → pick a template and phase. The note says which version it uses, or that the phase has no live version yet.

**The Deployments page**
- [ ] **Deployments** → **+ New deployment** → pick school, assessment (`Title — vN`), dates, **Publish now** → create.
- [ ] Control Room → **Deployments needing attention** → filtered list → **clear**.
- [ ] **Results** tab → filter by phase, search, **Download CSV**.

---

## Mission 6 — My School Check-in and the own-class rule (10 min)

- [ ] **Kandy Hill** → Assessments → **Baseline** → under *Not used in Baseline*, **Turn on My School Check-in**.
- [ ] Switch **Parents take part in Tilli Measures** off → because Baseline is live, choose **Change it now** (or try **From the next phase**). If you're warned about results already recorded by the child's own teacher, confirm.

✅ The banner **Own-class rule is on for Baseline** appears.

- [ ] Scroll to **Links to share** → **Student assessments** → **Preview** (opens `assess.html`).
- [ ] Enter `KNDY-8890` → `chamari.menon@kandyhill.lk`.

✅ **Grade 1 A** is greyed out — "Your class — another teacher assesses it".

- [ ] Pick another class → **Start** an assessment for a child → **Mark complete** → **Finish**.
- [ ] Turn **Parents take part** back on to put things back.

---

## Mission 7 — Watch progress and follow up (10 min)

- [ ] **Banyan Tree** → **Overview**: the Baseline / Midline / Endline progress cards.
- [ ] **Assessments** → **Teacher assessment log** (the last teacher is behind) → **↓ CSV**.
- [ ] **Greenfield** → Assessments → **Student assessment log** and **Results CSV**. These are empty for the four demo schools, so use Greenfield.
- [ ] **Analytics** → **Completion ranking** → **School groups**.
- [ ] **Ask Tilli**: try
  - `Completion at Kandy Hill`
  - `Who hasn't completed at Banyan Tree?`
  - `How is Vidya Trust doing?`
  - `Follow-up report for schools below 50%` → **↓ Download CSV** / **Copy as text**
- [ ] Change **Answering about** (portfolio / group / country / school), start a **+ New Chat**, export a chat, delete one.

---

## Mission 8 — Look after students (10 min)

- [ ] **Little Sprouts** → **Students** → click **Anaya Menon** → **Skill Scores**, **Multi-Perspective Report** (radar + gaps), **Progress (5-year)**.
- [ ] Back on Students → **Edit** a child (name / grade / section) → save.
- [ ] **Merge Students** → **Review →** on a suggested pair → **Continue to confirm** → type `MERGE`.

✅ A toast says how many assessments were re-linked, and the merge appears in **Merge history**.

- [ ] **Delete** a child (`DELETE`) → **Audit Trail** → **Deletion Logs →**.
- [ ] Control Room → **Duplicate students detected** takes you to the same merge screen.

---

## Mission 9 — Manage people (10 min)

- [ ] **Users & Invitations** → **Users**: filter by role, school, group; search a name; page through.
- [ ] Control Room → **Users with no role** → the dead-account filter.
- [ ] A user's **Change role** icon → pick a role (read what it can do) → **Save**.
- [ ] **Delete user** (`DELETE`).
- [ ] **+ Invite user** → role **School Group Admin** → pick a group → **Send invite** → copy the temporary password.
- [ ] **Invitations** tab → click a recipient's name for details → **Resend** → **Revoke**.
- [ ] Control Room → **Expiring / expired invitations**.

---

## Mission 10 — Platform health (10 min)

- [ ] **Issue Reports** → the **Most open issues** strip → click **Sunrise** to filter → **Clear school filter**.
- [ ] Tabs **All / Open / Investigating / Resolved** → **Change status** on an issue.
- [ ] Expand **13 auto-crash reports · grouped**.
- [ ] **Audit Trail** → find the actions you just did (publish, archive, merge…).
- [ ] **Change History**:
  - [ ] Switch **Past 7 days / Past 30 days / Custom range / All time**, the kind chips, the school filter and search.
  - [ ] Click a one-line row to expand it; use **Expand all** on a day.
  - [ ] Repeated edits collapse into one **N×** row.
- [ ] Any school → **History** tab → **Filter & search →**.

---

## Mission 11 — Help and the Knowledge Base (5 min)

- [ ] **Knowledge Base** → **Manuals** → open *Templates: phases, versions and archiving* → use an **Open … →** link.
- [ ] **FAQ** → search `links` → **Can't find it? Ask Tilli →**.

---

## Mission 12 — See it as a school group admin (5 min)

- [ ] **Lanka Learning Network** group page → **Group admin view →** (a preview).
- [ ] **Group Overview**: KPIs, schools table → open **Kandy Hill** (live) and **Colombo Kids** (scheduled) read-only.
- [ ] **Change History** — only this group's schools.
- [ ] Profile menu → **← Tilli platform**.
- [ ] Optional: sign out and sign in as `group@lankalearning.lk` (School card) to see the real thing.

---

## Mission 13 — Share links and sign-in (5 min)

- [ ] Any school → **Assessments** → **Links to share**: **Copy Link** for Parents, Teachers & school admins, Student assessments.
- [ ] A school in a group → **group links** → you land on the group page.
- [ ] A school's **Leadership dashboard →** (Little Sprouts or a demo school) opens the school admin's view.

---

## Mission 14 — On a phone (2 min)

- [ ] Narrow the window (or use phone size): the sidebar becomes a bottom bar — **Control · Schools · Issues · People**.
- [ ] Profile is under the header avatar; Ask Tilli's chat list slides in.

---

## Mission 15 — A school in its third year (10 min)

*Heritage Oaks joined in 2024–25. Two years are closed; 2026–27 is running. Years run Jun → May.*

- [ ] **Heritage Oaks** → **Assessments**. The **Academic year** bar shows `2024–25 · 2025–26 · 2026–27 · current` and "year 3 with Tilli".
- [ ] Below the planner, read **Year over year**: completion and skill score per phase, every year. Midline in 2025–26 has a **⚠ v1 → v2** chip (the template changed — compare with care).
- [ ] Click **2025–26** → the read-only view: each phase's windows, assessments with versions, responses and completion, the average skill score, and **Classes in 2025–26** — note **Tulips A (Grade 2A)**.
- [ ] Click **2024–25** → only two classes (today's Grade 3 and 4, back when they were in Grades 1 and 2).
- [ ] Back to **2026–27 · current** → **Edit dates** → change the end date → **Save**.
- [ ] **Deployments** → **All years** dropdown → pick **2025–26**: last year's lanes, all **Ended**.
- [ ] **Change History** → filter to Heritage Oaks, **All time** → "started the 2025–26 academic year".
- [ ] **The school's view of past years**: Heritage Oaks → **Leadership dashboard →** → header year picker → **2025–26**. A read-only banner shows; Outcomes, Reports and Roster show that year (Roster lists **Tulips**). **Back to 2026–27** returns. In 2026–27, Outcomes says "Nothing from 2026–27 yet" with **See 2025–26 results →**.
- [ ] **The school asks for the next year**: as `admin@heritageoaks.edu` → **Roster** → **Year-end** → **Ask Tilli to start next year** → the strip says *Requested*. On Tilli, the Control Room shows **Schools asking to start next year** and Heritage's Academic year card names who asked.
- [ ] **Start a new year** (Tilli team only — try it on **Banyan Tree**, not Heritage Oaks):
  - [ ] **Assessments** → the year still has live windows, so there's no Start new year button — only **Close the year early…** (it appears as **Start new year** once every window has ended).
  - [ ] Read the warning. **1 · Close 2026–27**: tick **End the live windows now**.
  - [ ] **2 · New year**: keep the suggested dates (the name fills in).
  - [ ] **3 · Students**: Grade 1 → *Move up to Grade 2*, Grade 3 → *Graduate*.
  - [ ] Type **CLOSE 2026–27** → the red **Start new year** button unlocks → click it.

✅ The planner is empty for the new year, the toast says how many moved up / stayed / graduated, and the old year is now a read-only tab in the year bar. Banyan Tree's school admin (`suresh.r@banyantree.edu`) sees a "2027–28 has started" notice on Overview with **See grade migration**.

---

## Mission 16 — Class sizes and new-student approval (10 min)

Each section has an **expected size**. Teachers add up to it; past it (or with no size set) a new child goes in as **Pending**, can be assessed straight away, and waits for the school admin or Tilli to approve.

- [ ] **Kandy Hill** → **Overview** → **Structure**: each section reads `14/14`.
- [ ] Sign in as `chamari.menon@kandyhill.lk` (Grade 1 A, already full) → **+ Add students** → **Type them in** → add one child → **Plant**.

✅ The row says the class is full, with **Send for approval**. Click it, then **Plant** — the done screen says the child went to the school admin.

- [ ] Back on `tilli.html` → **Control Room** → **New students to approve** → **Class sizes** page → **Approve** (or **Turn down**).
- [ ] Or as `nuwan.b@kandyhill.lk` (school admin) → **Roster** → **Waiting for your approval**.
- [ ] Change a size: Tilli → school **Settings** → **Manage grades / sections** → the number after **of**; or school admin → **Roster** → open a grade → the number next to the teacher.
- [ ] **Control Room** → **Classes missing students** lists sections short of their size or with none set (a new school's sections start with the wizard's count — 0 means none set).

✅ Approving raises the size by one; turning down removes the child. Both show in **Change History**.

---

## Mission 17 — Setup and scope fixes (10 min)

- [ ] **+ Add School** → Country **Jordan** → the cities are Amman, Irbid…; the academic year dates switch to **1 Sep → 30 Jun** ("Suggested for Jordan"). Set the end before the start → Next greys out with the reason.
- [ ] Tick **CBSE** and **IB** → on **Grades**, each grade has a board picker → set Grade 1 to IB, Grade 6 to CBSE → the Review lists each grade's board.
- [ ] On the new school → **Staff & Access** → **+ Invite to this school** → role **School Admin** → **Board access** → *Only these boards* → **CBSE**. The invitation row shows **CBSE only**.
- [ ] Open that admin's dashboard (`admin.html?school=<id>&email=<their email>`) → header says **CBSE only**; Roster shows only Grade 6.
- [ ] **Assessments** → Baseline: set an end date before the start → a red line explains it and Deploy stays off; nothing else moves. Fix it → **Deploy phase** → the dialog lists *no students*, *classes with no teacher* and *no live version* with links; the button says **Deploy anyway**.
- [ ] **Heritage Oaks** → Overview: **Assessment progress** says "8 of 56 children", **Year 3 with Tilli** shows growth arrows only where the assessments match ("different assessments" otherwise), and **Outcomes** says which year and phase they're from. The leadership dashboard shows the same 8 of 56.
- [ ] **Staff & Access** → **School code** → **Regenerate** (try it on a test school) → the old code stops working. The school admin can do the same from **Roster → Your team**.
- [ ] **Add Students** → **CSV import** → **Upload .csv** / **Download template** (the template uses the school's real grades and sections).

---

## Mission 18 — Plan from the school calendar (10 min)

- [ ] As `admin@heritageoaks.edu` (Leadership dashboard) → **Calendar** → **Upload a PDF or photo** (any file — the prototype fills plausible dates) → check the terms, exams and holidays → **Send to Tilli**.
- [ ] Tilli → Control Room → **School calendars to review** → Heritage Oaks → the Academic year card says who sent it → **Plan from calendar**.
- [ ] Read the suggested windows and their reasons. Deployed phases are locked; tick the rest → **Apply to planner** → the phase shows "Dates from the school calendar". Nothing is deployed.
- [ ] Add an exam block over a scheduled window (e.g. Midline) and save → the Assessments tab shows **Calendar changed: Midline now overlaps …** → **Shift it**.
- [ ] **Deployments** → **Scheduling rules**: change how many weeks a window lasts, etc. It applies the next time a calendar is planned.
- [ ] A group page → **One calendar for all** → saves to every live school in the group and sets draft dates where nothing is deployed.
- [ ] **+ Add School** → Profile → upload a calendar (optional) → after Create it's waiting in Plan from calendar. **Start new year** also asks for next year's calendar.
- [ ] Class sizes: **Class sizes → Classes missing students** lists sizes marked **not confirmed** → **Confirm**. A child waiting for approval puts a count on Tilli's **All Schools** menu and the school admin's **Roster** menu. After an admin CSV import that sets a size, you're asked **Is that the whole class?** New sections in Add School start at **30**.

---

## Mission 19 — Access and safety (Phase 5A, 10 min)

- [ ] `index.html` → School → a **new** email → enter a school code (e.g. `LSPR-2210`) → **Is this your school?** → **Not my school** goes back to the code; **Yes** → password. No school search.
- [ ] Teacher onboarding step 3: pick one grade · section → later **Add your students** only shows that class's children (not the whole school). A class that doesn't exist can't be created.
- [ ] Step 3 → **My class isn't here — ask my school admin** → enter Grade 3 / B → continue with no class → **Enter my garden**. The school admin's Overview says **Waiting for a class**, their **Roster** menu (and phone bottom bar) shows a count, and **Your team** lists the request with **Mark done**. Tilli's Control Room shows **Teachers waiting for a class** → Staff & Access.
- [ ] Teacher **Sign out** (profile) → open `assess.html` on the same browser → it asks for the code and email again.
- [ ] Staff & Access → **Regenerate** → the tab lists **Check who joined with the old code** (teachers who joined with it in the 30 days before) with **Remove**. The school admin sees the same on **Your team** for 30 days.
- [ ] Multi-board school (Little Sprouts runs CBSE + IB): Staff & Access warns about **grades with no board yet**. A school admin row → ✏️ **Edit board access** → CBSE only. Their dashboard now lists only CBSE teachers (no false "no section" warning), and **Invite teachers** only accepts real CBSE classes. **Leadership dashboard →** from Tilli always shows every board.
- [ ] Start new year on a school with an extra grade → new classes keep the grade's board.

---

## Mission 20 — Schools manage their own classes (Phase 5B, 10 min)

- [ ] Leadership dashboard (any demo school, e.g. `admin@heritageoaks.edu`) → **Roster** → **Classes**: each grade lists its sections with children **of** the class size and a **Teacher** picker.
- [ ] **+ Section** on a grade → a new section at size 30 (**Confirm** or type the real size). **Add a grade**: pick the standard grade, optionally your own name, a board (multi-board schools) and how many sections.
- [ ] Pick a teacher for a class → a teacher who asked "My class isn't here" is placed and their request closes (Overview warning and Roster badge go away).
- [ ] **+ Add students** → paste or **Upload .csv** (**Download template** lists your real classes) → **Check rows** → rows for classes you don't have (or outside your boards) are flagged → **Add N students** → if the import set a size, **Is that the whole class?**
- [ ] A CBSE-only school admin sees only CBSE grades here and can't add, staff or import into IB classes.
- [ ] Tilli → school → **Settings → Grades & sections**: **+ Section** / **Add grade** now save for real (they survive a reload), and the CSV import accepts the new class straight away. Each section has a **teacher** picker too.

---

## Mission 21 — Sessions: pre / post for a workshop (Phase 5F, 10 min)

- [ ] A school (e.g. Heritage Oaks) → **Assessments** → **Sessions** → **+ New session**: name "Parent workshop", **Parents**, template **Parent Report · Baseline v1**, keep **Pre and post** ticked → **Create session**.
- [ ] The session page has a **Pre** and a **Post** link → **Open** the Pre link → you land on sign-in as a Parent with the school already chosen and "You're taking: Parent workshop · Pre" → any email + password → straight into the survey (no child, no dashboard) → answer → **Send my answers** → Thank you.
- [ ] Do the Pre as 2–3 different emails, then the Post as some of the same ones (pick higher answers) → the session page shows **did the pre / did the post / did both**, an **Overall score** spread, and per question a bar for Pre (cyan) and Post (green) with "moved up / same / down" for people who did both.
- [ ] **Download CSV** (one row per person, pre and post side by side), **Pre only**, **Post only**.
- [ ] A **Teachers** session with a self-guided game (e.g. Hearts & Flowers): a new teacher needs the school code (and it must be this school's); the game records a simulated score on **Finish**.
- [ ] **Dates** on a link sets when it opens/closes; **End session** closes every link (the page then says it has closed). None of this shows on the school dashboard or in any Baseline/Midline/Endline number.

---

## Mission 22 — Teachers and parents across the year (Phase 5C, 10 min)

- [ ] As a school admin → Roster → **Classes** → give a teacher another class (or add children to theirs) → open that teacher's dashboard: the new class and children are there without redoing onboarding. A class with no children yet still shows.
- [ ] Children who left or were turned down disappear from the teacher's garden; a teacher can't record the teacher assessment for a child outside their classes.
- [ ] Start new year on a demo school (Tilli → Assessments → Academic year) → the teacher's Baseline starts empty again (last year's ratings are kept for that year, not shown as this year's).
- [ ] Parent sign-in → **+ Add child** → type an admission number (e.g. `BT-1003`) → **Is this your child?** → confirm. A wrong number says it can't be found; too many wrong tries locks for a few minutes.
- [ ] After a new year starts, a parent sees **"2027–28 has started"** (dismissable) and **This year / Last year** tabs; Last year is read-only. A child who graduated is labelled **Graduated** and only shows last year.

---

## Demo-only gaps (so they don't surprise you)

- Grid-view school cards: **Edit** and **Archive** just open the school — use the buttons on the school page.
- **Teacher Observation Form → Preview** only shows a message.
- **Delete student**, **Remove from school**, **Resend** and **Revoke** show a message and log it, but don't remove anything.
- On the four demo schools, **Change role** on a teacher row says "User not found" (the school-admin row works).
- The **Student assessment log**, **Results CSV** and **Issues** are empty for the four demo schools — use Greenfield or Sunrise.
- Planner changes for portfolio schools (not the four demo schools or Little Sprouts) last only until you reload.
- Templates, drafts and version history also reset on reload.
- Global search (`#/search?q=…`) and the Student Directory (`#/directory`) exist only as URLs — there's no button to them.
