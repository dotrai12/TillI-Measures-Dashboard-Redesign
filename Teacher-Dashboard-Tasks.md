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
| ⏭️ | Parked: will be done later |
| ✅ | Done |

### Priority key
- **P0**: a teacher would stop using it, or it could mislead a parent. Do these first.
- **P1**: real friction every week.
- **P2**: polish and nice-to-haves.

---

## ▶ Now working on

> **All active tasks are done.** Left: **T3** and **T4** (parked for later) and **T11** (waiting on Masoomi / Kavi). *(update this line when you move on)*

---

## Progress summary

| ID | Task | Priority | Owner | Status |
|---|---|---|---|---|
| T1 | One level scale everywhere | P0 | Product → Mayur | ✅ |
| T2 | Save progress when a teacher is interrupted mid-child | P0 | Mayur | ✅ |
| T3 | Replace hardcoded / sample data with real data **[DB]** | P0 | Mayur | ⏭️ |
| T4 | Hide the "Preview state" switcher from teachers | P0 | Mayur | ⏭️ |
| T5 | Soften child labels on screens a parent may see | P0 | Product → Mayur | ✅ |
| T6 | One set of window names, dates instead of week numbers | P1 | Product → Mayur | ✅ |
| T7 | One name for the skill groups | P1 | Product → Mayur | ✅ |
| T8 | Simplify Assess → one "still to do" list | P1 | Product → Mayur | ✅ |
| T9 | Phone nav label, tappable garden, reachable section garden | P1 | Mayur | ✅ |
| T10 | Class Skill Overview: make clear the boxes count skills, not children | P1 | Mayur | ✅ |
| T11 | Explain what the % numbers mean | P1 | Product → Mayur | 🟡 |
| T12 | Plain copy fixes ("Completed rate", "Tracker") | P1 | Mayur | ✅ |
| T13 | Observation in pages (21 questions, 6 per page) | P1 | Product → Mayur | ✅ |
| T14 | Review the extra surveys and check-ins on the To-do vine | P2 | Product | ✅ |
| T15 | Perspectives: demote the radar chart, spell out T/P/S | P2 | Mayur | ✅ |
| T16 | Tap instead of hover for tooltips (phone) | P2 | Mayur | ✅ |
| T17 | Preview a parent report before downloading | P2 | Mayur | ✅ |
| T18 | Show which parents haven't done their part, plus a reminder message to copy | P2 | Product → Mayur | ✅ |
| T19 | Shorter first-time setup | P2 | Product | ✅ |

**Done: 16 / 19** (T3, T4 parked · T11 waiting on confirmation)

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
- [ ] Ratings are stored as numbers 1–4 per **question id** (Seed = 1 … Blooming = 4). See T13.
- [ ] When a finished observation is saved, delete that child's draft on the server too.
- [ ] Report a started-but-unfinished teacher observation as "In Progress" in the admin / CSV completion data.

**Done when**
- [x] Each answer is saved as she taps (sample: browser storage; real: DB — see above).
- [x] Leaving and coming back resumes the same child at the first unanswered question.
- [x] The child shows as "In progress" (not "Not started") in the tracker.
- [x] Works after a page reload.
- [ ] Works on a different device (needs the DB — Mayur).

---

### T3 — Replace hardcoded / sample data with real data **[DB]** ⏭️
> Parked: will be done later.

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

### T4 — Hide the "Preview state" switcher from teachers ⏭️
> Parked: will be done later.

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

### T5 — Soften child labels on screens a parent may see ✅
**Why:** The students list is the screen a teacher will have open on a laptop facing a parent at a parent-teacher meeting.

**Decision (16 Oct 2026) and what changed**
| Where | Before | After | Code |
|---|---|---|---|
| Students list / garden tooltip line under the name | "Sprouting — start by focusing on Attention" | "Sprouting · Attention next" | [teacher-dashboard.js:236](assets/teacher-dashboard.js:236) (`bandLine`) |
| Garden hover + class pop-up | "Needs help: Attention" | "Next to practise: Attention" | [:899](assets/teacher-dashboard.js:899), [:977](assets/teacher-dashboard.js:977) |
| Class garden heading | "🌱 3 students at Sprouting — start here" | "🌱 3 children could use a little extra" | [:1112](assets/teacher-dashboard.js:1112) |
| Parent email under the child's name | — | **Kept as is** (decision) | — |

**Done when**
- [x] No child-level label on the list views reads as a deficit.
- [x] Parent email decision made (keep).

---

## P1 — Weekly friction

### T6 — One set of window names, dates instead of week numbers ✅
**Why:** The same windows were called Baseline / Mid-year / End of year, Midline / Endline, Pre / Mid / Post and "Mid-year report", and the week numbers contradicted each other (the 36-week check-in fell after the Endline window).

**Decision (16 Oct 2026)**
- Window names everywhere: **Baseline / Midline / Endline**. These were already used by the parent page, both admin dashboards and the data layer, so only the teacher dashboard changed.
- **Dates only, no week numbers** (e.g. "Due Jun 18").
- **CSV columns use the new names** too, e.g. `Memory Game (Baseline)`, `Memory Game (Midline)`.

**What changed (teacher dashboard)**
| Where | Before | After |
|---|---|---|
| Window list + subtitles ([dashboard-data.js:22](assets/dashboard-data.js:22), [school-data.js:52](assets/school-data.js:52)) | Mid-year · Week 8 / End of year · Week 14 | Midline · Mid year / Endline · End of year |
| Landing subtitle | "Your Kindergarten A garden · week 14" | "Your Kindergarten A garden" |
| Landing "resting" caption | "next update at Mid-year" | "next update at Midline (Jun 18)" |
| Class garden subtitle | "…garden, week 14." | "…garden." |
| To-do vine | "18-week check-in", "Mid-year report", "36-week check-in", "End-of-year report" | "Check-in before Midline" (due before Jun 18), "Midline observations", "Check-in before Endline" (due before Sep 24), "Endline observations" |
| Student overview chart | Pre · Mid · Post | Baseline · Midline · Endline |
| Student skill cards (small bars) | Pre / Mid / Post | Base / Mid / End (short forms of the same names) |
| Student History rows | Post assessment / Mid assessment / Baseline (Pre) | Endline / Midline / Baseline |
| Tracker list headers, Insights growth chart + "Every skill" cards | Mid-year / End of year | Midline / Endline |
| CSV export columns | `(PRE)` / `(MID)` / `(POST)` | `(Baseline)` / `(Midline)` / `(Endline)` |

**For Mayur (real DB)**
- [ ] Window names and dates come from the school's deployment (one source for every dashboard).
- [x] ~~Give the two check-ins real dates~~ (check-ins removed in T14).
- [ ] If anything imports the teacher CSV, update it for the new column names.

**Done when**
- [x] One name per window on every teacher screen.
- [x] No week numbers left to disagree; dates come from the window list.

---

### T7 — One name for the skill groups ✅
**Why:** The second skill group was "Cognitive" on the rating screen and student page, "Executive Function" in Insights and school admin, "Cognitive Skills" on the parent PDF and "Cognitive / EF" in platform admin.

**Decision (16 Oct 2026):** **Cognitive** on every dashboard. Section headings that read "Cognitive Skills" (parent PDF, platform admin student report) stay, since they sit beside "Social-Emotional Learning".

**What changed**
| Where | Before | After |
|---|---|---|
| Teacher Insights: growth chart filter + line label, "Every skill" toggle + card tags | Executive Function | Cognitive |
| School admin skill bucket ([admin.js](assets/admin.js)) | Executive Function | Cognitive |
| Platform admin region bars + legend ([tilli-admin.js](assets/tilli-admin.js)) | Cognitive / EF | Cognitive |

**Not changed:** the platform admin's teacher assessment list still names an instrument **"EF Observation"** ([tilli-admin.js:1309](assets/tilli-admin.js:1309)). That's the name of the assessment itself, not a group label. Rename it only if the instrument's real name changes.

**Done when**
- [x] The same group name is used on every screen and on the PDF.

---

### T8 — Simplify Assess → one "still to do" list ✅
**Why:** There were about six ways to answer "who haven't I done?": the To-do vine, Tracker → By class / By student / List, "See all windows together", and "Your classes at a glance", all nested three levels deep. Two of them were also misleading: the List "Pending" filter counted windows that hadn't opened yet, and the all-windows matrix showed unopened windows as "Not started" while the window cards showed them as locked.

**Decision (16 Oct 2026)**
- Assess opens on the **journey first**. Tapping the open window's step opens a **who's-still-to-do screen** (not an inline list).
- **No window open:** one calm line, e.g. "🌿 Nothing to observe right now. Midline opens Jun 18."
- **Tracker = one screen:** window cards, the per-informant table (Teacher / Parent / Student), History and Download CSV. "Your classes at a glance" only shows with 2+ sections. **Removed:** the By student timeline (the student profile covers it), the List view and the all-windows matrix.

**What changed**
| Piece | Code |
|---|---|
| **Who's still to do** (`pendingView`): tapping the active step ("Continue baseline observations →") opens its own To-do screen with started children first ("Started · 5 of 12" → **Continue**), then "Not started" → **Start**, a "Start with [next] →" shortcut, a search box when there are more than 8 children, and "Done (n)" folded. "← Back to the journey" returns. *(First version put the list inline under the step; changed so a class of 30 doesn't stretch the journey.)* | `pendingView` |
| Tracker as one screen (`assessCompleted`), "classes at a glance" only for 2+ sections | [teacher-dashboard.js:2027](assets/teacher-dashboard.js:2027) |
| **Follow-up (16 Oct):** tapping a child's row opens that child's **all-windows timeline** (Teacher / Parent / Student per window, with a "← Back to tracker" link). Windows that haven't opened show "🔒 Not open yet", not "Not started". "Start / Continue [name]'s observation" only appears on the open window | `trackerStudentView` |
| **Real completion dates:** "Done · 16 Oct" in the timeline and a small date under each ✓ in the table. They come from the saved teacher observation or `TilliAPI.completedAt()`. The old view showed the *window's scheduled date* ("Done · Apr 2") as if it were the completion date; that's gone. No recorded date → just "Done" | `doneDate`, [tilli-api.js](assets/tilli-api.js) `completedAt` |
| Removed `logsAllWindows`, `logsList` and the By student tab + its search/picker (the timeline itself lives on as the row drill-in) | — |

**For Mayur (real DB)**
- [ ] Store a completion timestamp for every informant part (teacher, parent, student) and return it with the assessment log, so every "Done" can show its real date.

**Done when**
- [x] One tap from the open window's step shows pending children first, each with Start / Continue.
- [x] Other views are one tap away at most (Tracker tab), with no inner tabs.

---

### T9 — Phone nav label, tappable garden, reachable section garden ✅
**Why:** On a phone the first tab read **"My"**. The landing flowers looked like her children but did nothing when tapped. The class garden (one plant per child) and the all-classes view could only be reached by accident.

**What changed**
| Where | Change | Code |
|---|---|---|
| Phone bottom bar | "My" → **"Garden"** | [teacher-dashboard.js:135](assets/teacher-dashboard.js:135) |
| Landing garden scene | The whole scene is now a button that opens the class garden, plus a **"See each child's plant →"** link under the caption | [teacher-dashboard.js:761](assets/teacher-dashboard.js:761) |
| Class garden | "← My garden" used to jump to the all-classes view; it now goes back to the landing ("← My Garden"). **"All my classes →"** appears when she has 2+ sections | `sectionGardenView` |
| All-classes view | New "← My Garden" link back to the landing (it had no way back except the nav) | `bedsView` |

**Done when**
- [x] The phone tab reads "Garden".
- [x] Tapping the landing garden opens the class garden for that class.
- [x] The class garden is reachable from the landing in one tap.

---

### T10 — Class Skill Overview: make clear the boxes count skills, not children ✅
**Why:** "4 · Needs attention" read as four children. The long colour explanation showed the boxes didn't explain themselves.

**What changed** (`classOverviewCard` in [teacher-dashboard.js](assets/teacher-dashboard.js))
| Before | After |
|---|---|
| **4** / **Sprouting** / *skills where most students are here* (small grey) | **4 skills** / **Mostly Sprouting** |
| "For every skill, we grouped your students into Sprouting, Growing, and Blooming. The colour is whichever group is largest, so green means most of your class is at Blooming, not all of them." | "Each skill is coloured by where most of your class sits." |

**Done when**
- [x] Box text says "4 skills".
- [x] The long explanation paragraph is shortened.

---

### T11 — Explain what the % numbers mean 🟡
> Built in the sample with provisional wording. **Waiting on Masoomi / Kavi** to confirm whether we show percentages at all.

**Why:** "If a parent asks me what 58% means, I don't know."

**Decision (16 Oct 2026, provisional)**
- Score ⓘ: *"A 0–100 score for this skill, combining your observation, the parent's survey and the child's own tasks. Under 34 = Sprouting · 34–66 = Growing · 67+ = Blooming."*
- Perspectives ⓘ: *"Each view's own 0–100 score for the skill: 👩‍🏫 your observation, 🏠 the parent's survey, 🧒 the child's own tasks. The skill's level combines all three."*
- The wording deliberately doesn't say how the three views are weighted.

**What changed** — an ⓘ button that opens on **tap** (works on phones), in 5 places:
| Where | Text |
|---|---|
| Insights → Class Skill Overview heading | Score |
| Insights → Growth over time heading | Score |
| Insights → Perspectives → "Every skill, three viewpoints" | Perspectives |
| Child page → Skills tab ("How skills are scored") | Score |
| Child page → Perspectives tab ("Three perspectives") | Perspectives |

Text lives in `SCORE_INFO` / `PERSP_INFO` in [teacher-dashboard.js](assets/teacher-dashboard.js), so it's a one-line change once confirmed.

**Still open**
- [ ] **Masoomi / Kavi:** do we show percentages to teachers at all, or only the level (Sprouting / Growing / Blooming)?
- [ ] Confirm how the three views are combined, so the ⓘ (and the parent report) can say it precisely.
- [ ] If percentages stay, make sure the parent report's wording matches.

**Done when**
- [x] A small ⓘ next to each score area shows the explanation.
- [ ] The wording is confirmed and matches the parent PDF.

---

### T12 — Plain copy fixes ✅
| Before | After | Code |
|---|---|---|
| Table title "Completed rate · Endline — End of year" | "Done so far · Endline — End of year" | `logsSingleWindow` |
| Assess tab "Tracker" (opened a screen titled "Completed rate") | Tab **"Done so far"**, paired with "To-do", so the tab and the screen use the same words | `assessView` |

**Done when**
- [x] Both changes are made.

---

### T13 — Observation in pages (21 questions, 6 per page) ✅
**Why:** One question per screen meant hundreds of taps per window. The questions can't be cut down yet (21 per child, set by the assessment template), so the change is in *how* they're shown.

**Decision (16 Oct 2026)**
- **21 questions per child**, shown **6 per page** (pages of 6 · 6 · 6 · 3).
- The 21 in the sample are **demo questions**. The real ones will come from the Teacher assessment template on the Tilli internal platform admin.
- "Rate one skill across the whole class": **not now**.

**What changed** ([teacher-dashboard.js:1757](assets/teacher-dashboard.js:1757))
- `OBS_QUESTIONS`: 21 demo questions, each mapped to one of the 12 skills (so the skill name and Social-Emotional / Cognitive group still show). Every read goes through `obsQuestions()`, the single swap point for the template.
- Each page shows 6 question cards, each with the 4-point Seed → Blooming rating. A card turns green when answered.
- **"Next page →"** stays disabled until all questions on the page are answered ("2 left on this page"). The last page says "Finish → next child". "← Back" returns to the previous page. Each page change scrolls to the top of the card.
- One progress dot per question (answered = green, this page = amber), plus "Page 2 of 4 · 9 of 21 answered".
- Saving and resuming (T2) still works per tap; a resumed child opens on the page with their first unanswered question. The still-to-do list shows "Started · 9 of 21".
- **`OBS_PAGE_SIZE = 6`** controls the questions per page.

**For Mayur (real DB)**
- [ ] `obsQuestions()` should return the Teacher template's questions for the open deployment (id, text, skill key), in order.
- [ ] Ratings are now saved **per question id** (`{ q01: 3, … }`), not per skill. The skill score has to be computed from the questions mapped to each skill.

**Done when**
- [x] 21 questions per child, 6 per page, can't move on until the page is answered.
- [x] Resume opens on the right page.

---

## P2 — Polish

### T14 — Review the extra surveys and check-ins on the To-do vine ✅
**Why:** The pre-training survey, post-training survey and two check-ins on top of three observation windows read as extra admin. Also, "Start check-in →" actually opened a child observation, because no check-in form existed.

**Decision (16 Oct 2026)**
- **Both check-ins removed** ("Check-in before Midline" / "Check-in before Endline") until a real check-in exists.
- **Both training surveys stay required** (pre = first-time reflection, post = retake that updates the Teaching Mirror).

**What changed** (`obsVine` in [teacher-dashboard.js](assets/teacher-dashboard.js))
- The journey is now 5 steps: Pre-training survey → Baseline observations → Post-training survey → Midline observations → Endline observations.
- Between windows, the current step is the post-training survey. Once it's done nothing is active, and the "🌿 Nothing to observe right now. Midline opens Jun 18." line shows.
- Small wording cleanups so "check-in" no longer means two things: Endline hero "The final check-in…" → "The final window…", and the tracker's child view "3 of 9 check-ins done" → "3 of 9 parts done".

**Done when**
- [x] Every step on the journey is required and leads somewhere real.

---

### T15 — Perspectives: demote the radar chart, spell out T/P/S ✅
**Why:** The spider chart was hard to read, especially on a phone, and "T 62 · P 40 · S 71" was cryptic.

**What changed** (child page → Perspectives tab, `stuPerspectives` in [teacher-dashboard.js](assets/teacher-dashboard.js))
- **The list is the main view:** all 12 skills (was the top 6), biggest difference first, each showing "👩‍🏫 Teacher **62** · 🏠 Parent **40** · 🧒 Student **71**", with the "Worth a conversation" badge and Ask Tilli button kept.
- **The radar chart is folded** under "See it as a chart" (closed by default, remembers if opened). It's kept, not deleted.
- Rows wrap on a phone, so the badge and button drop under the numbers instead of squeezing them.
- Insights → Perspectives already wrote out Teacher / Parent / Student, so no change there.

**Done when**
- [x] The list with Teacher / Parent / Student values is the main view.
- [x] The radar is secondary.
- [x] Labels are written out, with the 👩‍🏫 🏠 🧒 icons.

---

### T16 — Tap instead of hover for tooltips (phone) ✅
**Why:** Teachers mostly use phones, so hover-only tooltips never appeared.

**Decision (16 Oct 2026):** hover stays on desktop; on touch devices an **ⓘ** opens the same tooltip by tap. Detection is by device (`@media (hover: none)`), not screen width, so a touchscreen laptop with a mouse still gets hover.

**What changed** ([teacher-dashboard.js](assets/teacher-dashboard.js))
| Where | Phone behaviour |
|---|---|
| Class garden: each child's plant | A small ⓘ above the plant opens the name / level / skill-count card. Tapping the plant itself still opens the child. One card open at a time; tapping anywhere else closes it. |
| Insights → Growth over time | A row of chips under the chart, "ⓘ Baseline · ⓘ Midline · ⓘ Endline", each opens that window's readout (tap again to close). The Table view toggle still works too. |

**Left as is (the tap already shows the same information)**
- All-classes garden: tapping a bush opens the class pop-up, which lists every child's "Good at / Next to practise".
- 🕘 History buttons: tapping opens the history, which shows the last update.

**Done when**
- [x] The same information is reachable by tap on touch devices.

---

### T17 — Preview a parent report before downloading ✅
**What changed** (Students → ☑ Parent reports → select children)
- New **👁 Preview** button in the selection bar opens the selected children's reports on screen, one at a time with **‹ Previous / Next ›**, and **⬇ Download PDFs** from inside the preview.
- The preview uses the same `reportHTML()` as the PDF, so the content matches. The A4 page is scaled down to fit the window (`fitReportPreview`), so it reads on a phone too.
- Page breaks only exist in the PDF, so the preview shows the report as one continuous page.

**Done when**
- [x] The report can be seen on screen before the PDFs are made.

---

### T18 — Show which parents haven't done their part, plus a reminder message to copy ✅
**Why:** "What I actually need is to know which parents haven't filled theirs so I can message them on the class WhatsApp group."

**What changed** (Assess → Done so far, above the table, for the selected window)
- **"🏠 N parents still to finish · Midline closes Jun 18"**, or "Every parent has finished 🌸".
- **📋 Copy reminder for the class group**: copies a message with **no children's names**, safe for a group chat:
  > *Hello parents 🌱 A gentle reminder: the Tilli Midline parent survey for Kindergarten A closes on Jun 18. It helps us see how your child is growing at home. If you've already finished it, thank you! — [teacher name]*
- **"Who's still to finish (N)"** fold: each child, their parent's progress ("1 of 2 parts") and **Copy message** for a one-to-one DM:
  > *Hello! A gentle reminder that Anaya's Tilli Midline parent survey closes on Jun 18. It helps us see how Anaya is growing at home. Thank you! — [teacher name]*
- "Copied ✓" confirms on the button.

**Still open**
- [ ] Product to review the two reminder texts (drafted, not yet approved).
- [ ] Once parents have a real link or app to open, add it to both messages.

**Done when**
- [x] A list of children whose parent part is pending.
- [x] A "Copy reminder" button with ready-to-paste text.

---

### T19 — Shorter first-time setup ✅ (decided: no change)
**Why it was raised:** Four demographic steps (all required), a reflection, then adding students, all before the teacher sees anything.

**Decision (16 Oct 2026):** **Nothing can be skipped or done later.** Every field and step in the first-time setup stays required.

**Checked in the code ([teacher.js](assets/teacher.js)):** this is already how it works, so no change was needed.
- Each demographic step's **Next** stays disabled until every field is filled (`demoValid`).
- Each reflection question must be answered before **Next** (`selfAnswered`), including the written ones.
- "Enter my garden" stays disabled until the student list is valid.

**Note:** The *post-training* reflection retake (not the first-time setup) has a **"Not now — back to my dashboard"** button. T14 made that survey required, so decide whether "Not now" should stay there.

---

## Decision log

Record answers here as they're made, so Mayur has one place to look.

| Date | Task | Decision | Decided by |
|---|---|---|---|
| 16 Oct 2026 | T1 | Levels = Sprouting / Growing / Blooming everywhere (all dashboards + parent PDF). Rating stars = Seed / Sprouting / Growing / Blooming (Seed only there). No data = "Not assessed yet". One set of cut-offs: 34 / 67. | Product |
| 16 Oct 2026 | T2 | Save each rating as a draft on tap; resume at the first unanswered question; Continue prefers the interrupted child; started = "In progress". | Product |
| 16 Oct 2026 | T3, T4 | Parked: will be done later. | Product |
| 16 Oct 2026 | T5 | Roster line "Sprouting · [skill] next"; hover "Next to practise"; heading "N children could use a little extra"; parent email stays on the student header. | Product |
| 16 Oct 2026 | T6 | Windows = Baseline / Midline / Endline everywhere. Dates only, no week numbers. CSV columns use the new names. | Product |
| 16 Oct 2026 | T7 | Skill group = "Cognitive" on every dashboard (headings may say "Cognitive Skills"). | Product |
| 16 Oct 2026 | T8 | Assess = journey first + still-to-do list under the open window's step; calm "nothing due" note between windows. Tracker = window cards + per-informant table + CSV (+ classes at a glance for 2+ sections); By student, List and all-windows matrix removed. | Product |
| 16 Oct 2026 | T8 follow-up | Tracker row → child's all-windows timeline (back to tracker). Show real completion dates (timeline + under each ✓ in the table); never the window's scheduled date. | Product |
| 16 Oct 2026 | T8 follow-up | Pending children move off the journey into their own To-do screen, opened from "Continue … observations" (scales to 30+ children). | Product |
| 16 Oct 2026 | T9 | Phone tab "Garden"; landing garden scene + link open the class garden; class garden back → landing, "All my classes →" for 2+ sections. | Product |
| 16 Oct 2026 | T10 | Overview boxes read "N skills · Mostly [level]"; explanation cut to one line. | Product |
| 16 Oct 2026 | T11 | Provisional ⓘ score explanations in 5 places. Masoomi / Kavi to confirm whether percentages are shown at all. | Product |
| 16 Oct 2026 | T12 | "Completed rate" → "Done so far"; Assess tabs = "To-do" / "Done so far". | Product |
| 16 Oct 2026 | T13 | Keep 21 questions per child (demo set for now; real ones from the platform-admin Teacher template). Show 6 per page; must answer the page to go on. "Rate one skill across the class" not now. | Product |
| 16 Oct 2026 | T14 | Check-ins removed from the journey until a real check-in exists; pre- and post-training surveys stay required. | Product |
| 16 Oct 2026 | T15 | Child Perspectives: full list first with Teacher / Parent / Student written out; radar folded under "See it as a chart". | Product |
| 16 Oct 2026 | T16 | Hover on desktop; ⓘ to tap on touch devices (class-garden plants, growth chart). | Product |
| 16 Oct 2026 | T17, T18 | Report preview before download. Done so far shows parents still to finish, with a no-names group reminder + per-child DM message (texts drafted, to review). | Product |
| 16 Oct 2026 | T19 | First-time setup stays fully required: nothing skipped or deferred (already enforced; no change). | Product |
| | | | |
