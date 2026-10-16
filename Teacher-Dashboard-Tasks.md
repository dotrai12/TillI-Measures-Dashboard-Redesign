# Teacher Dashboard — Task Tracker

Fixes for the teacher dashboard (`teacher.html`), taken from the teacher-lens review (Rhea, K–5, Tier 1 metro school).
**Work on one task at a time.** Finish it, tick it off, update the summary table, then move to the next.

- **Dev:** Mayur · **Product decisions:** Tilli product team
- **Code refs** are `file:line` as of commit `fa94671`. Line numbers will shift as code changes, so search for the quoted text if a line doesn't match.
- This is a sample dashboard that will be connected to the real database. Tasks tagged **[DB]** are about replacing sample or hardcoded values with real data.

### Status key
| Mark | Meaning |
|---|---|
| ⬜ | Not started |
| 🟡 | In progress |
| ⏸️ | Waiting on a product decision |
| ✅ | Done |

### Priority key
- **P0**: a teacher would stop using it, or it could mislead a parent. Do these first.
- **P1**: real friction every week.
- **P2**: polish and nice-to-haves.

---

## ▶ Now working on

> **T3 — Replace hardcoded / sample data with real data [DB]** *(update this line when you move on)*

---

## Progress summary

| ID | Task | Priority | Owner | Status |
|---|---|---|---|---|
| T1 | One level scale everywhere | P0 | Product → Mayur | ✅ |
| T2 | Save progress when a teacher is interrupted mid-child | P0 | Mayur | ✅ |
| T3 | Replace hardcoded / sample data with real data **[DB]** | P0 | Mayur | ⬜ |
| T4 | Hide the "Preview state" switcher from teachers | P0 | Mayur | ⏸️ |
| T5 | Soften child labels and remove the parent email from screens a parent may see | P0 | Product → Mayur | ⏸️ |
| T6 | One set of window names and week numbers | P1 | Product → Mayur | ⏸️ |
| T7 | One name for the skill groups | P1 | Product → Mayur | ⏸️ |
| T8 | Simplify Assess → one "still to do" list | P1 | Product → Mayur | ⏸️ |
| T9 | Phone nav label, tappable garden, reachable section garden | P1 | Mayur | ⬜ |
| T10 | Class Skill Overview: make clear the boxes count skills, not children | P1 | Mayur | ⬜ |
| T11 | Explain what the % numbers mean | P1 | Product → Mayur | ⏸️ |
| T12 | Plain copy fixes ("Completed rate", "Tracker") | P1 | Mayur | ⬜ |
| T13 | Faster observations: rate one skill across the class | P1 | Product (research check) | ⏸️ |
| T14 | Review the extra surveys and check-ins on the To-do vine | P2 | Product | ⏸️ |
| T15 | Perspectives: demote the radar chart, spell out T/P/S | P2 | Mayur | ⬜ |
| T16 | Tap instead of hover for tooltips (phone) | P2 | Mayur | ⬜ |
| T17 | Preview a parent report before downloading | P2 | Mayur | ⬜ |
| T18 | Show which parents haven't done their part, plus a reminder message to copy | P2 | Product → Mayur | ⏸️ |
| T19 | Shorter first-time setup | P2 | Product | ⏸️ |

**Done: 2 / 19**

---

## Keep as is (do not "fix" these)

These worked for the teacher. Protect them while changing other things.

- **Landing = one job.** Greeting, open window, "X of N done", **Continue → next: [name]**.
- **Auto-advance** to the next pending child after Finish.
- **"Who could use you"** and **"This week's idea"** on the landing.
- An **Ask Tilli** button next to every finding.
- Wording on Perspectives ("a conversation, never a correction") and Compare ("never a ranking").
- **Bulk parent-report PDFs** with "what you can do at home" tips.
- **Chart ↔ table toggle** on Growth over time.
- Honest empty states (e.g. Insights before baseline).

---

## P0 — Do first

### T1 — One level scale everywhere ✅
**Why:** The app used four different vocabularies for how a child is doing. "Beginner" was the **2nd** star when rating but the **lowest** level everywhere else, including on the parent PDF.

**Decision (16 Oct 2026)**
- **Levels everywhere** (lists, garden, Insights, parent PDF, parent page, school admin, platform admin): **Sprouting → Growing → Blooming** (lowest → highest).
- **Teacher observation rating (stars) only:** 4 points: **Seed → Sprouting → Growing → Blooming**. "Seed" appears nowhere else.
- **No data yet:** "Not assessed yet". This isn't a level, so these children are never counted as Sprouting.
- **Same cut-offs everywhere:** below 34 = Sprouting · 34–66 = Growing · 67 and above = Blooming.

**What changed in the sample code**
| Area | Change | Code |
|---|---|---|
| Rating stars | Seed / Sprouting / Growing / Blooming | [teacher-dashboard.js:1717](assets/teacher-dashboard.js:1717) |
| Teacher band values + all labels, legends, Insights boxes, Ask Tilli text | Beginner/Learner/Expert, Needs attention/Developing/Strong, Ready to tend/Blossoming → Sprouting/Growing/Blooming | [teacher-dashboard.js](assets/teacher-dashboard.js), [dashboard-data.js:93](assets/dashboard-data.js:93) |
| Landing band mix | Separate "Not assessed yet" count (previously folded into the lowest level) | [teacher-dashboard.js:612](assets/teacher-dashboard.js:612) |
| Parent PDF | Level cards + colours use the new names | [teacher-dashboard.js:1355](assets/teacher-dashboard.js:1355) |
| Parent page | Seedling/Sprouting/Blooming → Sprouting/Growing/Blooming (Sprouting was the *middle* level there) | [parent.html:422](parent.html:422) |
| School admin | Emerging/Developing/Secure → Sprouting/Growing/Blooming; cut-offs 40/70 → 34/67 | [admin-data.js:46](assets/admin-data.js:46), [admin.js](assets/admin.js) |
| Platform admin | 4 levels (Beginner/Learner/Proficient/Advanced) → 3 levels | [tilli-admin.js:1733](assets/tilli-admin.js:1733) |
| Colour lookup | `sprouting`=1, `growing`=2, `blooming`=3 | [tilli-api.js:48](assets/tilli-api.js:48) |

Internal code keys (`beginner`/`learner`/`expert`, `emerging`/`developing`/`secure`, plant states) were left as they are. Only the words people see changed.

**For Mayur (real DB)**
- [ ] Store the observation rating as 1–4 (Seed = 1 … Blooming = 4), not as a word, so the labels can change without a data migration.
- [ ] Compute levels from the score with the shared 34 / 67 cut-offs in one place (server or one shared helper), not separately per dashboard.
- [ ] Check that the school-admin targets ("Target N% Blooming") are re-set for the new cut-offs.

**Done when**
- [x] The same word means the same level on every screen and on the parent PDF.
- [x] No rating-star label reuses a level word at a different position.
- [x] Legends and tooltips are updated to match.

---

### T2 — Save progress when a teacher is interrupted mid-child ✅
**Why:** If the bell went halfway through a child and she came back through **Continue**, that child restarted from question 1.

**What changed in the sample code**
- **Every star tap is saved** as a draft for that child and window (`obsDrafts`, same shape as `observations`). Finishing the child turns the draft into a finished observation and removes the draft.
- **Coming back to a child** (Continue, "Start baseline for…", "Continue this assessment") restores their answers and opens at the **first unanswered question**, with a note: "Picked up where you left off with [name]".
- **Continue goes to the interrupted child first**, both on the landing and in Assess → To-do.
- **The tracker shows a started child as "In progress"**, not "Not started" (window status, By-student timeline, all-windows matrix).

| Piece | Code |
|---|---|
| Draft helpers (`draftOf`, `saveDraft`, `clearDraft`, `markTeacherStarted`) | [teacher-dashboard.js:306](assets/teacher-dashboard.js:306) |
| Restore + first unanswered question (`enterFor`) | [teacher-dashboard.js:1905](assets/teacher-dashboard.js:1905) |
| Draft storage (`saveObservationDraft`) | [teacher.js:1325](assets/teacher.js:1325) |
| "Started" counts as in progress (`finishWindow`) | [dashboard-data.js:46](assets/dashboard-data.js:46) |

**For Mayur (real DB)**
- [ ] The sample saves drafts in the browser (`TeacherStore` in teacher.js — the swap point). Replace it with an API call per tap (or a short debounce), keyed by teacher + student + window, so it **works on another device**.
- [ ] Ratings are stored as numbers 1–4 per skill key (Seed = 1 … Blooming = 4).
- [ ] When a finished observation is saved, delete that child's draft on the server too.
- [ ] Report a started-but-unfinished teacher observation as "In Progress" in the admin / CSV completion data.

**Done when**
- [x] Each answer is saved as she taps (sample: browser storage; real: DB — see above).
- [x] Leaving and coming back resumes the same child at the first unanswered question.
- [x] The child shows as "In progress" (not "Not started") in the tracker.
- [x] Works after a page reload.
- [ ] Works on a different device (needs the DB — Mayur).

---

### T3 — Replace hardcoded / sample data with real data **[DB]** ⬜
**Why:** Some values are fixed in the prototype and will be wrong for real teachers. The worst one: every child's History tab shows the same story.

| What | Code |
|---|---|
| Student History tab: the same 4 rows for every child ("Post assessment · week 14 · In progress", "Mid assessment · Done"…) | [teacher-dashboard.js:1566](assets/teacher-dashboard.js:1566) |
| "Good morning" fixed on the beds view and section garden (the landing already uses the real time of day) | [:889](assets/teacher-dashboard.js:889), [:1063](assets/teacher-dashboard.js:1063) |
| "week 14" fixed on the section garden | [:1064](assets/teacher-dashboard.js:1064) |
| Landing week labels and deadlines (Apr 2 / Jun 18 / Sep 24) | [:156](assets/teacher-dashboard.js:156) (`LANDING_STATES`) |
| To-do vine dates ("Completed · Apr 18", "Week 18"…) | [:1750](assets/teacher-dashboard.js:1750) |
| Window labels, weeks, dates | [dashboard-data.js:22](assets/dashboard-data.js:22) (`WINDOWS`) |
| "X of 9 check-ins done" assumes 9 | [teacher-dashboard.js:2120](assets/teacher-dashboard.js:2120) |

**Done when**
- [ ] Every item above reads from the school's real calendar, the real assessment log, or the clock.
- [ ] A child with no parent form shows the parent part as pending in History.

---

### T4 — Hide the "Preview state" switcher from teachers ⏸️
**Why:** The Baseline / Between / Midline / Endline box shows on every page. A teacher will ask "is this for me?"
**Note:** This is internal review tooling. **Keep it in the code.** It just shouldn't be visible in the teacher's real view.

**Code:** [teacher-dashboard.js:735](assets/teacher-dashboard.js:735) (`stateSwitcherGUI`), rendered from `paintDom` at [:479](assets/teacher-dashboard.js:479)

**Decision needed**
- [ ] How should internal users turn it on? (e.g. a URL flag like `?preview=1`, an internal/admin role, or the staging site only)

**Done when**
- [ ] Real teachers never see it.
- [ ] The team can still switch states for review.
- [ ] In production, the window state comes from the real deployment, not the switcher.

---

### T5 — Soften child labels and remove the parent email from screens a parent may see ⏸️
**Why:** The students list is the screen a teacher will have open on a laptop facing a parent at a parent-teacher meeting.

| What | Code |
|---|---|
| Under each child's name: "Beginner — start by focusing on Attention" | [teacher-dashboard.js:236](assets/teacher-dashboard.js:236) (`bandLine`) |
| Garden hover: "Needs help" | [:862](assets/teacher-dashboard.js:862), [:940](assets/teacher-dashboard.js:940) |
| Heading: "🌱 3 students at Beginner — start here" | [:1075](assets/teacher-dashboard.js:1075) |
| Parent email shown under the child's name in the header | [:1417](assets/teacher-dashboard.js:1417) (`stuHead`) |

**Decision needed**
- [ ] Gentler wording for the roster line and hover (e.g. "Growing in: Attention").
- [ ] Should the parent email move to an "Edit / contact" area, or be removed from the header entirely?

**Done when**
- [ ] No child-level label on the list views reads as a deficit.
- [ ] The parent email doesn't show on the main student header.

---

## P1 — Weekly friction

### T6 — One set of window names and week numbers ⏸️
**Why:** The same windows are called Baseline / Mid-year / End of year, Midline / Endline, Pre / Mid / Post, and "Mid-year report". The week numbers contradict each other: mid-year is "Week 8" in the tracker, "week 15" on the landing, and an "18-week check-in" sits on the To-do list.

| Where | Code |
|---|---|
| Landing hero ("Midline is open", "Endline is open") | [teacher-dashboard.js:172](assets/teacher-dashboard.js:172), [:180](assets/teacher-dashboard.js:180) |
| To-do vine titles ("Mid-year report", "End-of-year report") | [:1750](assets/teacher-dashboard.js:1750) |
| Student charts (Pre / Mid / Post) | [:1520](assets/teacher-dashboard.js:1520), [:1531](assets/teacher-dashboard.js:1531), [:1660](assets/teacher-dashboard.js:1660) |
| Window labels and weeks | [dashboard-data.js:22](assets/dashboard-data.js:22) |

**Decision needed**
- [ ] Pick one set (suggestion: **Baseline / Mid-year / End of year**).
- [ ] Should the CSV keep `PRE / MID / POST`? (It matches the platform export format, so it probably stays.)

**Done when**
- [ ] One name per window on every teacher screen.
- [ ] Week numbers come from one source (see T3) and agree everywhere.

---

### T7 — One name for the skill groups ⏸️
**Why:** It's "Cognitive" on the rating screen and student page, "Executive Function" in Insights, and "Cognitive Skills" on the parent PDF.
**Code:** [teacher-dashboard.js:1540](assets/teacher-dashboard.js:1540), [:1855](assets/teacher-dashboard.js:1855), [:2200](assets/teacher-dashboard.js:2200), [:1312](assets/teacher-dashboard.js:1312)

**Decision needed**
- [ ] "Cognitive" or "Executive Function"? (Teachers will find "Thinking skills" or "Cognitive" easier.)

**Done when**
- [ ] The same group name is used on every screen and on the PDF.

---

### T8 — Simplify Assess → one "still to do" list ⏸️
**Why:** There are roughly six ways to answer "who haven't I done?": the To-do vine, Tracker → By class / By student / List, "See all windows together", and "Your classes at a glance". She wants one list of names with a Start button.
**Code:** [teacher-dashboard.js:1718](assets/teacher-dashboard.js:1718) (`assessView`), [:1921](assets/teacher-dashboard.js:1921) (`assessCompleted`)

**Decision needed**
- [ ] Which views stay as the default, and which move behind a "More" option (or are dropped)?
- [ ] Note: the single-window per-informant view and the CSV download were asked for in the earlier feedback round, so keep them.

**Done when**
- [ ] Opening Assess shows one list: pending children first, each with Start / Continue.
- [ ] Other views are one tap away at most, not the first thing she sees.

---

### T9 — Phone nav label, tappable garden, reachable section garden ⬜
**Why:**
- On a phone, the first tab is labelled **"My"** ([teacher-dashboard.js:135](assets/teacher-dashboard.js:135)).
- The flowers on the landing look like her children, but tapping them does nothing (the scene is `aria-hidden`, [:604](assets/teacher-dashboard.js:604)).
- The beds view and section garden are only reached after adding a class ([:2841](assets/teacher-dashboard.js:2841)).

**Done when**
- [ ] The phone tab reads "Garden" or "Home".
- [ ] Tapping the landing garden opens the section garden for that class (or the scene clearly reads as decoration).
- [ ] The section garden is reachable from the landing in one tap.

---

### T10 — Class Skill Overview: make clear the boxes count skills, not children ⬜
**Why:** "4 · Needs attention" reads as four children. The explanation paragraph is a sign the layout itself isn't clear.
**Code:** [teacher-dashboard.js:2290](assets/teacher-dashboard.js:2290) (`classOverviewCard`)

**Done when**
- [ ] Box text says "4 **skills**", or similar.
- [ ] The long explanation paragraph can be shortened or removed.

---

### T11 — Explain what the % numbers mean ⏸️
**Why:** "If a parent asks me what 58% means, I don't know." This applies to Growth over time, student skill cards and Perspectives.

**Decision needed**
- [ ] A one-line plain-English definition of the score and where it comes from (which informants, and how they're combined).

**Done when**
- [ ] A small ⓘ next to each score area shows that line.
- [ ] The wording matches the parent PDF's explanation.

---

### T12 — Plain copy fixes ⬜
| Now | Change to | Code |
|---|---|---|
| "Completed rate" | "Done so far" | [teacher-dashboard.js:2041](assets/teacher-dashboard.js:2041) |
| Tab "Tracker" opens a screen with a different title | Use the same name for the tab and the screen | [:1724](assets/teacher-dashboard.js:1724) |

**Done when**
- [ ] Both changes are made.

---

### T13 — Faster observations: rate one skill across the class ⏸️
**Why:** 12 questions × 32 children ≈ 384 taps per window, about 40 minutes uninterrupted. Teachers notice things skill by skill across the class ("who waited their turn today?").

**Decision needed (research)**
- [ ] Is it valid for the Behavioral Report instrument to be filled skill-by-skill across children instead of child-by-child? If not, close this task.

**Done when** (if approved)
- [ ] An optional "By skill" mode: one skill, every child's name, tap a rating for each.
- [ ] It saves into the same per-child record as the current flow.

---

## P2 — Polish

### T14 — Review the extra surveys and check-ins on the To-do vine ⏸️
**Why:** The pre-training survey, post-training survey, 18-week check-in and 36-week check-in on top of three observation windows read as extra admin.
**Code:** [teacher-dashboard.js:1750](assets/teacher-dashboard.js:1750)

**Decision needed**
- [ ] Which of these are required, and which are optional? Mark the optional ones visibly.

---

### T15 — Perspectives: demote the radar chart, spell out T/P/S ⬜
**Why:** The spider chart is hard to read, especially on a phone. "T 62 · P 40 · S 71" is cryptic.
**Code:** [teacher-dashboard.js:1543](assets/teacher-dashboard.js:1543) (`stuPerspectives`), [:1676](assets/teacher-dashboard.js:1676) (`radarSVG`)

**Done when**
- [ ] The list of skills with Teacher / Parent / Student values is the main view.
- [ ] The radar is secondary or removed.
- [ ] Labels are written out, or shown as the 👩‍🏫 🏠 🧒 icons used elsewhere.

---

### T16 — Tap instead of hover for tooltips (phone) ⬜
**Why:** Teachers mostly use phones, so hover tooltips never appear.
**Code:** beds tooltip [teacher-dashboard.js:858](assets/teacher-dashboard.js:858), section garden tooltip [:1022](assets/teacher-dashboard.js:1022)

**Done when**
- [ ] The same information is reachable by tap on touch devices.

---

### T17 — Preview a parent report before downloading ⬜
**Code:** [teacher-dashboard.js:1122](assets/teacher-dashboard.js:1122) (`selectBar`), [:1303](assets/teacher-dashboard.js:1303) (`reportHTML`)

**Done when**
- [ ] Tapping one selected child shows the report on screen before the PDFs are made.

---

### T18 — Show which parents haven't done their part, plus a reminder message to copy ⏸️
**Why:** "What I actually need is to know which parents haven't filled theirs so I can message them on the class WhatsApp group."

**Decision needed**
- [ ] Is the teacher allowed to see parent completion per child? (The tracker already shows it.)
- [ ] Is a copyable reminder text OK, and who writes it?

**Done when**
- [ ] A filtered list of children whose parent part is pending.
- [ ] A "Copy reminder" button with ready-to-paste text.

---

### T19 — Shorter first-time setup ⏸️
**Why:** There are four demographic steps (all required, including age and gender), a reflection, then adding students, all before the teacher sees anything.
**Note:** The demographic step and the reflection were requested in the previous feedback round. This task is only about trimming or ordering them, not removing them.
**Code:** [teacher.js:412](assets/teacher.js:412) (`demoView`)

**Decision needed**
- [ ] Which fields can be optional or asked later (e.g. from Profile)?

---

## Decision log

Record answers here as they're made, so Mayur has one place to look.

| Date | Task | Decision | Decided by |
|---|---|---|---|
| 16 Oct 2026 | T1 | Levels = Sprouting / Growing / Blooming everywhere (all dashboards + parent PDF). Rating stars = Seed / Sprouting / Growing / Blooming (Seed only there). No data = "Not assessed yet". One set of cut-offs: 34 / 67. | Product |
| 16 Oct 2026 | T2 | Save each rating as a draft on tap; resume at the first unanswered question; Continue prefers the interrupted child; started = "In progress". | Product |
| | | | |
