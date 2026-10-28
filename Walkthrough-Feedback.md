# Walkthrough feedback — running log

Feedback from going through [Baseline-Walkthrough.md](Baseline-Walkthrough.md) (Midline and Endline to follow). Write under the step ID; a rough line is enough. Once a phase is done I triage everything in one pass, fix the front-end items, and mark each one.

**Status key:** ⬜ Not started · 🟡 In progress · ✅ Done · 💬 Needs discussion · ⏸ Parked · 🔌 Mayur (backend / connections)

---

## Baseline — your feedback

### B1 · Tilli signs the school
- B1.3 — Mango Tree should have 2 boards → walkthrough now uses CBSE + IB (Grade 1 on CBSE). ✅
- B1.3 — Academic-year dates show as MM/DD/YYYY; should be DD/MM/YYYY → every date field (Tilli + school dashboards) now shows and takes DD/MM/YYYY. ✅
- B1.3 — Academic year + School calendar in the Add School profile: make it one required step with a choice of **how** — *Enter dates manually* or *Upload a PDF / photo*. Adding it one way is mandatory; which way isn't. Picking manual shows the existing start/end date fields (inline or in a pop-up). ⬜
- B1.3 — Reloading closes the Add School wizard and loses everything typed. A reload must not close anything: keep the open pop-up/wizard, its step and its draft. **Add School: fixed** — draft kept through reloads and closing until Create or Start over. ✅ Other pop-ups still close on reload. ⬜
- B1.3 — Grades step, multi-board school: the grade's board dropdown (under the grade name) looks like a text box, and it pre-picked IB rather than CBSE. ⬜
- B1.3 — Grades step: a new grade's student count should default to **30** whether or not it has sections (today a grade with no sections starts at 0; a new section already starts at 30). Editable as now. ⬜
- B1.3 — First admin step says "optional" too many times: the *optional* tag under the stepper, the OPTIONAL box ("Invite the first admin now, or skip…") and **Skip this step →**. Keep one signal — Skip this step is enough; drop the tag and the box. ⬜
- B1.4 — Staff & Access shows the school code twice: a row in **Demo access & codes** and the **School code** card. Show it in one place: keep the School code card (it has Copy, Regenerate and the explanation) and drop the row from Demo access. The rest of the Demo access card stays. ⬜
- B1.4 — Admission numbers are already in the **Students** tab (Admission # column), so the Admission numbers block in Staff & Access → Demo access & codes is a duplicate. Remove it, or swap it for one line: "Parents link with a child's admission number — see Students." ⬜

### B2 · The school sets itself up
- B2.1 — Every "Nothing to show yet" empty state must say **why** it's empty and give **one clear next step** (CTA), based on what's missing. For a new school's Overview, in order:
  1. No calendar sent → "Send your school calendar so Tilli can set your assessment dates" → **Calendar**.
  2. No students → "Add your students" → **Roster → + Add students**.
  3. No teachers → "Invite your teachers" → **Roster → + Invite teachers**.
  4. All done, nothing deployed → "Waiting for Tilli to open Baseline. Questions? Contact your Tilli lead" (contact CTA).
  5. Deployed but no responses yet → "Baseline is open — teachers can start now" (+ completion so far).
  Show the first unfinished one as the main CTA; ideally list all as a short setup checklist with ticks. Apply the same "why + next step" rule to Outcomes, Reports and other empty states. (Overlaps K16.) ⬜
- B2.2 — Calendar page: lead with a clear choice of **three ways** — *Upload a PDF* · *Upload a photo* · *Enter dates manually* — instead of the form being open with the upload button above it. Manual opens the existing Terms / Exam blocks / Holidays form. (Same three-way choice as the Add School item in B1.3.) ⬜
- B2.2 — If the Tilli team already added the calendar (Add School upload or Plan from calendar), the school page says "Sent to the Tilli team on …", as if the school sent it. Say "Added by the Tilli team on … — check the dates and tell us if anything's wrong", and don't show "send your calendar" as a next step (B2.1 checklist ticks it). ⬜
- B2.2 — The school calendar form still looks chaotic. **In the batch: run the `design:design-critique` skill on it first, then redesign from its findings.** Things already visible:
  - Every exam has an extra full-width "All boards" row underneath that looks like another text field, so exams look like two rows each.
  - Name fields stretch across the whole width while the dates are crammed on the right; the eye zig-zags.
  - Three stacked messages on top: the status line, the upload hint, and the orange "We read these dates from…" banner (which shows a raw file name).
  - Terms, Exam blocks and Holidays all look the same; nothing groups or separates them.
  - Status line shows "Oct 28, 2026" (US style) while the fields are DD/MM/YYYY — dates written in words should be "28 Oct 2026" everywhere.
  ⬜
- B2.2 — After **Send to Tilli** only a toast confirms it; the button still reads "Send changes to Tilli" and stays active, so it looks unsent. Once sent and nothing has changed: button shows **✓ Sent** and is disabled (Save draft too). Any edit to the form re-enables it as **Send changes to Tilli**. ⬜
- B2.2 — Calendar date fields cut off "DD/MM/YYYY" (columns too narrow after the date-format change) → widened. ✅

- B2.3 — Roster's **Year-end** strip shows during Baseline setup, with an "Ask Tilli to start next year" button that looks active but is disabled (you only learn why by hovering: "Available once Endline is deployed"). Hide the whole strip until Endline is deployed; wherever a button is disabled, make it look disabled. ⬜
- B2.3 — **+ Add students** is only on the Classes tab. Put it on the **Students** tab too, and inside a class's roster (e.g. open Grade 1 · A → Add student), pre-filled with that grade/section. ⬜
- B2.4 — Add students: rename **Check rows** → **Add students**. It shows the row-by-row status underneath (ready / error) as today, then a final **Add 3 students** confirms. Also fix the hint "first row is the header": a header row is optional (it's auto-detected), so say "header row optional". ⬜
- B2.5 — Invite teachers (multi-board school): **Send invites** must stay disabled until every filled-in row has a board picked (blank rows are ignored); the disabled button's tooltip names the rows missing one. Better still, pre-pick the board from the grade (Grade 1 is CBSE), so it's only asked for when the grade has none. ⬜
- B2.5 — Grade roster → **Teachers** dropdowns are blank: they only list *activated* teachers, so an invited-but-not-joined teacher (Ritu) isn't there, and it looks like a glitch. Fix: (1) add a **"No teacher yet"** option and show it when the section has none (today there's no such option, so once any teacher is active, every unassigned section *looks* assigned to the first one); (2) list invited teachers too, marked "(invited — not joined yet)", or show "No teachers have joined yet — invites pending: Ritu Menon" next to the box. ⬜

### B3 · Tilli plans and deploys Baseline
- B3.1 (Tilli → Mango Tree → Staff & Access) — Page needs a visual clean-up; **run `design:design-critique` on it in the batch**. Already visible:
  - Invitation shows the name as **"Teacher"**, not Ritu Menon, and no grade/section (she was invited for Grade 1 · A).
  - Status **"Account Created"** while she hasn't signed in yet — reads as joined. Use "Invited — not joined yet".
  - Expires shows **2026-11-11** (raw ISO) — should be "11 Nov 2026".
  - Pagination + "Per page" for 1 staff member is noise — hide under ~10 rows.
  - Staff (1) and Invitations live in separate cards, so the school's people are split; consider one "People" list with a status column (Active / Invited). Overlaps K15.
  - Row action icons (✎, person, 🗑, send, ⛔) have no labels — fine on hover, unclear at a glance.
  - School code card: long paragraph for one code; shorten to one line.
  ⬜
- B3.1 — Things that need action are hard to find (the sent calendar only shows inside Mango Tree → **Assessments**). Add a **"needs you" dot trail**: a small dot on the sidebar item (Schools), on the school row, on the **Assessments** tab, and on the card/button that needs action (e.g. "review it and apply the dates"). The dot clears once it's handled. Same pattern on the school dashboard and the teacher app for new things (calendar applied, invite accepted, window opened…). ⬜
-

- B3.2 — Baseline dates aren't taken from the calendar: Plan from calendar puts Baseline a few weeks into Term 1, and for a school joining mid-year that's already past, so it's dropped ("set its dates by hand"). Fix: when Baseline's usual slot has passed, suggest the **next free window from today** (skipping exams/holidays — e.g. after the Diwali break), push Midline/Endline later if needed, and pre-fill the Baseline tab with it. ⬜
- B3.2 — Date picker pop-up: fill the empty cells before the 1st and after the last day with the previous/next month's dates in a lighter tone (still clickable). ⬜
- B3.3 — Deploy dialog warning is hard to read: "classes with no teacher" counts an invited-but-not-joined teacher as no teacher (say "Grade 1 A — Ritu Menon invited, not joined yet"), and the "no live Baseline version" line is always there in the prototype (K13). Separate *will block* from *heads-up*, and link each class to its own fix. ⬜
- B3.2 — **Where should "…" run?** (turning on a student direct assessment): make **At home — Parent does it with the child** the default (highlighted) choice. ✅
- B3.2 — Same dialog has **two "Cancel" buttons** (outline + green), and the green one looks like the confirm. Clicking a card is what actually picks it, which isn't obvious. Fix: cards select (home pre-selected) and the green button says **Turn on** and confirms; one Cancel only. ✅

- B3.4 — Why three links? Parents and staff can come in through the normal sign-in, and teachers already have **Start student assessments →** on their dashboard. Proposal: keep the **Parents** link (no code, opens on the right school — avoids the school-name search); drop the **Teachers & school admins** link (the school code / invite is the way in); move the **Student assessments** link to the teacher dashboard's student card as "Setting up a shared tablet? Use this link". 💬

- B3.4 — **Sessions** (workshop pre/post, Tilli-only): owner likes it; **get the team's view before committing**. First read from the success-lead persona (Farah, simulated): would use it (replaces Google Forms + manual matching). P0: email + password in front of a one-off survey loses parents at the door → name + phone/email, no password. P1: pre/post match relies on same email → confirm on Post or a short code; add **QR code** for links; workshop surveys need their own **Session templates** (not Parent Report · Baseline); group-level sessions; optional aggregate **Share summary with the school**. P2: link language/RTL, default close date, empty state with an example. 💬

- B3.4 / B7 — **Brainstorm: whose device is it?** The student assessment page (assess.html) assumes a teacher on a shared device: after sign-in it lists the whole class, so on a *child's own* device any classmate could be started from it. Add a step early in the flow — "One child's device, or shared?" — where *one child* locks the device to that child only (no class list, no other children), and *shared* keeps today's class flow. Also rename the end screen: "Session finished … hand it back to the child or the next teacher" is unclear → e.g. "Done — you're signed out. This device is ready for the next teacher." 💬

### B4 · The teacher joins
- B4.2 — Add your students: a child past the class size blocks **Enter my garden** until you press the small **Send for approval** on that row, then Enter my garden again — nothing says so, and it isn't automatic. Fix: pressing Enter my garden with over-size rows opens a pop-up — "Zoya Khan is over your class size (3 of 3). Send to your school admin for approval? You can still assess her meanwhile." → **Send & enter my garden** / **Remove Zoya** / Cancel. One click continues. (Same fix in the teacher dashboard's Add students.) ⬜

### B5 · The school admin follows up
- B5.2 — **Waiting for your approval** lists one row per student. Group by class instead: one row per section — "Grade 1 · A · **Zoya Khan + 5 more** · 3 of 3 **+6 waiting** · Added by Ritu Menon" → **Approve all** / **Review ▸** (expands to the per-child list with Approve / Turn down each). A section with one child stays a single row as today. ⬜
- B5.2 — Approving from both sides (school admin + Tilli Control Room/Students): it's one shared request — the first decision wins and it leaves both queues on the next load. Gaps: (1) an already-open page keeps the row; **Approve** then says "That request was already handled" but not *who* or *what* — say "Already approved by Asha Kumar, 10:42" / "Already turned down by…"; (2) **Turn down** on an already-handled row still toasts "turned down and removed" even if it was approved — check first and show the same "already handled by…" message; (3) the other side gets no notice — add a History / activity line visible to both ("Tilli approved Zoya Khan"). ⬜

### B6 · The teacher observes the class
-

### B7 · The children do their assessment at school
-

### B8 · Parents at home
-

### B9 · Everyone watches progress
-

### B10 · The window closes
-

### B11 · Results
-

### Anytime
-

---

## Known gaps — found while writing the walkthrough

Found in the code before you started, so you don't have to re-report them. Mark each one in **Your call**: fix / later / Mayur / fine as is. "Owner" is my guess.

| # | Gap | Step | Owner | Your call |
|---|---|---|---|---|
| K1 | A parent with no child linked yet sees two made-up children (Aarav, Meera) instead of "Add your first child". | B8.3 | Front end | |
| K2 | The school's **Parents** and **Teachers** share links (`measures.tilli.app/…`) don't open anything, and have no Preview. | B3.4 | Front end + Mayur | |
| K3 | Parent Baseline items and the student games are just **Mark done**, with no questions and no game. (The parent screens are waiting on the assessment redesign.) | B7.2, B8.4 | Redesign | |
| K4 | Every result score is generated by the prototype, not taken from the teacher, parent or child answers. | B11 | 🔌 Mayur | |
| K5 | The teacher app never shows Baseline results: a child still says "No assessment data yet", and Insights stays "Sample view". | B11.3 | Front end | |
| K6 | No family snapshot for a new school's parents after results. | B11.4 | Front end | |
| K7 | The teacher's garden always says "Baseline is open" with fixed dates (closes Apr 2, completed Apr 18), whatever is deployed. | B4.2 | Front end | |
| K8 | Observations done while Baseline isn't live are saved on screen but never counted, and aren't re-sent later. No warning. | B6 | Front end | |
| K9 | After every child is done, **Continue → next** reopens the first child blank and overwrites the saved observation without asking. | B6.3 | Front end | |
| K10 | The teacher's **Done so far** Parent and Student columns never update (stuck at 0/2, 0/5). | B6.4 | Front end | |
| K11 | The teacher's Post-training survey can't be reached in the real flow, only through the Preview stage switch. | Anytime | Front end | |
| K12 | No "End window now". Ending early means editing the end date, and a window that started today can't be ended before tomorrow. | B10.1 | Front end | |
| K13 | Deploying the default Baseline always warns "no live version" for Teacher observational report, Home SEL Survey and IDELA (no template has those names). Template edits are also lost on reload. | B1.2, B3.3 | Front end | |
| K14 | The invite **Role** dropdown starts on Super Admin. Sent that way, the person gets no school. | Anytime | Front end | |
| K15 | Invited or self-joined teachers don't appear in Tilli's **Staff at this school** or the Demo access card. | B1.4, B4 | Front end | |
| K16 | The school admin's Overview hides every warning until a window is live. A one-class school never gets "falling behind" warnings. | B2.5, B9.1 | Front end | |
| K17 | Overview says "1 Teacher" even when no teacher is assigned. | B5.1 | Front end | |
| K18 | The wizard's first admin gets no invite or temporary password, and any password signs them in. | B1.4 | 🔌 Mayur | |
| K19 | A group made with **＋ New group…** in Add School is lost on reload. | B1.3 | Front end | |
| K20 | For a new school, Tilli's Student assessment log, Results CSV and Issues are always empty. | B9.2 | Front end | |
| K21 | After a reload, Ask Tilli's headline and Analytics show 0% for a new school, and it's left out of follow-up reports and rankings. | B9.2 | Front end | |
| K22 | The calendar upload invents dates (the file isn't read). A calendar uploaded in the wizard shows as "Sent to the Tilli team" before the school has sent anything. | B2.2 | 🔌 Mayur | |
| K23 | Canned or wrong report wording: "All 1 of our sections", "1 sections running", "students assessed" counts everyone. The wizard toast says "1 sections". | B11.1 | Front end | |
| K24 | The **Preview stage** panel shows on a new school's admin dashboard but does nothing there (and quietly changes what Little Sprouts shows). | B2.1 | Front end | |
| K25 | Tilli's Outcomes for a new school only appear after its school dashboard has been opened once. The empty-state wording talks about Midline/Endline. | B11.2 | Front end | |
| K26 | In teacher onboarding, **Upload a CSV** / **Upload a picture** add no students. | B4.2 | Front end | |
| K27 | Parent side: **+ Add another child** restarts sign-in from the start. The profile progress and child-list "assessment complete" labels are made up. | B8 | Front end | |
| K28 | Anyone with an admission number can link a child (no date of birth or code). The lockout is per email, so a new email gets around it. | B8.3 | 💬 + Mayur | |
| K29 | The "Who was assessed" result says unassessed children are missing from the numbers, but they're included. | B11.1 | Front end | |
| K30 | School admin: the teacher picker in the Students-tab grade popup doesn't save (only Classes does). The invite error toast still says "Grades & sections". | B5.2 | Front end | |
| K31 | Teacher Ask Tilli chats are shared by every teacher on the device and start with four made-up chats. | B11.3 | Front end | |
| K32 | A "Flower controls" dev panel shows on the parent's **Add your child** screen. | B8.3 | Dev tooling (keep / hide?) | |
| K33 | `Demo-Logins.md` says any password works for the Tilli team; the real one is `Tilli@Team1`. | B1.1 | Docs | |
