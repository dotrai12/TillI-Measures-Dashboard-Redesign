# IDELA — splitting out the school-climate questions

*Note for Mayur · captured 22 Oct 2026 · status: built in the prototype (22 Oct 2026), open questions below*

> Include this in the Mayur handover document.

## The problem

IDELA is a **direct assessment**, but an adult runs it — the adult instructs the child ("Can you draw me a triangle?").

IDELA also has a short section about the school itself: *"Do you feel safe in school?"*, *"Does your teacher help you?"*. It's feedback on the school and the teacher, and (as far as we remember) it isn't graded.

If the **class teacher** runs IDELA, the teacher is the one asking the child whether the teacher helps them. That isn't safe for the child, and it won't give honest answers.

## The idea

### 1. Split the climate questions into their own assessment
- Take the school-safety / classroom-climate questions out of IDELA and make them a separate direct assessment.
- Name: **My School Check-in** *(decided 22 Oct 2026)*.

### 2. Where it runs depends on whether parents take part
Ask each school: **"Do you want parents to take part in Tilli Measures?"**
- **Yes** → My School Check-in goes **home**. The parent is told how to ask the child the questions.
- **No** → it runs **at school**, as part of the normal student-assessment flow.

### 3. The own-class rule — only when the check-in runs at school
- **If My School Check-in is deployed at school** in a phase → for that phase, **no** student direct assessment at school (EMT, IDELA, My School Check-in, all of them) can be run by the class teacher. Their own class is greyed out, and another teacher assesses it.
- **If it runs at home, or isn't deployed** → the class teacher runs the direct assessments for their own class as normal.
- This shows up in the **Assess** panel of the teacher dashboard too.
- *Decided 22 Oct 2026.*

### 4. The student direct-assessment link
The school gets two links:
1. The Tilli dashboard (for staff).
2. The **student direct-assessment master link**, opened on each child's device (tablet, laptop, …). If children don't have their own device, it's opened on the teacher's.

**Flow when the link opens:**

| Device state | What happens |
|---|---|
| A Tilli dashboard is already signed in on this device | Skip straight to the class picker |
| Not signed in | Enter the **school code** (proves it's this school), then the teacher's **email** — no password *(decided 22 Oct 2026)* |

Then a **full-screen assessment page** opens (not the dashboard):
1. Pick class + section. **The teacher's own class/section is greyed out and can't be picked.**
2. Run the assessment for the children of that class.

**Why a separate link:** if the teacher signs in to the full dashboard on a student's tablet, the student can reach the teacher's dashboard. The link opens only the assessment page.

Only teachers can sign in to run these.

## Decided

- **Name:** My School Check-in.
- **Own-class rule:** applies to every direct assessment at school, but only in a phase where My School Check-in runs at school (see §3).
- **One-class schools are exempt:** if a school has only one grade with one section, the rule doesn't apply — its teacher runs everything.
- **Email-only sign-in is fine:** the student link only runs assessments; it shows no personal data or results.
- **Changing "Parents take part" while a phase is live:** locked by default — the admin chooses *From the next phase* (the live phase keeps the check-in where it is) or *Change it now*. With *Change it now*, a child who has already started the check-in finishes it where they started, then their completion counts as normal; everyone else gets it in the new place straight away.
- **Teachers at two schools:** when the device's signed-in teacher belongs to more than one school, the student link still asks for the school code (it says which school they're at) but skips the email.
- **Turning the rule on late:** before the rule turns on, the admin is warned how many results were recorded by the child's own class teacher. Those results are kept and flagged (⚑ on the student page, a count in the planner banner).
- **Sign-in on the student link:** school code + teacher email, no password. *Trade-off:* anyone who has the school code and knows a teacher's email can open the assessment page as that teacher. It only reaches the assessment page, not the dashboard.

## Open questions

- **One teacher, several classes:** a school with several classes but only one teacher still has nobody allowed to assess that teacher's classes. Who does it then?
- **Teachers with several sections:** are all their sections blocked? *(Prototype: yes, all of them.)*
- **School admins:** can they run assessments too, or only teachers? *(Prototype: only teachers.)*
- **Leaving the assessment page:** when it was opened from a device that already had the dashboard signed in, does getting back to the dashboard need the password again, so a child can't wander into it? *(Prototype: the page has no link to any dashboard; "Finish" ends the assessment sign-in only.)*
- **My School Check-in at home:** does the parent ask the questions and the child answer, while the parent records the answers? Does it reuse the existing parent link or the direct-assessment link?
- **School code on the link:** the master link URL already contains the school's code, yet the page still asks for it (as specified). Keep both?

## What's built in the prototype (22 Oct 2026)

| Where | What |
|---|---|
| Platform admin → School → Deployments | **Parents take part in Tilli Measures** switch above the phase tabs. My School Check-in is in every phase's direct-assessment list (on by default) and its place follows the switch. It can't be dragged or moved to the other place. A banner says when the own-class rule is on for a phase. |
| Platform admin → Templates | **My School Check-in** template (Direct Assessment). |
| Platform admin → School → Assessments → Links to share | **Preview** on the Student assessments link opens the student page. |
| `assess.html` (student direct-assessment link) | School code → teacher email (no password) → pick a class (own class greyed out when the rule is on) → children → run each assessment. Skips the code + email when a teacher is already signed in on the device. Never links to a dashboard. |
| Teacher dashboard → Assess → To-do | **Student assessments** card for the live phase: what runs at school, how much of the teacher's class is done, and **Assess another class** (rule on) or **Start student assessments** (rule off). |
| Data layer (`tilli-api.js`) | The rule is enforced when a result is saved: a teacher can't record a direct assessment at school for their own class while the check-in runs at school. |
