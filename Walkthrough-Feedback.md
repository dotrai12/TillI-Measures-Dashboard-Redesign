# Walkthrough feedback — running log

Feedback from going through [Baseline-Walkthrough.md](Baseline-Walkthrough.md) (Midline and Endline to follow). Write under the step ID; a rough line is enough. Once a phase is done I triage everything in one pass, fix the front-end items, and mark each one.

**Status key:** ⬜ Not started · 🟡 In progress · ✅ Done · 💬 Needs discussion · ⏸ Parked · 🔌 Mayur (backend / connections)

---

## Baseline — your feedback

### B1 · Tilli signs the school
- B1.3 — Mango Tree should have 2 boards → walkthrough now uses CBSE + IB (Grade 1 on CBSE). ✅
- B1.3 — Academic-year dates show as MM/DD/YYYY; should be DD/MM/YYYY → every date field (Tilli + school dashboards) now shows and takes DD/MM/YYYY. ✅
- B1.3 — Academic year + School calendar in the Add School profile: make it one required step with a choice of **how** — *Enter dates manually* or *Upload a PDF / photo*. Adding it one way is mandatory; which way isn't. Picking manual shows the existing start/end date fields (inline or in a pop-up). ✅ (upload is "read" and the year + terms/exams/holidays shown to check; real reading is Mayur's)
- B1.3 — Reloading closes the Add School wizard and loses everything typed. A reload must not close anything: keep the open pop-up/wizard, its step and its draft. **Add School: fixed** — draft kept through reloads and closing until Create or Start over. ✅ Other pop-ups: ✅ 29 Oct — one shared helper (assets/keep-open.js) on every app page reopens the pop-up that was open (and pop-ups opened from inside it), with what was typed put back. Not kept: passwords, files, confirmations opened by an action button (Save / Send / Approve / Remove…), pop-ups that already restore themselves (Add School, teacher onboarding).
- B1.3 — Grades step, multi-board school: the grade's board dropdown (under the grade name) looks like a text box, and it pre-picked IB rather than CBSE. ✅
- B1.3 — Grades step: a new grade's student count should default to **30** whether or not it has sections (today a grade with no sections starts at 0; a new section already starts at 30). Editable as now. ✅
- B1.3 — First admin step says "optional" too many times: the *optional* tag under the stepper, the OPTIONAL box ("Invite the first admin now, or skip…") and **Skip this step →**. Keep one signal — Skip this step is enough; drop the tag and the box. ✅
- B1.4 — Staff & Access shows the school code twice: a row in **Demo access & codes** and the **School code** card. Show it in one place: keep the School code card (it has Copy, Regenerate and the explanation) and drop the row from Demo access. The rest of the Demo access card stays. ✅
- B1.4 — Admission numbers are already in the **Students** tab (Admission # column), so the Admission numbers block in Staff & Access → Demo access & codes is a duplicate. Remove it, or swap it for one line: "Parents link with a child's admission number — see Students." ✅ (one line pointing to Students)

### B2 · The school sets itself up
- B2.1 — Every "Nothing to show yet" empty state must say **why** it's empty and give **one clear next step** (CTA), based on what's missing. For a new school's Overview, in order:
  1. No calendar sent → "Send your school calendar so Tilli can set your assessment dates" → **Calendar**.
  2. No students → "Add your students" → **Roster → + Add students**.
  3. No teachers → "Invite your teachers" → **Roster → + Invite teachers**.
  4. All done, nothing deployed → "Waiting for Tilli to open Baseline. Questions? Contact your Tilli lead" (contact CTA).
  5. Deployed but no responses yet → "Baseline is open — teachers can start now" (+ completion so far).
  Show the first unfinished one as the main CTA; ideally list all as a short setup checklist with ticks. Apply the same "why + next step" rule to Outcomes, Reports and other empty states. (Overlaps K16.) ✅ (setup checklist on the Overview; Outcomes/Reports add a "First: …" line)
- B2.2 — Calendar page: lead with a clear choice of **three ways** — *Upload a PDF* · *Upload a photo* · *Enter dates manually* — instead of the form being open with the upload button above it. Manual opens the existing Terms / Exam blocks / Holidays form. (Same three-way choice as the Add School item in B1.3.) ✅
- B2.2 — If the Tilli team already added the calendar (Add School upload or Plan from calendar), the school page says "Sent to the Tilli team on …", as if the school sent it. Say "Added by the Tilli team on … — check the dates and tell us if anything's wrong", and don't show "send your calendar" as a next step (B2.1 checklist ticks it). ✅ (status line; the B2.1 checklist part comes with the empty-state work in Phase 3)
- B2.2 — The school calendar form still looks chaotic. **In the batch: run the `design:design-critique` skill on it first, then redesign from its findings.** Things already visible:
  - Every exam has an extra full-width "All boards" row underneath that looks like another text field, so exams look like two rows each.
  - Name fields stretch across the whole width while the dates are crammed on the right; the eye zig-zags.
  - Three stacked messages on top: the status line, the upload hint, and the orange "We read these dates from…" banner (which shows a raw file name).
  - Terms, Exam blocks and Holidays all look the same; nothing groups or separates them.
  - Status line shows "Oct 28, 2026" (US style) while the fields are DD/MM/YYYY — dates written in words should be "28 Oct 2026" everywhere. ✅
  ✅ (approved mockup built 29 Oct: one-line rows with length + board pill, year-at-a-glance bar with the assessment windows, one status pill, status in the footer)
- B2.2 — After **Send to Tilli** only a toast confirms it; the button still reads "Send changes to Tilli" and stays active, so it looks unsent. Once sent and nothing has changed: button shows **✓ Sent** and is disabled (Save draft too). Any edit to the form re-enables it as **Send changes to Tilli**. ✅
- B2.2 — Calendar date fields cut off "DD/MM/YYYY" (columns too narrow after the date-format change) → widened. ✅

- B2.3 — Roster's **Year-end** strip shows during Baseline setup, with an "Ask Tilli to start next year" button that looks active but is disabled (you only learn why by hovering: "Available once Endline is deployed"). Hide the whole strip until Endline is deployed; wherever a button is disabled, make it look disabled. ✅
- B2.3 — **+ Add students** is only on the Classes tab. Put it on the **Students** tab too, and inside a class's roster (e.g. open Grade 1 · A → Add student), pre-filled with that grade/section. ✅
- B2.4 — Add students: rename **Check rows** → **Add students**. It shows the row-by-row status underneath (ready / error) as today, then a final **Add 3 students** confirms. Also fix the hint "first row is the header": a header row is optional (it's auto-detected), so say "header row optional". ✅
- B2.5 — Invite teachers (multi-board school): **Send invites** must stay disabled until every filled-in row has a board picked (blank rows are ignored); the disabled button's tooltip names the rows missing one. Better still, pre-pick the board from the grade (Grade 1 is CBSE), so it's only asked for when the grade has none. ✅
- B2.5 — Grade roster → **Teachers** dropdowns are blank: they only list *activated* teachers, so an invited-but-not-joined teacher (Ritu) isn't there, and it looks like a glitch. Fix: (1) add a **"No teacher yet"** option and show it when the section has none (today there's no such option, so once any teacher is active, every unassigned section *looks* assigned to the first one); (2) list invited teachers too, marked "(invited — not joined yet)", or show "No teachers have joined yet — invites pending: Ritu Menon" next to the box. ✅ (also saves for real now, like the Classes tab)

### B3 · Tilli plans and deploys Baseline
- B3.1 (Tilli → Mango Tree → Staff & Access) — Page needs a visual clean-up; **run `design:design-critique` on it in the batch**. Already visible:
  - Invitation shows the name as **"Teacher"**, not Ritu Menon, and no grade/section (she was invited for Grade 1 · A). ✅
  - Status **"Account Created"** while she hasn't signed in yet — reads as joined. Use "Invited — not joined yet". ✅
  - Expires shows **2026-11-11** (raw ISO) — should be "11 Nov 2026". ✅
  - Pagination + "Per page" for 1 staff member is noise — hide under ~10 rows. ✅ (hidden while it fits one page)
  - Staff (1) and Invitations live in separate cards, so the school's people are split; consider one "People" list with a status column (Active / Invited). Overlaps K15.
  - Row action icons (✎, person, 🗑, send, ⛔) have no labels — fine on hover, unclear at a glance.
  - School code card: long paragraph for one code; shorten to one line. ✅
  ✅ Redesigned 29 Oct: one **People at …** list (staff + code joiners + invitations, one row per person) with All / School admins / Teachers / Invited filter, search past 10 people, Status column (Active · Waiting for a class · Invited — not joined yet · Invite expired, with a detail line), icon actions with labels on hover (Board access, Change role, Remove; Resend, Revoke); school code as one strip beside **＋ Invite someone**; Remove now really removes (school admins too, never the last one); Demo access card moved to the bottom, marked Prototype only.
- B3.1 — Things that need action are hard to find (the sent calendar only shows inside Mango Tree → **Assessments**). Add a **"needs you" dot trail**: a small dot on the sidebar item (Schools), on the school row, on the **Assessments** tab, and on the card/button that needs action (e.g. "review it and apply the dates"). The dot clears once it's handled. Same pattern on the school dashboard and the teacher app for new things (calendar applied, invite accepted, window opened…). ✅ (Tilli app: sidebar badge → school row → tab → calendar card; the school dashboard already badges Roster)
-

- B3.2 — Baseline dates aren't taken from the calendar: Plan from calendar puts Baseline a few weeks into Term 1, and for a school joining mid-year that's already past, so it's dropped ("set its dates by hand"). Fix: when Baseline's usual slot has passed, suggest the **next free window from today** (skipping exams/holidays — e.g. after the Diwali break), push Midline/Endline later if needed, and pre-fill the Baseline tab with it. ✅
- B3.2 — Date picker pop-up: fill the empty cells before the 1st and after the last day with the previous/next month's dates in a lighter tone (still clickable). ✅
- B3.3 — Deploy dialog warning is hard to read: "classes with no teacher" counts an invited-but-not-joined teacher as no teacher (say "Grade 1 A — Ritu Menon invited, not joined yet"), and the "no live Baseline version" line is always there in the prototype (K13). Separate *will block* from *heads-up*, and link each class to its own fix. ✅
- B3.2 — **Where should "…" run?** (turning on a student direct assessment): make **At home — Parent does it with the child** the default (highlighted) choice. ✅
- B3.2 — Same dialog has **two "Cancel" buttons** (outline + green), and the green one looks like the confirm. Clicking a card is what actually picks it, which isn't obvious. Fix: cards select (home pre-selected) and the green button says **Turn on** and confirms; one Cancel only. ✅

- B3.4 — ✅ (done 29 Oct: Parents link kept; Teachers link dropped; student link moved to the teacher's student card) Why three links? Parents and staff can come in through the normal sign-in, and teachers already have **Start student assessments →** on their dashboard. Proposal: keep the **Parents** link (no code, opens on the right school — avoids the school-name search); drop the **Teachers & school admins** link (the school code / invite is the way in); move the **Student assessments** link to the teacher dashboard's student card as "Setting up a shared tablet? Use this link".

- B3.4 — **Sessions** (workshop pre/post, Tilli-only): owner likes it; **get the team's view before committing**. First read from the success-lead persona (Farah, simulated): would use it (replaces Google Forms + manual matching). P0: email + password in front of a one-off survey loses parents at the door → name + phone/email, no password. P1: pre/post match relies on same email → confirm on Post or a short code; add **QR code** for links; workshop surveys need their own **Session templates** (not Parent Report · Baseline); group-level sessions; optional aggregate **Share summary with the school**. P2: link language/RTL, default close date, empty state with an example. 💬

- B3.4 / B7 — **Brainstorm: whose device is it?** The student assessment page (assess.html) assumes a teacher on a shared device: after sign-in it lists the whole class, so on a *child's own* device any classmate could be started from it. Add a step early in the flow — "One child's device, or shared?" — where *one child* locks the device to that child only (no class list, no other children), and *shared* keeps today's class flow. Also rename the end screen: "Session finished … hand it back to the child or the next teacher" is unclear → e.g. "Done — you're signed out. This device is ready for the next teacher." 💬

### B4 · The teacher joins
- B4.2 — Add your students: a child past the class size blocks **Enter my garden** until you press the small **Send for approval** on that row, then Enter my garden again — nothing says so, and it isn't automatic. Fix: pressing Enter my garden with over-size rows opens a pop-up — "Zoya Khan is over your class size (3 of 3). Send to your school admin for approval? You can still assess her meanwhile." → **Send & enter my garden** / **Remove Zoya** / Cancel. One click continues. (Same fix in the teacher dashboard's Add students.) ✅

### B5 · The school admin follows up
- B5.2 — **Waiting for your approval** lists one row per student. Group by class instead: one row per section — "Grade 1 · A · **Zoya Khan + 5 more** · 3 of 3 **+6 waiting** · Added by Ritu Menon" → **Approve all** / **Review ▸** (expands to the per-child list with Approve / Turn down each). A section with one child stays a single row as today. ✅
- B5.2 — Approving from both sides (school admin + Tilli Control Room/Students): it's one shared request — the first decision wins and it leaves both queues on the next load. Gaps: (1) an already-open page keeps the row; **Approve** then says "That request was already handled" but not *who* or *what* — say "Already approved by Asha Kumar, 10:42" / "Already turned down by…"; (2) **Turn down** on an already-handled row still toasts "turned down and removed" even if it was approved — check first and show the same "already handled by…" message; (3) the other side gets no notice — add a History / activity line visible to both ("Tilli approved Zoya Khan"). ✅
- B5.3 — Teacher onboarding step 3: **My class isn't here — ask my school admin** looks like plain text, not something you can click. Make it a chip/button at the end of the grade chips (after the last grade), e.g. dashed outline "＋ My class isn't here", opening the same ask-my-admin flow. ✅
- B5.3 — The "Which class do you teach?" ask-my-admin panel looks bad: a giant two-line green **Ask my school admin** and a giant **Cancel** fight the page's own Back / Next; it's a box inside the card; there are two Back buttons (top ← Back and bottom Back); Next stays grey with no hint why. Redesign (run `design:design-critique` first): open it as a small pop-up (Grade · Section · note → **Send to admin** / Cancel, normal-size buttons); after sending, show one line under the grade chips — "✓ Asked your school admin for Grade 3 · B" (with Undo) — and enable Next. Drop the top ← Back on onboarding steps. ✅ 29 Oct: pop-up (Grade = the school's grades or "Another grade…" · Section · note → Cancel / Send to admin; bottom sheet on phones), "✓ Asked your school admin for Grade 7 · V · Undo" line, hint above a grey Next; top ← Back removed from the setup steps (Reflection and Add students keep it — they have no other Back).
- B5.3 — After asking, the "Sent — … you teach Grade 7 V …" note was split into three columns → one sentence with a ✓. ✅
- B5.3 — My Garden for a teacher with **no class yet** (asked for one) says "Your garden is ready — let's plant it · **Add your students**", which they can't do. Say instead: "Waiting for your class — you asked your school admin to add **Grade 7 · V**. You'll add students once they've placed you." No Add students button (maybe **Remind my admin**). If the teacher has **some** classes plus one they asked for, show the garden for the classes they have as normal, plus a clear line/card for the missing one: "Grade 7 · V — waiting for your school admin". ✅

- B5.3 — Roster → Your team → **Waiting for a class**: replace the single "Mark done" with two clear text actions: **Add class** (opens the add-class form pre-filled with Grade 7 · V and Dev Pillai as its teacher; saving closes the request) and **Dismiss** (asks why — e.g. "not a real class" — and tells the teacher). Where the school admin can't add classes, **Add class** becomes **Ask Tilli to add it**. Same on Tilli's Control Room "Teachers waiting for a class". ✅ (Tilli side: Add class opens Grades & sections; Dismiss asks why)

### B6 · The teacher observes the class
- B6.2 — Baseline observation pages need too much scrolling; ~6 questions feel like many more. Aim: one page fits in about one scroll and feels quick. Compact each question to one row — statement on the left, a 4-step segmented scale (Rarely · Sometimes · Usually · Almost always) on the right; show the scale labels and the Seed → Blooming hint **once** in a sticky header, not under every question; make "Haven't seen this yet" a small link on the row; tighter spacing between questions. On phones, statement above the scale, still one compact block per question. Run `design:design-critique` + the teacher persona on it first. ✅ (approved mockup built 29 Oct: one row per statement, frequency buttons right, pips once in the header; "Haven't seen this yet" removed per your edit)
- B6.4 — Assess → **Done so far**: the legend row (Complete · In progress · Not started · Teacher · Parent · Student) sits below and apart from **History** / **Download CSV**. Put them on one line: legend on the left, the two buttons on the right, vertically centred. ✅
- B6 — Teacher's "parents still to finish" list: the green **Copy message** text on every row is heavy and repetitive. Replace it with a copy icon button (⧉) per row, tooltip "Copy a reminder for Anika's parent", ✓ flash on copy. Keep the big **Copy reminder for the class group** as the main action. ✅

### B7 · The children do their assessment at school
- B7.1 — Teacher Assess → To-do: the **Student assessments · Baseline** card sits above the flower vine as a separate box. Make it a step **on the vine**, right after the **Post-training survey**, and **locked until Post-training is done** (lock icon + "Unlocks after your post-training survey"). ⚠ Today Post-training is only reachable via Preview stage (K11), so this needs K11 fixed too or B7 can't be reached. ✅ 29 Oct: student assessments are a step on the vine for each phase that has them at school; Baseline's stays locked until the post-training survey (strict). The vine is now built from what's deployed: per phase pre-training · observations (per-child teacher items grouped as chips — one form records them all) · post-training · other teacher items as "Opens soon" · student assessments. The wavy vine re-threads through the markers whatever the card heights.
- B7.1 — Same screen: "Baseline observations · Completed · **Apr 18**" — wrong date (done today), and "Pre-training · Completed · **Oct 28**" is US-style; dates in words should read "28 Oct" everywhere. (dates ✅ — real observation date + day-month everywhere) Also the **Start student assessments** tooltip shows far away, bottom-right, not next to the button. ✅
- B7.1 — **Untested route (to do later):** the walkthrough only covers a teacher starting IDELA from her own dashboard. Still to test: the teacher shares the **student assessment link** to a child's device → on that device signs in with the school code + her email → picks that child → runs IDELA. Check sign-in, which children are shown (ties in with the "whose device is it?" brainstorm under B3.4 / B7), and that completion lands on the teacher's and admin's counts. ⬜
- B7.2 — Class list shows **Continue IDELA** for a child you don't remember starting (opening Start IDELA records "started", e.g. from the B3.4 Preview). Say who/when under the button — "Started by Ritu Menon · 28 Oct" — and maybe only record "started" once the child actually begins, not on opening the screen. ✅ (who/when shown; "started" is still recorded on opening — revisit with the Finish-flow decision)
- B7.1 — **Start student assessments** from Ritu's dashboard opened as teacher2 (Dev): assess.html's own leftover sign-in beat the dashboard's. Now a dashboard link (`?via=dashboard`) always uses the dashboard's teacher and clears another teacher's leftover sign-in. ✅
- B7.2 — **Decide the "Finish / Session finished" flow** on assess.html. Today Finish only clears the student page's own sign-in; opened from a dashboard, the dashboard sign-in stays, so "you're signed out" isn't true and **Start again** signs the same teacher straight back in. Questions: (1) Opened from the dashboard — should Finish just close the tab / return to the dashboard ("Done — back to your dashboard") instead of "signed out"? (2) Shared school tablet — Finish signs out and shows "Ready for the next teacher" (school code next). (3) Child's own device (see "whose device is it?" brainstorm) — after that child is done, show "All done 🌸" with no Start again at all. (4) Should the end screen summarise what was done ("3 of 4 children finished IDELA")? Also show "Signed in as … — not you? Switch" on the class picker. 💬
- B7.2 — Hit **K10** for real: after IDELA for all 4, Ritu's **Done so far** Student column still says 0/5 (and Parent 0/2). Wire both columns to the real completions for the live phase, with real totals (Student = direct assessments in this Baseline, at school + at home; Parent = parent questionnaires). High priority for the batch — teachers will think their work didn't save. ✅ Done 29 Oct (pulled forward): both columns read real completions with real totals, and the page refreshes when another tab records something.

### B8 · Parents at home
- B8.1 — Sign-up has no email verification (prototype shortcut). After **Create via password**, the pop-up should change to: "Check your email — we've sent a verification link to **parent4@mangotree.test**. Open it to finish creating your account. Can't find it? Check your spam folder." + **Resend email** (with a short wait) + **Use a different email**. Same for teachers who self-join. Front-end screen ✅ (front-end screen; sending + link stay 🔌 Mayur); sending the email and the verify link 🔌 Mayur.
- B8.2 — Parent consent ("Before you start"): (1) **check the language** — still placeholder ("Placeholder wording — the final text is coming"); run the `design:ux-copy` skill and get final wording signed off. (2) Allow **links inside the consent text** (e.g. "Privacy notice", "How Tilli uses your data") — wherever the consent text is edited, support links. (3) "I agree to all of the above" sits *above* the items → "Agree to all" / "I agree to all of the below". (4) Mark required with a **\*** (and a "* required" note), optional as "(optional)" in brackets — not the coloured Required / Optional words. ✅ (3, 4 and links done; (1) final wording still needs your sign-off — the intro is folded under "Why we ask")
- B8.5 — Profile → Consent & privacy: the note **"Changes save straight away."** is wrong — changes only save on **Save** (correct behaviour). Remove the line (or "Press Save to keep your changes"); show a "Saved ✓" confirmation after Save, and warn on leaving with unsaved changes. ✅
- B8.2 / B8.5 — The consent intro paragraph ("Tilli Measures helps your child's school understand how children are growing — their feelings, friendships and focus. Please read this and choose below…") is too long. Cut to one short line, e.g. "Choose what you're happy to share." with a "Why we ask" link for the rest. In the profile version, drop the "Before you start" heading too (it's not the start). ✅
- B8.4 — Parent home: the **Locked** button (e.g. My School Check-in) does nothing on hover or tap. Show a tooltip on hover and a toast on tap: "Finish **Home SEL Survey** first to unlock this." Use the same pattern for every locked step (teacher vine, assess.html). ✅ (parent rows + teacher vine hover)

### B9 · Everyone watches progress
- B9.1 — **School admin Overview looks chaotic → needs Masumi's design review** before we change it. Notes to hand her:
  - "Mango Tree School · Mumbai, India" appears three times (top bar, "Currently selected" panel, the graph's centre node).
  - Long "How completion is counted" banner pushes everything down.
  - The network graph (school → grades → sections, drag to move, search inside it) is decorative and hard to read; for a small school it's mostly empty white nodes.
  - Cards are text-heavy; "(—)" after class names is cryptic.
  - "Updated 1 min ago by **parent4**" shows a raw email name — say "Zoya's parent" (or just "a parent"). ✅
  - The Preview stage panel (bottom-left) sits in the main nav and was on "Baseline done" — easy to mistake for real state (K24).
  💬 Masumi
- B9.1 — **Needs attention** counts empty classes (UKG A, Grade 1 B, Grade 2 A — 0 children, no teacher) as "3 sections haven't started Baseline yet". A class with no children can't start; don't warn about it here (at most a quiet "3 empty classes" note in Roster). ✅
- B9.2 — Tilli → school → Overview → **Structure**: each section says the same thing three times — "0/2", "2 to add", and an ⓘ tooltip "2 still to add before this class is complete". Keep just the chip "B 0/2" (muted until full, ✓ when full) and drop the "n to add" text and the per-section ⓘ; explain once in the card's own ⓘ. ✅
- B9.2 — Tilli → school → Assessments → **Teacher assessment log** is chaotic; redesign (run `design:design-critique` first). Visible problems:
  - The three summary lines run into each other with no gaps ("…Pre-training (self-report)**0** of 2 teachers…(self-report)**1** of 1 teachers…") → three small stat tiles (Pre-training 2/2 · Post-training 0/2 · Baseline observations 1/1). ✅ (tiles; full redesign in Phase 4)
  - Missing spaces: "Grade 1 A**4 students**", "—**0 students**". ✅
  - Dev Pillai shows as **teacher2@mangotree.test** in the name slot — use his name. ✅ (onboarding name now saved to the account)
  - Post-training shows red **Not started** for everyone though it can't be done yet (K11) → neutral "Not open yet". ✅
  - "1 of 1 teachers" → "1 of 1 teacher"; "No students" for a teacher waiting for a class → "Waiting for a class". ✅
  - The **Hide teacher assessment log** button lives in the Deployments header, far from the log, which sits below Sessions; put the log's controls on the log and the log above Sessions.
  - Header stat "**1 Staff**" while this school has 2 teachers + 1 admin. ✅
  ✅ Redesigned 29 Oct (Logs sub-tab): one card with Phase tabs (each says done / live · closes / opens / not yet) · Show Teachers | Children · All / Still to finish · CSV with dates · search (looks in every class and board) · Class filter (All grades / whole grade / section) · Board filter for multi-board schools · status words only, dates on hover/tap · only the phase just before is shown · 12 children per class then "Show all" · copy-a-reminder per teacher. Children view now reads real completions (replaces the random student log for live schools; K20).
- B9.2 — Tilli → school → **Assessments** is one long scroll (Academic year, Deployments, Sessions, Teacher assessment log…). Split into sub-tabs: **Plan & deploy** (academic year + calendar, Baseline/Midline/Endline deployments, Parents take part toggle) · **Logs** (teacher assessment log, student assessment log, Results CSV — who completed what, when) · **Sessions** (workshop pre/post). Sub-tab in the URL so reload/links land on it. Overlaps the Teacher assessment log redesign above. ✅
- B9.2 — Tilli → school → Students → **Student Directory**: the row actions are text ("Edit Delete" run together). Use the same icon buttons as Staff at this school (✎ edit, 🗑 delete in red, `.tl-rowact`), with tooltips "Edit Anika Rao" / "Delete Anika Rao". Check other tables for the same text-link pattern. ✅
- B9.2 — Tilli → school → **Students**: (1) the **Status** column only says Active / Pending (approval) — drop it; show a small "Waiting for approval" tag next to a pending child's name instead. (2) Put consent in the directory: a **Parent consent** column (Given / Not yet / No parent linked) plus **Research** and **Contact** (Yes/No) — Tilli-only, as today. (3) Remove the separate **Parent consent** card from the page; keep its full detail (parent email, agreed-on date, wording version, Download CSV) behind a **Parent consent** button that opens a pop-up (or a Students sub-tab). ✅

### B10 · The window closes
-

### B11 · Results
- B11.3 — Teacher → Students → Anika after Baseline ended: (1) still "No assessment data yet" + **Start baseline for Anika** (K5) — at minimum, once the window has ended, don't offer to start it: "Baseline closed on 28 Oct · results coming soon". (2) Header shows a made-up parent email **anika.rao@parent.tilli.co** (invented when none is on file) — show the real linked parent (parent1@mangotree.test) or "No parent linked yet"; never invent one. (3) Show the **admission # (MT-001)** first; the **Student UID (TM-…)** as a secondary, explained detail ("Tilli's permanent code for this child"). (4) Record changes: "**parent1**" → "Anika's parent". ✅ (1–4 done; real results are still K5)

### Anytime
-

---

## Known gaps — found while writing the walkthrough

Found in the code before you started, so you don't have to re-report them. Mark each one in **Your call**: fix / later / Mayur / fine as is. "Owner" is my guess.

| # | Gap | Step | Owner | Your call |
|---|---|---|---|---|
| K1 | A parent with no child linked yet sees two made-up children (Aarav, Meera) instead of "Add your first child". | B8.3 | Front end | ✅ fixed 29 Oct |
| K2 | The school's **Parents** and **Teachers** share links (`measures.tilli.app/…`) don't open anything, and have no Preview. | B3.4 | Front end + Mayur | |
| K3 | Parent Baseline items and the student games are just **Mark done**, with no questions and no game. (The parent screens are waiting on the assessment redesign.) | B7.2, B8.4 | Redesign | |
| K4 | Every result score is generated by the prototype, not taken from the teacher, parent or child answers. | B11 | 🔌 Mayur | |
| K5 | The teacher app never shows Baseline results: a child still says "No assessment data yet", and Insights stays "Sample view". | B11.3 | Front end | |
| K6 | No family snapshot for a new school's parents after results. | B11.4 | Front end | |
| K7 | The teacher's garden always says "Baseline is open" with fixed dates (closes Apr 2, completed Apr 18), whatever is deployed. | B4.2 | Front end | ✅ fixed 29 Oct |
| K8 | Observations done while Baseline isn't live are saved on screen but never counted, and aren't re-sent later. No warning. | B6 | Front end | ✅ fixed 29 Oct |
| K9 | After every child is done, **Continue → next** reopens the first child blank and overwrites the saved observation without asking. | B6.3 | Front end | ✅ fixed 29 Oct |
| K10 | The teacher's **Done so far** Parent and Student columns never update (stuck at 0/2, 0/5). | B6.4 | Front end | ✅ fixed 29 Oct |
| K11 | The teacher's Post-training survey can't be reached in the real flow, only through the Preview stage switch. | Anytime | Front end | ✅ fixed 29 Oct |
| K12 | No "End window now". Ending early means editing the end date, and a window that started today can't be ended before tomorrow. | B10.1 | Front end | ✅ fixed 29 Oct |
| K13 | Deploying the default Baseline always warns "no live version" for Teacher observational report, Home SEL Survey and IDELA (no template has those names). Template edits are also lost on reload. | B1.2, B3.3 | Front end | |
| K14 | The invite **Role** dropdown starts on Super Admin. Sent that way, the person gets no school. | Anytime | Front end | ✅ fixed 29 Oct |
| K15 | Invited or self-joined teachers don't appear in Tilli's **Staff at this school** or the Demo access card. | B1.4, B4 | Front end | ✅ fixed 29 Oct |
| K16 | The school admin's Overview hides every warning until a window is live. A one-class school never gets "falling behind" warnings. | B2.5, B9.1 | Front end | |
| K17 | Overview says "1 Teacher" even when no teacher is assigned. | B5.1 | Front end | ✅ fixed 29 Oct |
| K18 | The wizard's first admin gets no invite or temporary password, and any password signs them in. | B1.4 | 🔌 Mayur | |
| K19 | A group made with **＋ New group…** in Add School is lost on reload. | B1.3 | Front end | ✅ fixed 29 Oct |
| K20 | For a new school, Tilli's Student assessment log, Results CSV and Issues are always empty. | B9.2 | Front end | |
| K21 | After a reload, Ask Tilli's headline and Analytics show 0% for a new school, and it's left out of follow-up reports and rankings. | B9.2 | Front end | |
| K22 | The calendar upload invents dates (the file isn't read). A calendar uploaded in the wizard shows as "Sent to the Tilli team" before the school has sent anything. | B2.2 | 🔌 Mayur | |
| K23 | Canned or wrong report wording: "All 1 of our sections", "1 sections running", "students assessed" counts everyone. The wizard toast says "1 sections". | B11.1 | Front end | ✅ fixed 29 Oct |
| K24 | The **Preview stage** panel shows on a new school's admin dashboard but does nothing there (and quietly changes what Little Sprouts shows). | B2.1 | Front end | |
| K25 | Tilli's Outcomes for a new school only appear after its school dashboard has been opened once. The empty-state wording talks about Midline/Endline. | B11.2 | Front end | |
| K26 | In teacher onboarding, **Upload a CSV** / **Upload a picture** add no students. | B4.2 | Front end | |
| K27 | Parent side: **+ Add another child** restarts sign-in from the start. The profile progress and child-list "assessment complete" labels are made up. | B8 | Front end | |
| K28 | Anyone with an admission number can link a child (no date of birth or code). The lockout is per email, so a new email gets around it. | B8.3 | 💬 + Mayur | |
| K29 | The "Who was assessed" result says unassessed children are missing from the numbers, but they're included. | B11.1 | Front end | ✅ fixed 29 Oct |
| K30 | School admin: the teacher picker in the Students-tab grade popup doesn't save (only Classes does). The invite error toast still says "Grades & sections". | B5.2 | Front end | ✅ fixed 29 Oct |
| K31 | Teacher Ask Tilli chats are shared by every teacher on the device and start with four made-up chats. | B11.3 | Front end | |
| K32 | A "Flower controls" dev panel shows on the parent's **Add your child** screen. | B8.3 | Dev tooling (keep / hide?) | |
| K33 | `Demo-Logins.md` says any password works for the Tilli team; the real one is `Tilli@Team1`. | B1.1 | Docs | |

---

## Responsive check — phones, tablets, desktops (29 Oct)

Every screen and the pop-ups people use, in all six apps (sign-in, Tilli, group admin, school admin, teacher, parent, student assessment page), at **375 · 390 · 768 · 820 · 1024 · 1280 · 1440** px. Measured in a phone-emulating browser (sideways scroll, hidden or covered controls, tap-target size, wrapped buttons, wide tables) plus screenshots at phone / tablet / desktop. Dev panels are ignored except where they cover real content. **Log now, fix all in one batch.**

### Must fix — broken or blocking
- R1 — **School admin Overview takes ~33 s to load** (and longer on a phone; it froze a phone-emulating browser). One draw reads and parses the whole 1.3 MB store **12,049 times**: the "children still to assess" warning asks for each child's check-in status, and for a real school that recomputes the child's whole class every time (`checkinStatus` → `sectionCheckins` → `childStatus`, admin-data.js:228 / tilli-api.js), each call re-reading the store. Also hits the group admin's view of a school. Fix: work each class out once per draw (cache like the demo school already does) and keep the parsed store until the next write. All widths. ✅ one store read per class (`childStatuses`), cached for the draw
- R2 — **Page wider than the phone** (zooms out to 568 px): Tilli → school → **Staff & Access** and **Assessments → Logs** (Teachers), and the Invite / Edit school pop-ups opened from there. Cause: the hidden screen-reader label in those tables (`.sr-only`, absolutely placed inside a sideways-scrolling table). One CSS line. 375 / 390. ✅
- R3 — **Student assessment page (assess.html) wider than the phone** (520 px on a 375 screen): the header (title, school/email, language, Finish) doesn't wrap. This is the page children's devices open. 375 / 390. ✅ header wraps to two rows on phones
- R4 — **Floating chat / help buttons and the Preview stage panel sit on top of pop-ups.** School admin → Roster → **Add students**: on a phone they cover the pop-up's **Add students** button; same over the grade roster pop-up. 375–768. Fix: pop-ups above them, or hide them while a pop-up is open. ✅ bubbles + dev panels hide while a pop-up is open

### Should fix — makes it hard to use
- R5 — **Floating chat + help buttons cover real controls at every width** across Tilli and the school admin: row Remove/Edit icons (Users, Templates, People), Logs reminder icons, the **Parents take part** switch (Plan & deploy, 768), Ask Tilli's Send button and Knowledge list (375), the hub tabs (375), "Expand all" in Change History. Fix: keep a clear strip at the bottom-right of the page (bottom padding), sit them above the bottom nav, and on phones fold them into one button. ✅ tablet/desktop: content keeps a clear column on the right; phones: smaller bubbles + bottom space (they still float over the page while scrolling)
- R6 — **Preview stage panel (dev) opens expanded over real content on phones and tablets**: the teacher's greeting, screen titles and the child's name on every teacher screen; the school admin's Calendar **Send to Tilli** button, Reports buttons, Roster cards and Ask Tilli suggestions. Keep the panel — start it collapsed below 1024 px as a small pill. ✅ starts folded below 1024 px; your own open/close is remembered
- R7 — **Tables scroll sideways on phones with the important column off-screen**: All Schools (status/activity), Analytics completion ranking (the completion %), Students directory (consent, actions), Staff & Access People (classes, status, actions), Logs (status columns), Users, Templates, Deployments, Issues, Audit, Translations, group overview, grade roster pop-up. Fix: on phones show the people/children tables as stacked rows (name on top, the rest as label · value lines with the actions in reach); keep scrolling for the Tilli-only data tables but move their key number to the second column. ✅ phones: first column pinned in every wide table; Staff & Access people as stacked cards; Analytics % second; All Schools opens on cards
- R8 — **Logs on a phone**: the **Show all 14** button and the class summary line are inside the sideways-scrolling table, so they're cut off until you scroll right. Put them above / below the table. ✅
- R9 — **Staff & Access filter** (All · School admins · Teachers · Invited) breaks into three-line buttons on a phone. Let it scroll sideways (or shorten to "Admins"). ✅
- R10 — **Tap targets too small** on touch screens: deployment planner item **⋯** menus 23×19 (375–768), Grades & sections letter boxes 21×20, the **ⓘ** info icons 16–18 px on every Tilli screen, teacher Insights ⓘ 24 px, **×** close buttons 24 px (sign-in, school admin pop-ups, the school admin info banner). Fix: a ≥ 40 px invisible hit area, same look. ✅ 40 px tap areas (ⓘ, ×, ⋯, letter boxes) — same look
- R11 — **Teacher → Students list (phone)**: the stage badges take half the row, so names break onto two lines and "Working Memory next" goes one word per line. Put the badges under the name on phones. ✅
- R12 — **Teacher vine (phone)**: "14 of 14 done in Grade 1 A" squeezes the step title into a narrow column and **Start student assessments →** wraps; short steps have empty space (fixed 152 px row height). Count on its own line under the date on phones; minimum row height on desktop only. ✅
- R13 — **Teacher → a child's page (phone)**: the Admission # / Tilli code row wraps into narrow columns under the name. Stack them. ✅
- R14 — **Teacher Insights → Growth over time (phone)**: the line-end labels overlap and the axis text is tiny. Labels in the legend instead of at the line ends on phones. ✅ phones: readable chart that scrolls sideways in its card
- R15 — **School admin Overview (phone)**: the network graph is cramped (labels overlap) and "drag to move" fights page scrolling on touch; the "How completion is counted" banner takes a third of the screen. Goes with Masumi's Overview review (B9.1). ✅ phones: a swipe scrolls past the graph (dots still open on tap), section names only on tap, the note shows two lines (tap for more) — rest stays with Masumi's review

### Polish
- R16 — **Tilli school page header (phone)**: five stat cards + four buttons fill the whole first screen before the tabs; at 768 "Open issues" sits alone on its own row. A compact one-line stat strip on phones; five across on tablets. ✅
- R17 — **Buttons wrap to two lines**: **Copy Link** (Plan & deploy, 375–1024), the school admin Reports CSV buttons (375/390), **← Back to Banyan Tree School** (Tilli student page, 375), teacher **Ask Tilli for an idea** (768). ✅
- R18 — **Parent home (phone)**: the big smiley badge beside the title squeezes the heading and intro into a narrow column; put it above the title on phones. ✅
- R19 — **Group admin → a school**: the change history has no limit (≈ 4,700 px tall on a tablet). Show the latest 10 + "Show more". ✅ latest 10 + "See all changes →"
- R20 — **Students directory (phone)**: names that wrap to two lines are centred; left-align. ✅
- R21 — **Small text**: eyebrows, meta lines and table headers under 11.5 px on many screens — fine on desktop, hard on phones. Check against a 12 px floor on phones. ✅ 12 px floor on phones (--fs-xs)

**Fine at every width:** sign-in and sign-up, the parent app (consent, home, menu), the teacher pop-ups (Add your students, Ask Tilli, History — bottom sheets on phones), Tilli pop-ups at phone width (Add school, Invite, New deployment, New template, Edit school, Parent consent, Add assessment, Plan from calendar, Edit year), the group overview, and every desktop layout at 1024–1440 apart from R1 and R5.
