# Multi-year schools: spec

*23 Oct 2026 · status: **core built** (data layer + platform admin + Heritage Oaks demo). Share with Mayur.*

**Decided:** year dates are **free per school** (set when the year starts, editable after) · only the **Tilli team** starts a new year · cross-year comparisons **show with a warning** when template versions differ.

**Built:** academic years per school; past years archived read-only (deployments, completions, results, classes, who sat where); **Start new year** (close the year, end live windows, move children by base grade, empty planner); year bar + read-only past year + **Year over year** on the school's Assessments tab; **Year** column + filter on Deployments; the leadership dashboard shows the real current year; **Heritage Oaks** seeded in its 3rd year; Mission 15 in the walkthrough.

**Built 26 Oct 2026:** year switcher on the leadership dashboard (header picker; any closed year read-only across Overview, Outcomes, Reports, Roster); Start new year is Tilli-only, hidden until the year's windows have ended ("Close the year early…" otherwise) and confirmed by typing; school admins ask Tilli via Roster → Year-end, then see a notice + "See grade migration".

**Next:** Trends (per child / base grade / cohort), teacher and parent past years, Ask Tilli year questions, year-scoped teacher observations.

## The scenario

**Heritage Oaks School** joined Tilli in **2024–25**. It ran Baseline → Midline → Endline that year and again in **2025–26**. It's now **2026–27**, its **3rd year**.

The Tilli team and the school need to:
1. Start the new year without losing anything from the last two.
2. Deploy this year's assessments.
3. See every past deployment: what ran, when, which template version, how complete.
4. See results for any year, and how children and grades changed **across** years.

## What exists today vs what's new

| Need | Today | New |
|---|---|---|
| Deploy Baseline / Midline / Endline | ✅ One per phase and audience | Scoped to an **academic year** |
| Keep past deployments | ❌ Re-deploying a phase overwrites it | Past years kept, read-only |
| Results per year | ❌ One set per student per phase | Each result tagged with its year |
| Academic year | ⚠️ Fixed at `2026–27` (school dashboard) | Real per-school years, with a switcher |
| Child's earlier classes | ⚠️ Sample data only | Built from real past enrolments |
| Move students up | ⚠️ Grade migration exists, not tied to a year | Part of **Start new year** |
| Compare the same grade year on year | ❌ | Uses the **base grade** (Grade 2 in 2025–26 vs Grade 2 in 2026–27) |

## Core idea: an academic year wraps everything

- Each school has **academic years**. Exactly **one is current**. Past years are **read-only**.
- Deployments, completions and results belong to a year. A year has its own Baseline / Midline / Endline.
- A child has an **enrolment per year** (grade, section, teacher). That makes "earlier classes" real.
- Grades are compared across years by their **base grade**, never by the school's name for them. A school that renames "Grade 2" to "Tulips" next year still compares correctly.

## Flows

### 1. Start a new year
*Who:* Tilli team or School Admin. *Where:* school page → **Assessments** → **Start 2026–27** (only offered once last year's Endline window has ended, or with an override).

1. **Check**: shows last year's phases, their completion, and anything still open. Open windows must close first.
2. **Move students**: the existing Grade migration (promote / retain / graduate / left), pre-filled by base grade (Grade 3 → Grade 4).
3. **Structure**: copies last year's grades and sections. Edit or rename before confirming.
4. **Teachers**: keeps teacher ↔ section assignments where the section still exists, and flags the rest.
5. **Confirm**: last year becomes read-only, and the new year starts with no deployments.

Logged in the Audit Trail and Change History ("Started 2026–27").

### 2. Deploy this year's assessments
Same as today: **+ Deployment** or the school's planner. It always targets the **current year**.
- Each deployment records the **template version** it used, so results stay comparable when a template changes between years.
- Phase names stay Baseline / Midline / Endline. The year makes them unique.

### 3. See previous deployments
School page → **Assessments** tab → **year switcher** (`2026–27 · current` / `2025–26` / `2024–25`).
- Past years show the same planner, read-only: phase, audience, window, template + version, completion %, status (Ended).
- **Deployments** (global list) gains a **Year** column and filter.

### 4. See results
- **School page and leadership dashboard**: the year switcher defaults to the current year. Past years show their full results.
- **Across years** (new "Trends" view):
  - **Per child**: Baseline 2024–25 → Endline 2026–27 on one line, with a class/teacher marker for each year.
  - **Per base grade**: this year's Grade 2 vs last year's Grade 2 (a different cohort).
  - **Per cohort**: the 2024–25 Grade 1 class followed to Grade 3 today.
- **Ask Tilli** understands years: "How did Grade 3 do last year?" and "Compare this year's Baseline with last year's".
- **CSV exports** gain a `Year` column.

### 5. What each role sees
| Role | Current year | Past years |
|---|---|---|
| Tilli team | Full | Full, read-only |
| School Group Admin | Their group's schools | Read-only |
| School Admin | Full | Read-only results and deployments |
| Teacher | Their current class | Each child's past results + handover notes (no other classes) |
| Parent | Their child | Their child's earlier years |

## Demo school to seed (for the walkthrough)
**Heritage Oaks School**: Bengaluru, CBSE, joined Apr 2024.
- 2024–25 and 2025–26: all three phases ended, with results.
- 2026–27: Baseline live, Midline scheduled.
- About 40 students who stayed all three years, plus some who joined and some who left, so the cross-year views are easy to see.
- One grade renamed in 2025–26 ("Grade 2" → "Tulips") to show base grades holding the comparison together.

## Draft walkthrough mission (add once built)
**Mission: A school in its third year**
- [ ] Open **Heritage Oaks** → **Assessments**. The year switcher shows `2026–27 · current`.
- [ ] Switch to **2025–26** → see last year's three phases (Ended), templates and completion. Nothing is editable.
- [ ] Back to **2026–27** → **+ Deployment** → Midline for teachers.
- [ ] **Results** → switch years → open **Trends** → one child across three years.
- [ ] Compare **Grade 2 this year vs last year** (note "Tulips (Grade 2)" in 2025–26).
- [ ] Ask Tilli: `How did Grade 3 do last year?`
- [ ] Optional (on a copy): **Start 2027–28** and walk through the five steps.

## Edge cases
- **Template changed between years**: results show the version; a cross-year chart warns when versions differ.
- **Child left and came back**: the enrolment has a gap, and the trend line shows the gap.
- **Section removed next year**: past-year data still points to it (kept in that year's structure).
- **Grade renamed between years**: the base grade carries the comparison.
- **Year started by mistake**: allow undo while the new year has no deployments.

## Open questions
1. **Year boundaries**: India runs Apr–Mar and Sri Lanka Jan–Dec. Is it per country, or per school?
2. **Who can start a new year**: the Tilli team only, or School Admins too?
3. **Contract**: should a new year require a renewal flag? (The old "Renewed" stage was removed.)
4. **How far back**: keep all years forever, or archive after N years?
5. **Comparability**: block cross-year comparison when template versions differ, or just warn?
