# Baseline walkthrough — one new school, start to finish

Follow one brand-new school, **Mango Tree School**, from the day Tilli signs it until its Baseline results are out. The steps run in the order things happen in real life, and you switch role whenever the story does (Tilli → school admin → teacher → children → parents → back).

- Each step has an ID (e.g. **B3.2**). Put feedback under the same ID in [Walkthrough-Feedback.md](Walkthrough-Feedback.md).
- **✅** = what you should see. **⚠ K…** = a known gap (listed in the feedback doc), so you don't trip on it.
- Midline and Endline get their own walkthroughs once this one is done.

---

## Before you start

**Use one browser profile and no private windows.** Everything is saved in this browser's storage; a private window can't see the school you create. Open every page from the same place (all from the folder, or all from `http://localhost:…`). Switch roles by signing out, or from a new tab via `index.html`.

**The cast** (made-up `.test` emails — they can't reach a real person)

| Who | Email | Password |
|---|---|---|
| Tilli team | `team@tilli.org` | `Tilli@Team1` (the only password that's checked) |
| School admin — Asha Kumar | `admin@mangotree.test` | `tilli123` (any password works) |
| Teacher — Ritu Menon, Grade 1 A | `teacher@mangotree.test` | temporary one from the invite, then set `tilli123` |
| Second teacher — Dev Pillai (optional, B5.3) | `teacher2@mangotree.test` | `tilli123` |
| Parent of Anika | `parent1@mangotree.test` | `tilli123` |
| Parent of Kabir | `parent2@mangotree.test` | `tilli123` |
| Parent of Meher | `parent3@mangotree.test` | `tilli123` |

**The school:** India · **CBSE + IB** (two boards) · Vidya Trust group · 1 grade (Grade 1, on CBSE) · 1 section (A) · class size **3**.

| Child | Admission # |
|---|---|
| Anika Rao | `MT-001` |
| Kabir Shah | `MT-002` |
| Meher Iyer | `MT-003` |

**Why so small:** results only show once every part of Baseline (teacher, parent, student) is done or the window has ended. Three children means you can do every part yourself.

---

## B1 · Tilli signs the school

**B1.1 Sign in as Tilli**
- [x] `index.html` → **Get started** → **Tilli Team** → `team@tilli.org` → **Enter** → `Tilli@Team1` → **Enter via password**.

✅ The **Control Room**: Needs attention cards, Platform stats, Recent activity, and quick actions (+ Add School, + Invite User, + Deployment, + Template).

**B1.2 Look at what you'll deploy (optional, 5 min)**
- [x] Sidebar → **Templates** → open **Teacher Report** → **Baseline** → **History** → **View** a version. Look, don't publish. ⚠ K13: template edits are lost on reload, and the Baseline you deploy in B3 uses its own default list.

**B1.3 Create the school**
- [x] Control Room → **+ Add School** → **Add a partner school**.
- [x] **Profile**: name `Mango Tree School` · boards **CBSE** and **IB** (tick both) · **India** → a city · group **Vidya Trust** (an existing one — ⚠ K19: a group made with ＋ New group… is lost on reload) · Joined = today · academic year as suggested (1 Jun 2026 → 31 May 2027). Leave **School calendar** empty (the school sends it in B2.2). → **Next**.
- [x] **Grades**: **＋ Grade 1** → set its board to **CBSE** (the dropdown next to the grade name) → **＋ Section** → set the section's size to **3** (it starts at 30).
- [x] **First admin**: `Asha Kumar` · `admin@mangotree.test` · **Board access**: All boards (CBSE + IB).
- [x] **Review** → **Create school**.

✅ A toast "Mango Tree School created with 1 sections" and the school's page opens.

**B1.4 Codes and access**
- [x] **Staff & Access** → **Demo access & codes**: the coordinator login (`admin@mangotree.test`) and the **school code** (`MANG-…`). Write the code down; you need it in B5.3.
- [x] **School code** card → **Copy code**.

✅ "Admission numbers: add students first" — the school has no children yet.

⚠ K18: Asha gets no invite email or temporary password. In the prototype she signs in with any password.

---

## B2 · The school sets itself up

**B2.1 School admin's first sign-in**
- [x] Sign out (Tilli profile) → `index.html` → **Get started** → **School** → `admin@mangotree.test` → **Enter** → `tilli123` → **Enter via password**.

✅ The school dashboard. **Overview** says "Nothing to show yet — Your school appears here once the first check-in opens." Outcomes says "Nothing measured yet", Reports "Nothing to share just yet."

⚠ K24: ignore the **Preview stage** panel bottom-left; it does nothing for a new school.

**B2.2 Send the school calendar**
- [x] **Calendar** → **Upload a PDF or photo** (any file).

✅ Terms, exam blocks and holidays fill in, with a note to check every date. ⚠ K22: the dates are invented from the school year; the file isn't read.
- [x] Change one holiday → **Save draft** ("Draft saved.") → **Send to Tilli** ("Sent — the Tilli team will set your assessment dates.").

**B2.3 Check the class**
- [x] **Roster** → **Classes**: Grade 1 · A · **0 of 3** · Teacher: *No teacher*.

**B2.4 Add the children**
- [x] **Roster** → **+ Add students** → paste:
  ```
  Anika Rao,MT-001,Grade 1,A
  Kabir Shah,MT-002,Grade 1,A
  Meher Iyer,MT-003,Grade 1,A
  ```
  (Or **Download template**, which lists your real classes, and **Upload .csv**.)
- [x] **Check rows** → "3 ready" → **Add 3 students**. If asked **Is that the whole class?** → yes → **Save sizes**.

✅ Roster → Students: Grade 1, 3 students. Classes: **3 of 3**.

**B2.5 Invite the teacher**
- [x] **Roster** → **Your team** → **+ Invite teachers** → Grade 1 · A · `Ritu Menon` · `teacher@mangotree.test` → **Send invites**.

✅ **Invites sent · 1** with a **temporary password**. **Copy** it; you need it in B4.1.
- [x] Look at the **School code** strip (Copy / Regenerate). Don't regenerate now.

⚠ K16: the Overview still shows nothing, not even "Grade 1 A has no teacher". Warnings only start once Baseline is live.

---

## B3 · Tilli plans and deploys Baseline

**B3.1 Review the calendar**
- [x] Sign out → sign in as Tilli (B1.1). Control Room → **School calendars to review** → **Mango Tree School**.
- [x] **Assessments** tab → Academic year card → **Plan from calendar**. Read the suggestions: Baseline's window has already passed (the year began in June), so only later windows are offered. Tick Midline / Endline → **Apply to planner** (draft dates only, nothing deployed).

✅ The calendar leaves the review queue.

**B3.2 Set up Baseline**
- [x] **Assessments** → **Baseline** tab. It's pre-filled with 7 assessments:
  - At school, in order: Pre-training → Post-training → Teacher observational report (Teacher)
  - At school, any time: IDELA (Student)
  - At home, any time: Home SEL Survey (Parent), My School Check-in and Hearts & Flowers (Student, done with a parent)
- [x] Look at **Not used in Baseline (4)** (Memory Game, EMT 1/2/4). Try **Turn on** for one → it asks **Where should it run?** → then its chip **⋯** → **Don't use**, to put it back.
- [x] Dates: **Start = a week ago**, **End = two weeks from today**. (Starting in the past lets you close the window early in B10.)
- [x] The banner says the own-class rule doesn't apply. This school has only one class.
- [x] Leave **Parents take part in Tilli Measures** on.

**B3.3 Deploy**
- [x] **Deploy phase** → "Before this can run smoothly:" lists **1 class with no teacher** (Ritu hasn't joined yet) and **no live Baseline version** for three assessments (⚠ K13) → **Deploy anyway**.

✅ Toast "Baseline is live." The tab shows **Live · 0%**, the chips show their versions, and the date line reads "Live since … · 0 of 3 children done".

**B3.4 Links to share**
- [x] **Links to share**: Parents, Teachers & school admins, Student assessments → **Copy Link** on each. **Preview** on Student assessments opens `assess.html`.

⚠ K2: the copied Parents and Teachers links are production-style addresses and don't open locally. In this walkthrough parents use the group link (B8.1) or the school search.

---

## B4 · The teacher joins

**B4.1 First sign-in**
- [x] Sign out → `index.html` → **Get started** → **School** → `teacher@mangotree.test` → **Enter** → paste the temporary password → **Enter via password**.
- [x] **Set your password** ("Joining as Teacher for Mango Tree School") → `tilli123` twice → **Set password & continue**.

**B4.2 Onboarding** (nothing saves until **Enter my garden**, so finish it in one go)
- [x] Intro "You can not pour from an empty cup" → **Begin reflection →**.
- [x] **Demographic questions**, 4 steps (all required):
  - About yourself.
  - Your school: Country and City are already filled in.
  - As a teacher: **Grade 1 · A** is already ticked from the invite. Also look at **My class isn't here — ask my school admin**, but don't use it here (B5.3 does).
  - Your classroom → **Finish & Continue**.
- [x] "Hi Ritu…" → **Begin reflection →** → the **Pre-training self-report** (10 questions) → **Finish reflection →**.
- [x] "Amazing! Your profile is created" → **Add my students →** → **Type them in**.

✅ Anika, Kabir and Meher are already filled in ("We've pre-filled the students on file…"), with "3 of 3 · 0 places left".
- [x] **+ Add student** → `Zoya Khan` · `MT-004` → **Enter my garden →**. The new row says the class is full (3 of 3) → **Send for approval** → **Enter my garden →** again.

✅ **My Garden**: "Your Grade 1 A garden", "Baseline is open", "0 of 3 children done", **Continue → next: …**.

⚠ K7: the garden's dates ("Window closes Apr 2") are fixed demo dates, not your Baseline's. ⚠ K24: ignore the teacher's **Preview stage** panel until the Anytime section.

---

## B5 · The school admin follows up

**B5.1 Overview now Baseline is live**
- [x] Sign in as Asha (B2.1) → **Overview**.

✅ "3 Students · 1 Teacher · 1 Section", **Baseline check-in: 0 of 3 children assessed**, days left, the dandelion (Assessed / In progress / Not started). Read **How completion is counted**.

**B5.2 The child waiting for approval**
- [x] **Roster** → **Students** → **Waiting for your approval**: Zoya Khan → **Turn down**. (Approve would raise the class size to 4, and you'd need a fourth parent.)
- [x] **Roster** → **Classes**: the Teacher for Grade 1 A is **Ritu Menon**. If it still says *No teacher*, pick her.
- [x] Optional: in Tilli, Control Room → **New students to approve** shows the same queue.

**B5.3 A teacher whose class is missing (optional, 5 min)**
- [ ] New tab → `index.html` → **School** → `teacher2@mangotree.test` → enter the **school code** (B1.4) → **Verify** → **Is this your school?** → **Yes** → `tilli123` → **Create via password**.
- [ ] Onboarding step 3 → **My class isn't here — ask my school admin** → Grade 2 · A → **Ask my school admin** → finish → **Enter my garden →** (no class).
- [ ] As Asha: Overview shows **Waiting for a class**; **Roster** has a count; **Your team** → the request → **Mark done**. Tilli's Control Room shows **Teachers waiting for a class**.

---

## B6 · The teacher observes the class

**B6.1 The to-do list**
- [ ] Sign in as Ritu (`teacher@mangotree.test` / `tilli123`) → **Assess** → **To-do**.

✅ The journey: Pre-training survey **Complete**, **Baseline observations: Active** "0 of 3 students observed", the rest locked. A **Student assessments** card for IDELA (used in B7).

**B6.2 Observe the first child**
- [ ] **Continue baseline observations →** → **Start with Anika →**.
- [ ] Answer page 1 (Rarely / Sometimes / Usually / Almost always, with Seed → Blooming under each; try **Haven't seen this yet** once). **Next page →**.
- [ ] Halfway through, go back to the To-do list → Anika shows "Started · n of 21" → **Continue**.

✅ "↺ Picked up where you left off".
- [ ] Finish all 4 pages → **Finish → next child**.

✅ "✓ Anika's observation is saved — next up: Kabir", plus a confetti toast for the first child.

**B6.3 The rest of the class**
- [ ] Kabir → **Finish → next child**. Meher → **Finish 🌱**.

✅ "Every child is observed for Baseline 🌸" → **See who's complete →**. The Baseline step says "All 3 students observed".

⚠ K9: My Garden still shows **Continue → next: Anika**. Don't press it; it reopens her blank and overwrites the saved observation.

**B6.4 Done so far**
- [ ] **Assess** → **Done so far**: Teacher ✓ for each child. **⬇ Download CSV** and **🕘 History**.

⚠ K10: the Parent and Student columns here never update.

---

## B7 · The children do their assessment at school

**B7.1 Open the student assessment**
- [ ] Still as Ritu: Assess → **Student assessments** card → **Start student assessments →** (opens `assess.html`, already signed in).

✅ **Pick a class to assess** → Grade 1 A "3 children · 0% done · Your class". A one-class school is exempt from the own-class rule.

**B7.2 Each child**
- [ ] Grade 1 A → Anika → **Start IDELA** → the placeholder screen → **Mark complete**. Do the same for Kabir and Meher.

✅ Each child shows ✓.

⚠ K3: there's no game yet; **Mark complete** stands in for the child playing.
- [ ] Top bar **Finish** → "Session finished". This signs the device out, as it would on a shared school tablet.

---

## B8 · Parents at home

**B8.1 Parent 1 signs up**
- [ ] Sign out → open the Vidya Trust parent link, `index.html?group=vidya&as=parent` (it's what Tilli's group page → **Group links** → **Open ↗** opens) → pick Mango Tree School. (Or: `index.html` → **Get started** → **Parent / Home** → type `Mango` → pick the school → **Continue →**.)
- [ ] `parent1@mangotree.test` → **Enter →** → **Create your Tilli account** → `tilli123` → **Create via password →**.

**B8.2 Consent**
- [ ] **Before you start**: **Continue** stays grey until the **Required** box is ticked. Try **I agree to all of the above** → untick one optional box → **Continue →**.
- [ ] Try the 🌐 language picker. Most text stays English, because nothing is approved in other languages.

**B8.3 Add the child**
- [ ] ⚠ K1: two children you don't know (Aarav, Meera) appear. Ignore them → **+ add child**.
- [ ] Admission number `MT-999` → "We can't find that admission number…". Then `MT-001` → **Continue →**.

✅ **We found your child**: Anika Rao, Grade 1, Section A → **Yes, that's my child →**.

**B8.4 Anika's Baseline at home**

✅ "Watch Anika grow". Baseline shows **0 of 3 done · open until …** with Home SEL Survey, My School Check-in and Hearts & Flowers. Midline and Endline say "Not deployed yet".
- [ ] **Mark done** on all three.

✅ **Completed**. ⚠ K3: there are no survey questions or games yet. The tap stands in for doing them.

**B8.5 Profile and help**
- [ ] Header "Anika's parent ▾" → **Profile** → **Consent & privacy** → **What you agreed to** → change an optional box → **Save**. Language picker. **Need help?** bubble (Email the Tilli team / Report a problem). → **Log out**.

**B8.6 Parents 2 and 3**
- [ ] `parent2@mangotree.test` → Kabir (`MT-002`) → **Mark done** on all three.
- [ ] `parent3@mangotree.test` → Meher (`MT-003`) → **Mark done** on **Home SEL Survey only**. Leave the other two, so you can see what "didn't finish" looks like.

---

## B9 · Everyone watches progress

**B9.1 School admin**
- [ ] As Asha → **Overview**.

✅ **2 of 3 children assessed, 1 in progress**, the dandelion, and an **Almost there** point for Meher.
- [ ] **Ask Tilli** (bubble or full screen) → "Who hasn't finished Baseline?".
- [ ] **History** → today's changes (students added, invite, completions).

⚠ K16: a one-class school never gets the "falling behind" warnings. Those compare classes with each other.

**B9.2 Tilli**
- [ ] As Tilli → Mango Tree School → **Overview** → Assessment progress "2 of 3 children".
- [ ] **Assessments** → **Teacher assessment log**: Ritu, Pre-training ✓, Baseline observations 3/3 → **↓ CSV**.
- [ ] **Students** → **Parent consent**: three parents, their choices → **Download CSV**.
- [ ] **Ask Tilli** → `Who hasn't completed at Mango Tree School?`.
- [ ] **Change History** → filter to Mango Tree.
- [ ] Vidya Trust group page → **Group admin view →** → Mango Tree is in the schools table.

⚠ K20, K21: the Student assessment log, Results CSV and Issues are empty for a new school. After a reload Ask Tilli's headline says 0%.

---

## B10 · The window closes

In real life you'd wait for the end date. Here you end it early.

**B10.1 End Baseline**
- [ ] As Tilli → Mango Tree → **Assessments** → **Baseline** → change **End** to **yesterday**.

✅ Toast "Baseline dates saved — ended." The tab shows **Ended**, and the planner now opens on Midline. ⚠ K12: there's no "End now" button.

**B10.2 What Meher's parent sees**
- [ ] As `parent3@mangotree.test` → Baseline "· Ended". The two rows not done say "Window ended · not completed" with **Missed**.

---

## B11 · Results

**B11.1 School admin** (reload first; results are worked out when the page loads)
- [ ] As Asha → **Overview**.

✅ Up to three results points: "Baseline results: X% of skill ratings are Blooming", children Blooming, who was assessed, the strongest skill, where to help next.
- [ ] **Outcomes** → School / All grades, Grade 1 · A, **Skill by skill**, **Where views differ**. "Small group — one child shifts this by ~33 points".
- [ ] **Reports**:
  - **Generate leadership summary** → Print / Save as PDF.
  - **A paragraph for your newsletter** → Copy to clipboard / Regenerate.
  - Roster CSV and Aggregate outcomes CSV.
- [ ] **Ask Tilli** → "Is the programme working?".

⚠ K4: every score is generated by the prototype, not taken from the answers (Mayur connects the real ones). ⚠ K23: some report wording is canned ("All 1 of our sections").

**B11.2 Tilli**
- [ ] Mango Tree → **Overview** → **Outcomes** show averages (only after the school dashboard has been opened once, ⚠ K25).

**B11.3 Teacher**
- [ ] As Ritu → **Students** → Anika.
- [ ] **Insights**.
- [ ] **Students** → **☑ Parent reports** → **Select all** → **👁 Preview** → **⬇ Download PDFs** (needs internet).

⚠ K5: the teacher still sees "No assessment data yet" and a "Sample view" Insights. Baseline results don't reach the teacher app yet.

**B11.4 Parent**
- [ ] As `parent1@mangotree.test` → Anika's home: "3 of 3 done".

⚠ K6: there's no family snapshot for a new school yet.

---

## Anytime — not tied to a moment in Baseline

- [ ] **Preview stage** panels (teacher bottom-left; school admin on the Little Sprouts demo): switch Baseline / In between / Midline / Endline to see the screens with sample results. This is also the only way into the teacher's Post-training survey (⚠ K11).
- [ ] **Sessions** (Tilli → school → Assessments → Sessions → **+ New session**): a pre / post survey for a workshop. Outside Baseline; never counts in its numbers.
- [ ] **Translations** (Tilli → Assessments → Translations): approve a line, then see it in a parent's language.
- [ ] **Knowledge Base** and **? Help** (Tilli).
- [ ] **Users & Invitations** (Tilli): ⚠ K14 the invite Role starts on Super Admin.
- [ ] **Analytics** (Tilli): ⚠ K21 Mango Tree is left out while its completion reads 0.
- [ ] **Regenerate the school code** (Asha → Roster → Your team): the old code stops working, and **Check who joined with the old code** appears.
- [ ] **On a phone**: narrow the window on each app.

**Feature-by-feature deep dives** (templates, merging students, a third-year school, starting a new year…): [Super-Admin-Walkthrough.md](Super-Admin-Walkthrough.md).
