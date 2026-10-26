# Demo logins — fully-populated schools

Five portfolio schools have real data in the shared store, so the Tilli platform admin, school admin dashboard, teacher app and parent app all show the same thing. It is created automatically the first time any page loads in a browser (`seedHeroSchools` in `assets/tilli-api.js`). Dates are relative to that day.

**Password: anything works** (type any non-empty password). Sign in from `index.html` → *Get started*.
- **Teachers & school admins:** choose the School card, then enter the email.
- **Parents:** choose the Parent card, pick the school, then enter the email.

| School | What's deployed |
|---|---|
| **Banyan Tree School** | All three phases — Baseline ✓ ended, Midline ✓ ended, **Endline live now** (~50% done) |
| **Lotus Valley School** | Baseline ✓ ended, **Midline live now** (~50% done), Endline not deployed |
| **Kandy Hill School** | **Baseline live now** (~40% done) only |
| **Colombo Kids Academy** | Baseline, Midline and Endline all **Scheduled** (start in ~12 days, ~3 months, ~6 months) |
| **Heritage Oaks School** | **3rd year with Tilli.** 2024–25 and 2025–26 closed (all phases ended, read-only); 2026–27: **Baseline live now** (~60% done), Midline scheduled |

**Completion** everywhere now means *children who finished every assessment in the phase* (teacher, parent and direct). The "~N% done" figures below are how much of each lane was seeded, so the headline completion reads lower — e.g. Heritage Oaks' Baseline shows 8 of 56 children (14%).

Each school has 4 classes × 14 children (56 students), one teacher per class, and one school admin. In every school the **last teacher in the list is behind** (a realistic follow-up case). Parent 1's child has done everything; Parent 2's child hasn't started the phase that's live now.

---

## Banyan Tree School — all phases (Vidya Trust group)

| Role | Email | Notes |
|---|---|---|
| School admin | `suresh.r@banyantree.edu` | Suresh Raman |
| Teacher | `kavitha.sharma@banyantree.edu` | Grade 1 A · Pre + Post-training done |
| Teacher | `geetha.perera@banyantree.edu` | Grade 1 B · Pre + Post-training done |
| Teacher | `revathi.verma@banyantree.edu` | Grade 2 A · Pre + Post-training done |
| Teacher | `kavitha.nair@banyantree.edu` | Grade 3 A · **behind** — Pre-training only, few observations |
| Parent 1 | `parent1@banyantree.edu` | Navya Jayasuriya (BT-1001, Grade 1 A) — all done |
| Parent 2 | `parent2@banyantree.edu` | Tara Bandara (BT-1002, Grade 1 A) — Endline not started |
| Group admin | `group@vidyatrust.org` | Vidya Trust group view |

## Lotus Valley School — Baseline + Midline (Metro Public Schools group)

| Role | Email | Notes |
|---|---|---|
| School admin | `pooja.m@lotusvalley.edu` | Pooja Malhotra |
| Teacher | `deepa.desai@lotusvalley.edu` | Kindergarten A · Pre + Post-training done |
| Teacher | `vikram.jayasuriya@lotusvalley.edu` | Grade 1 A · Pre + Post-training done |
| Teacher | `lakshmi.wickramasinghe@lotusvalley.edu` | Grade 2 A · Pre + Post-training done |
| Teacher | `shalini.perera@lotusvalley.edu` | Grade 2 B · **behind** — Pre-training only |
| Parent 1 | `parent1@lotusvalley.edu` | Dinithi Fernando (LV-1001, Kindergarten A) — all done |
| Parent 2 | `parent2@lotusvalley.edu` | Ishaan Sharma (LV-1002, Kindergarten A) — Midline not started |

## Kandy Hill School — Baseline only (Lanka Learning Network group)

| Role | Email | Notes |
|---|---|---|
| School admin | `nuwan.b@kandyhill.lk` | Nuwan Bandara |
| Teacher | `chamari.menon@kandyhill.lk` | Grade 1 A · Pre + Post-training done |
| Teacher | `lakshmi.desai@kandyhill.lk` | Grade 2 A · Pre-training done |
| Teacher | `anita.fernando@kandyhill.lk` | Grade 3 A · Pre-training done |
| Teacher | `farah.perera@kandyhill.lk` | Grade 4 A · **behind** |
| Parent 1 | `parent1@kandyhill.lk` | Ira Verma (KH-1001, Grade 1 A) — all done |
| Parent 2 | `parent2@kandyhill.lk` | Aanya Pillai (KH-1002, Grade 1 A) — Baseline not started |
| Group admin | `group@lankalearning.lk` | Lanka Learning Network group view (also covers Colombo Kids) |

## Colombo Kids Academy — everything scheduled (Lanka Learning Network group)

| Role | Email | Notes |
|---|---|---|
| School admin | `dilani.p@colombokids.lk` | Dilani Perera |
| Teacher | `rohan.shah@colombokids.lk` | Kindergarten A · Pre-training done (onboarded) |
| Teacher | `priya.nair@colombokids.lk` | Grade 1 A |
| Teacher | `tharushi.fernando@colombokids.lk` | Grade 1 B |
| Teacher | `rohan.perera@colombokids.lk` | Grade 2 A |
| Parent 1 | `parent1@colombokids.lk` | Navya Sharma (CK-1001, Kindergarten A) — sees "Opens on …" |
| Parent 2 | `parent2@colombokids.lk` | Sehan Iyer (CK-1002, Kindergarten A) — sees "Opens on …" |

---

## Heritage Oaks School — a school in its 3rd year (no group)

Years run **Jun → May**. Last year (2025–26) Grade 2 was called **"Tulips"**, and Midline used template **v2** (v1 the year before), so the *Year over year* card shows a version warning. Today's Grade 3 and 4 children have past results; today's Grade 1 joined this year.

| Role | Email | Notes |
|---|---|---|
| School admin | `admin@heritageoaks.edu` | Nandini Rao |
| Teacher | `deepa.verma@heritageoaks.edu` | Grade 1 A |
| Teacher | `priya.menon@heritageoaks.edu` | Grade 2 A |
| Teacher | `nalini.iyer@heritageoaks.edu` | Grade 3 A |
| Teacher | `vikram.bandara@heritageoaks.edu` | Grade 4 A · **behind** |
| Parent 1 | `parent1@heritageoaks.edu` | Kaveen Jayasuriya (HO-1001, Grade 1 A) — Baseline done |
| Parent 2 | `parent2@heritageoaks.edu` | Zara Sharma (HO-1002, Grade 1 A) — Baseline not started |

---

### Notes
- **Tilli super admin:** `tilli.html` → All Schools → any of these schools → *Assessments* (planner, Teacher assessment log with Pre/Post-training self-report columns) and *Students*.
- Names come from a fixed seed, so they're the same in every browser.
- **To re-create the data** (e.g. after testing changes it): clear the site's local storage, or bump `HERO_SEED_VER` in `assets/tilli-api.js`. A teacher's own saved app state is never overwritten.
- The teacher app opens on its Baseline view by default; earlier and later windows are reachable from the Assess tab.

---

## Student direct-assessment link (`assess.html`)

Open `assess.html` (or **Preview** on the Student assessments link in a school's Assessments tab → Links to share). Enter a school code (`BNYN-7712`, `LOTS-3390`, `KNDY-8890`, `CLMB-6604`), then a **teacher** email from the tables above. No password.

To see the **own-class rule**: in the platform admin, open the school → Deployments, switch **Parents take part** off, and make sure **My School Check-in** is in use in the live phase. On `assess.html` the teacher's own class is then greyed out. Kandy Hill (Baseline live) is the quickest school to try it on.
