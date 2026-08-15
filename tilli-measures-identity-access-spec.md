# Tilli Measures — Identity, Access & Onboarding Spec

**Version:** 1.0
**Purpose:** Build specification for the Tilli Measures account, identity, and access model — covering every user type. This is the source of truth for the secure onboarding, roster, parent-claim, and lifecycle flows. Hand to Claude Code as the build reference.

**Problems this design solves**
1. **Duplicate student records** — students were being created via parents, students, *and* teachers, producing collisions.
2. **Unauthorised access** — anyone could sign up as a teacher or school admin for any school and reach that school's data.

**Implementation context**
- Tilli Measures builds are plain HTML / JS / CSS, no frameworks, standalone files. Keep this spec framework-agnostic; it describes behaviour and rules, not a specific stack.
- Where this spec says "system", that is the application/backend enforcing the rule — not something a client can be trusted to enforce alone. Every guard below must be enforced server-side.

---

## 1. Core principles

These are the non-negotiable invariants. Every flow and permission below derives from them.

1. **Single source of student creation.** Only a **teacher** creates a student record. Parents and students never create records — they *claim* an existing one. This is the primary defence against duplicates.
2. **One canonical student identity.** Every student has exactly one `student_id`. All add-paths and the parent claim resolve against this same key. (See §3.)
3. **Verify before reveal.** No personal information about a child is displayed to anyone until they have proven they are entitled to see it. Authentication never works by *showing* identity to confirm it.
4. **Least privilege by scope.** A user sees only what their role and scope entitle them to. A legitimately-invited teacher still cannot see the whole school.
5. **Closed trust chain.** No open self-signup into a school. Access is granted only by invitation, rooted in Tilli's offline verification of the school.
6. **The school owns the record.** Student records belong to the school, not to any individual teacher, parent, or admin. Departures and mistakes **revoke or reassign** access; they never orphan or delete a child's data.

---

## 2. User types (actors)

| User type | Who they are | Enters the system via | Data scope |
|---|---|---|---|
| **Tilli (system / staff)** | Tilli's own team; root of trust | N/A (system-level) | All schools — restricted to named staff only |
| **School Admin / Coordinator** | One person per school who runs onboarding | Invited by Tilli | Whole school (manage) |
| **Principal** | School head | Granted view by Admin | Whole school (**view-only**) |
| **Teacher** | Class/section teacher | Invited by Admin, assigned sections | **Own grade/section(s) only** |
| **Parent** | Parent/guardian of one or more students | Self-serve claim (verified) | **Own linked children only** |
| **Student** | The child (K–5) | **No independent login in v1** | N/A |

**Note on "Student" as an actor:** in the original flow, "parents / students just enter their admission number" — for K–5 this is a **parent-driven** action. Students do not get their own logins in v1. Drop any implication of a child self-registering.

---

## 3. Canonical data model

### 3.1 The student identifier

- `student_id` is the **single canonical key** for a student, unique **within a school**.
- **Primary source:** the school **admission number**.
- **Fallback:** for schools that don't issue clean/unique admission numbers, the system generates a **Tilli student code**.
- The teacher enters this `student_id` when building the roster (§4). The parent enters the **same** `student_id` when claiming (§5). They must be the same field, or every claim fails.

### 3.2 Entities (minimum)

| Entity | Key fields |
|---|---|
| `School` | `school_id`, name, board, `verified` (bool, set by Tilli), status |
| `Section` | `section_id`, `school_id`, grade, section label |
| `AdminMembership` | `user_id`, `school_id`, role (`admin` \| `principal_view`), status |
| `TeacherMembership` | `user_id`, `school_id`, `section_id[]` (assigned scope), status |
| `Student` | `student_id`, `school_id`, `section_id`, name, DOB, status (`active` \| `left`) |
| `ParentLink` | `parent_user_id`, `student_id`, status (`active` \| `revoked`), verified_at |
| `ClaimCode` (optional) | `student_id`, code, used (bool), expires_at |

Uniqueness constraint: **(`school_id`, `student_id`) is unique.** This constraint is what makes silent merge (§4) safe and enforceable.

---

## 4. Flow A — Setup & roster

*Goal: get the right people in, scoped correctly, and build a roster with no duplicates.*

| # | Step | Actor | Guard (enforced server-side) | Prevents |
|---|---|---|---|---|
| A1 | Set up the school (board, grades, sections) | Tilli | School marked `verified` only after Tilli confirms against the signed MoU / known school contact | Fake schools; unverified root of trust |
| A2 | Invite the School Admin | Tilli | Invite bound to a **verified school contact**; invite-only, no self-signup | Anyone claiming to be a school's admin |
| A3 | Admin invites teachers, assigns each to grade/section(s) | Admin | Teachers enter by **invitation only**; each teacher record carries a `section_id[]` scope | Random teacher self-signup; over-broad access |
| A4 | Teachers build the roster — photo / CSV / manual, keyed on `student_id` | Teacher (own sections) | **Dedupe on add:** if `(school_id, student_id)` already exists, **merge into the existing record — never create a second.** Teacher can only add within their assigned sections. | Duplicate student records |

**A4 detail — dedupe behaviour**
- **Exact `student_id` match → silent merge** into the existing record (confirmed behaviour). New non-conflicting fields fill blanks; existing fields are not overwritten without review.
- **Near-match (recommended, see §9 open item 2):** if a new entry is *close* to an existing record (e.g. transposed/typo'd ID, same name + DOB, different ID) → **do not silent-merge. Flag to Admin for review.** Silent-merging a near-match risks fusing two different children or hiding a data error.
- All three add-methods (photo OCR, CSV import, manual) run through the **same** dedupe check. Photo and CSV are the highest-risk for typos/dupes — surface a confirm/review step on bulk import.

---

## 5. Flow B — Secure parent claim

*Goal: let a parent link to their child without leaking any child's data to strangers. **Verify before reveal.***

| # | Step | Actor | Guard (enforced server-side) | Prevents |
|---|---|---|---|---|
| B1 | Parent enters the child's `student_id` (admission number or Tilli code) | Parent | **Reveal nothing yet.** No name, grade, section, or "exists / doesn't exist" signal returned. | Enumeration of the roster |
| B2 | Parent enters a **second factor**: child's **DOB** *or* a **one-time claim code** the school issued | Parent | Reveal is gated on second-factor match. **Rate-limit** attempts; **lock** after N failures. Failure returns a **generic "details don't match"** — never confirms whether the ID exists. | Guessing admission numbers; impersonation |
| B3 | On match: system shows child (name, grade, section, school) for the parent to confirm → create `ParentLink` | Parent | Claim **links** the parent to the existing record — it **never creates** a student. Standing parent account holds **multiple children** (siblings) — repeat B1–B3. | Duplicate students via the parent path |

**Second-factor strength (configurable per school — see §9 open item 1)**
- **DOB:** convenient, needs nothing extra from the school, but a determined stranger who knows the family could know it.
- **One-time claim code:** meaningfully stronger. Teacher/admin distributes it (on the report, in the diary). **Default to this** for any school that will tolerate the distribution effort.
- Make this a per-school setting, not a global constant.

**Anti-enumeration rule (applies across B1–B2):** "not found" and "wrong second factor" must be **indistinguishable** to the caller. Never let an error message, timing difference, or status code confirm that a given `student_id` is real.

---

## 6. Flow C — Lifecycle & revoke

*Goal: handle people and records changing over time. The record always stays with the school.*

| Trigger | Actor | Outcome |
|---|---|---|
| **Student leaves** | Admin | Student set `status = left`. `ParentLink`s revoked. Record **retained** by school (archived per policy), not deleted. |
| **Teacher leaves** | Admin | Teacher's `section_id[]` **reassigned** to another teacher. Roster + student data **stay with the school**. Departed teacher's access revoked. |
| **Wrong / disputed parent link** | Admin | `ParentLink` set `revoked`. Student record **untouched**. |

**Guard:** revoke and reassign are **Admin-controlled**. No individual (teacher or parent) can delete a student record. Records are owned by the school.

---

## 7. Permission matrix

`M` = manage (create/edit), `V` = view, `—` = no access, `own` = own scope only.

| Capability | Tilli | Admin | Principal | Teacher | Parent |
|---|---|---|---|---|---|
| Set up school; define grades/sections | M | — | — | — | — |
| Mark school `verified` | M | — | — | — | — |
| Invite Admin | M | — | — | — | — |
| Invite teachers; assign sections | — | M | — | — | — |
| Grant Principal view | — | M | — | — | — |
| Create / edit students (roster) | — | — | — | M (own sections) | — |
| View students | V (all) | V (school) | V (school) | V (own sections) | V (own children) |
| Run assessments | — | — | — | M (own sections) | — |
| View assessment data | V (all) | V (school) | V (school) | V (own sections) | V (own children) |
| Claim / link to a child | — | — | — | — | M (verified) |
| Revoke links; offboard student; reassign teacher | — | M | — | — | — |
| Cross-school / system access | M (named staff) | — | — | — | — |

---

## 8. Security guards — summary

Every guard, where it lives, and what it stops. Use this as the security acceptance checklist.

| Guard | Enforced at | Stops |
|---|---|---|
| School `verified` against MoU | A1 | Fake / unverified schools |
| Invite-only, bound to verified contact | A2, A3 | Self-signup as admin/teacher for any school |
| Teacher scoped to assigned sections | A3, A4, all views | A legitimate teacher seeing the whole school |
| Dedupe on add (unique `school_id`+`student_id`) | A4 | Duplicate student records |
| Near-match flagged to Admin | A4 | Fusing two different children / hidden data errors |
| Reveal nothing on ID entry | B1 | Roster enumeration |
| Verify before reveal (second factor) | B2–B3 | Impersonation; seeing a child you're not entitled to |
| Rate-limit + lock + generic error | B1–B2 | Number-guessing attacks |
| Claim links, never creates | B3 | Duplicates via the parent path |
| Admin-only revoke/reassign; school owns record | C | Orphaned/deleted child data; access lingering after departure |

---

## 9. Open decisions (flag before / during build)

These were surfaced during design. Defaults are set so the build isn't blocked, but confirm with Ishani / Masoomi.

1. **Second-factor strength — per school.** DOB (convenient, weaker) vs one-time claim code (stronger, small distribution effort). **Default:** offer both; recommend the code. Build it as a per-school setting.
2. **Near-match duplicate handling.** Confirmed behaviour is silent-merge on **exact** ID match. **Recommended (not yet confirmed):** near-matches are **flagged to Admin**, not silently merged. Build the flag path behind a config flag if not confirming now.

---

## 10. Edge cases to handle

- **Claim before roster exists:** parent tries to claim a child the teacher hasn't added yet → graceful "we can't verify these details yet — check with your school" (must still not confirm whether the ID exists).
- **Sibling claims:** one parent account links to multiple students; each child is claimed through a full B1–B3 verification.
- **Two teachers, one child:** class teacher and subject teacher both add the same student → dedupe merges to one record (A4).
- **CSV re-upload:** same file uploaded twice → dedupe prevents doubling; bulk import shows a review/confirm summary.
- **Parent link dispute (e.g. custody):** Admin can revoke a `ParentLink` without touching the student record (C).
- **Teacher reassignment mid-year:** sections move to a new teacher; historical data stays attached to the student, owned by the school.

---

## 11. Acceptance criteria (testable)

The build is correct when all of the following hold:

1. A user with no invitation **cannot** create or join any school as admin or teacher.
2. A school that Tilli has not marked `verified` **cannot** have an admin invited into it.
3. A teacher **cannot** view or edit any student outside their assigned section(s).
4. Adding a student whose `student_id` already exists in the school results in **one** record, not two.
5. A near-match (different ID, same name+DOB) is **surfaced to the Admin**, not silently merged. *(if open item 2 is confirmed)*
6. Entering only a `student_id` at the parent claim returns **no** child information and **no** signal of whether the ID exists.
7. A child's name/grade/section is shown **only after** a correct second factor.
8. Wrong ID and wrong second factor return the **same** generic error; repeated attempts are rate-limited and locked after N tries.
9. A parent account can hold and view **multiple** children, each independently verified.
10. Completing a claim **never** creates a new student record — it only creates a `ParentLink`.
11. When a student is marked `left`, associated `ParentLink`s are revoked and the record is **retained**, not deleted.
12. When a teacher is removed, their sections can be **reassigned** and the student data remains with the school.
13. No individual (teacher/parent) can delete a student record; only an Admin can revoke/offboard.
14. Every guard in §8 is enforced **server-side**, not only in the client.
