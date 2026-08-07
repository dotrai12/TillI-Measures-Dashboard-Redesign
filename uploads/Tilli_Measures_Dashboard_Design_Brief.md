# Tilli Measures — Teacher Dashboard Redesign Brief
### "The Garden" · Design brief for Claude Design
**Prepared by:** Ishani Rai, Head of Product, Tilli Kids Inc.
**Version:** 1.1 · Fresh watercolor-vector identity (not Tilli brand colors) · Fully responsive · For: Teacher dashboard (leader dashboards follow the same system, see §9)

---

## 1 · What this is

Redesign the Tilli Measures teacher dashboard around a **garden metaphor**: each student is a plant, the class is the teacher's garden. The current dashboard is functional but reads like an audit — red "Not Started" walls, "10 skills flagged" alarms on children's profiles, a meaningless "44% class average." The redesign must make the dashboard something a teacher opens *because it feels good and tells her exactly what to do next*, while keeping every number defensible enough to show a principal or parent.

**The product:** Tilli Measures tracks 12 foundational skills (6 SEL + 6 cognitive) for students aged 3–10, assessed at three points (Pre / Mid / Post) from three perspectives (Teacher observation, Parent report, Student direct assessment). It lives alongside Ask Tilli, a chat-based AI teaching assistant.

**The user:** A teacher in India or Sri Lanka managing up to 6 sections (~27 students each). Often on a smartphone. Time-poor, wary of "one more tool that doesn't work," not a data analyst.

---

## 2 · Three laws (apply to every screen)

1. **Glance → Tap → Act.** Layer 1 is the garden (who needs me, in 3 seconds). Layer 2 is data (tap anything → real scores, bands, trends). Layer 3 is action (every insight ends in one button, usually an Ask Tilli prompt). Never show an insight without an action; never show the metaphor without one tap to the numbers.
2. **No visual state may make a child look bad.** No wilting, dying, grey, or shrunken plants. No red badges on a child's profile. The lowest state is "ready for tending" (a watering-can cue) — attention-needed, never failure. Growth framing everywhere: celebrate what grew before flagging what needs care.
3. **One visual grammar, three zoom levels.** Teacher sees plants; school leader will see garden beds (classes); group leader will see a landscape of gardens (schools). Design every component so it aggregates upward without changing its language.

---

## 3 · Visual system

**Do NOT use Tilli's brand palette.** This dashboard gets its own fresh identity: vector illustration with a light watercolor feel. The mood is a calm, sunlit picture-book garden — soft, breathable, quietly joyful. Think pastel wellness apps (Finch, Habitz) meets hand-painted children's book, rendered clean enough for a professional tool.

### Palette (fresh, watercolor-pastel)
Base:
- **Warm cream** `#FBF6EC` — primary page background (never pure white)
- **Soft paper white** `#FFFFFF` at 60–80% opacity — cards floating on cream
- **Warm charcoal** `#3A3A3A` — text (never pure black)

Watercolor wash accents (soft-edged, low saturation):
- **Blush pink** `#F6D5D9` / deeper `#EFA9B8` — blossoms, celebration
- **Butter yellow** `#F9E6B3` / deeper `#F2CE7B` — sunshine, highlights, progress
- **Sage & leaf green** `#DCE8D4` / `#9DBE8D` / deep `#6E9863` — foliage, healthy states
- **Sky blue** `#D9E9F2` / deeper `#A7CDE2` — calm info surfaces
- **Soft lavender** `#E4DDF2` / deeper `#B9A9DC` — secondary accents, perspective overlays
- **Warm clay** `#E8C4A8` / **soil brown** `#B08968` — pots, soil, grounding elements

Rules: backgrounds and section fills are watercolor washes (soft irregular edges, subtle paper grain); foreground elements (plants, icons, UI chrome) are clean flat vector. Max 2–3 wash colours per screen. No harsh saturated colour anywhere; the deepest tones are for small accents and text on washes. The no-red-deficit rule holds absolutely — the palette contains **no alarm red at all**.

### Illustration style
- **Vector-first with watercolor texture:** flat vector shapes with soft watercolor-wash fills and occasional loose edges — not photorealism, not glossy 3D.
- **Hand-drawn doodle accents:** tiny sparkles, stars, squiggles, and dotted trails scattered sparingly around headers and empty states — life without noise.
- **Plants may have gentle faces** — serene, happy, or sleepy only. NEVER sad, worried, or distressed. The "ready for tending" plant looks sleepy (soft closed eyes), not unhappy. Faces scale with size: full face at large sizes, dot-simple or none when plants render small.
- **Organic blob framing:** sections sit on soft blob-shaped washes rather than hard boxes where possible; cards keep 16–24px rounded corners; dividers are wavy/organic, never straight rules.
- **Empty states are scenes, not blanks:** "waiting for sunshine" gets a small illustrated moment (seedling under a doodle sun) with one line of warm copy.

### Typography & shape
- Headlines: a rounded friendly sans (Quicksand, Baloo 2, or similar), medium-bold. Body: clean readable sans (Nunito Sans or similar), 16px+.
- Numbers and data labels stay crisp and unstylised — the illustration is the warmth, the data is the trust. Never render scores in decorative type.

### The plant (core component)
Each student = one plant in the garden. The plant encodes exactly **two things** (never all 12 skills):
- **Overall flourish** = size/fullness, driven by the student's overall band (Beginner 0–33% / Learner 34–66% / Expert 67–100%, averaged across assessed skills)
- **Growth since last assessment** = a small sparkle/new-leaf animation if improved since Pre (or last window)

Plant states (only four):
| State | Visual | Trigger |
|---|---|---|
| **Blossoming** | Full plant + pink blossom | Expert band overall, or big jump since last window |
| **Growing** | Healthy green plant | Learner band, on track |
| **Ready for tending** | Smaller sprout + gentle watering-can icon | Beginner band overall OR ≥3 skills in Beginner OR a high perspective gap |
| **Waiting for sunshine** | Seedling in soil, soft outline | No/insufficient assessment data yet |

Hover/tap a plant → the student's name, band chips (e.g. "0 Beginner · 10 Learner · 2 Expert"), and a "View [Name]" link. Never show a score on the plant itself.

### Tone of copy
Warm, plain, teacher-to-teacher. "3 plants could use some tending" not "3 students requiring attention." "Waiting for sunshine" not "Not Started." Never the word "flagged" anywhere a teacher sees a child.

### Design references (what to borrow from each)
Six reference images accompany this brief. Take from them:
1. **Pastel health tracker (cream blob-wash cards):** how data lives on soft washes — the ratings/correlations cards and the pastel horizontal bar chart are the template for our Insights charts and skill cards. Data stays legible; warmth comes from the surface, not the numbers.
2. **Finch-style garden scene:** the emotional target for My Garden — a living scene you check on, flowers with gentle faces, goal cards floating over the landscape. Our garden bed + plants-to-tend strip should feel like this, slightly more grown-up.
3. **Habitz onboarding (blob characters on lilac):** character language — simple geometric blobs with dot eyes and tiny smiles, flat vector, huge charm from minimal features. Our plant faces use exactly this level of simplicity. Also the habit-card colour blocking for our tending cards.
4. **KittyNail landing (watercolor-ish layered scenery):** the layered soft-scenery depth — how washes stack into hills/trees to make a scene with depth without heaviness. Use for the garden background and the group-leader landscape view.
5. **Belle portfolio (doodle accents on cream):** the hand-drawn sparkles, hearts, squiggle accents around headlines — our doodle-accent language, used sparingly.
6. **Child clinic (crayon illustration):** the loose, hand-drawn warmth and confident whitespace — the overall page feeling: one hero moment, lots of air, playful but composed.

---

## 4 · Navigation (5 destinations)

Left sidebar (desktop) / bottom bar (mobile):
1. **My Garden** (home)
2. **Students**
3. **Assess**
4. **Insights**
5. **Ask Tilli** (also embedded contextually everywhere — see §8)

Profile/settings: small avatar item pinned at the bottom, out of the main flow.

**Section picker:** persistent at the top of every screen — a horizontal chip row ("Pre-K A · Pre-K B · KG D · KG E · UKG A · Grade 1 A"). One tap to switch. Everything below re-renders for the chosen section. This is critical: teachers juggle up to 6 sections.

---

## 5 · Screen-by-screen

### 5.1 My Garden (home)

**Layout, top to bottom:**
1. **Greeting + season line.** "Good morning, Ishani 🌱 Your Grade 1-A garden, week 14." Small weather-style summary: "2 plants blossomed since baseline."
2. **The garden bed.** The hero. All ~27 plants arranged in a soft organic bed (not a rigid grid — gentle rows with variation). Plants in "ready for tending" cluster subtly toward the front-left so the eye lands on them first. Tap any plant → mini-card → student page. A small legend explains the four states in six words each.
3. **"Plants to tend" strip.** Max 3 cards. Each: student's plant + first name, one plainly-worded reason ("Emotion regulation could use practice"), and **one primary button**: `Ask Tilli for an activity` (pre-filled — see §8). Secondary link: "See [Name]'s skills."
4. **Garden highlights.** Positive-first mirror of the current Areas of Strength: "Your class's strongest skills right now: Empathy, Working Memory." One tap → Insights.
5. **Growing areas** (below the fold). The current Areas for Growth, but: skill-level only on this screen — student names appear only after tapping in. Each row ends in `Ask Tilli for a class activity`.

**What's removed from today's Home:** the four stat cards (Total Students / Skills Tracked / Average Score / Needs Support). A single class-average % is meaningless across 12 skills — replace with the band distribution implicit in the garden itself. The Student Roster list moves entirely to Students.

**Time scrub (delight feature):** a small slider/toggle "Baseline → Now" that replays the garden growing between assessment windows. Only appears once ≥2 windows exist.

### 5.2 Students

**Roster view:** searchable list, each row = mini-plant + name + band chips + state word ("Blossoming"). Replaces "Excelling / On Track" badges. Sort: by state (tending first), name, or growth.

**Student page — 4 tabs, in this order:**
1. **Overview.** The child's plant, large. One line to celebrate ("Empathy grew from Learner to Expert since baseline 🌸") and one to tend ("Emotion regulation is ready for practice"), each with an Ask Tilli button. Trend line of overall band across Pre/Mid/Post.
2. **Skills.** All 12 skills as cards, grouped **Social-Emotional (6)** / **Cognitive (6)** — keep the existing Detailed Skill Breakdown card pattern (it works). Each card: band chip, Pre/Mid/Post mini-progression, and the three perspective scores. Skill card tap → `Ask Tilli about building [skill] for [Name]`.
3. **Perspectives.** The radar overlay (Teacher/Parent/Student Direct) + the gap table. Keep both — genuinely valuable — but reframe: "High gap" pill becomes neutral teal "Worth a conversation," and the header explains gaps kindly ("Different views can mean the skill shows up differently at home and school"). Never a red alarm count in the student header.
4. **History.** Assessment timeline: which assessments, when, by whom, completion.

**Student header:** name, section, parent email, band chips. **No "X skills flagged" badge.** If flagged-count exists for internal logic, it surfaces as the plant state, not a number.

### 5.3 Assess

Merges today's *Student Observation Report* + *Assessment Logs* into one job: enter data, see what's left.

**Three tabs:**
1. **To do.** The anti-shame-wall. Per assessment window: a progress ring ("Grade 1-A baseline · 12 of 27 done") + one primary button `Continue → next student`. Below, remaining students as seedling chips ("Waiting for sunshine"), tap any to jump. Amber "in progress," green "done" — **no red anywhere**.
2. **Enter observation.** The current star-rating flow, kept — it's good. Refinements: student picker at top; the child's plant beside their name while grading; rename star levels **Emerging / Beginner / Growing / Expert** (kill "Never" — no child is a "never"); keep behavioural anchor descriptions verbatim; progress dots (question 4 of 12); friendly finish moment ("Aditya's plant just got a little taller 🌱").
3. **Completed.** The log table for teachers who want it — filterable, CSV export kept — but colour language flipped: completed = green, in progress = amber, not started = neutral grey seedling icon.

### 5.4 Insights

Today's Analytics, restructured around three questions:
1. **"How is my class growing?"** Pre → Mid → Post skill progression, kept as horizontal bars but in the watercolor palette (sage/butter/sky pastels — see the reference tracker's bar chart) rather than traffic lights; band distribution stacked bars mapped as soil → sprout → blossom (clay → sage → blush). Blush pink is reserved for *celebration*, never deficit.
2. **"Where do perspectives differ?"** Multi-perspective radar + Perspective Gaps, section-level. Same kind reframing as the student page.
3. **"How do my sections compare?"** Existing Compare Sections in Grade mode — this is also the exact component the school-leader dashboard will reuse, so design it to aggregate (see §9).
Every chart footer: `Ask Tilli what to do with this` (pre-filled with the chart context). Keep Export PDF.

### 5.5 Ask Tilli (destination)

Keep the full-chat destination for open questions, but its history should show context chips of dashboard-launched conversations ("From: Grade 1-A · Emotion Regulation"). The main design work for Ask Tilli is the embedding (§8).

---

## 6 · The 12 skills (canonical list)

**Social-Emotional (6):** Emotion Awareness · Emotion Regulation · Empathy · Relationship Skills · Metacognition · Critical Thinking
**Cognitive (6):** Working Memory · Planning & Organization · Cognitive Flexibility · Inhibition (Distraction) · Inhibition (Response) · Attention

Bands: **Beginner 0–33% · Learner 34–66% · Expert 67–100%.** Observation scale: 4 stars = **Emerging / Beginner / Growing / Expert** (renamed from "Never"). One language everywhere — the current build mixes "Growing" (stars) with "Learner" (bands); reconcile to the band names in all charts and to the star names only inside the rating flow, with a tooltip mapping them.

---

## 7 · Data & content fixes (do these regardless of visuals)

1. "18 skills tracked" on Home vs the 12-skill system — reconcile to 12.
2. Duplicate names in needs-support lists ("Aditya Joshi, Aditya Joshi") — dedupe.
3. Kill the single class-average percentage; band distribution replaces it.
4. Kill red as a deficit colour anywhere a child is identifiable. Red/coral is for celebration accents and destructive-action confirmation only.
5. "Needs support / flagged / Not Started" vocabulary → "ready for tending / worth a conversation / waiting for sunshine."

---

## 8 · Ask Tilli embedding (the action loop)

Every insight ends in a pre-filled Ask Tilli button. Exact prompt templates:

| Where | Button label | Pre-filled prompt |
|---|---|---|
| Plants-to-tend card | Ask Tilli for an activity | "Suggest a 10-minute classroom activity to build **[skill]** for a **[grade]** student currently at **[band]** level. My class has ~[n] students and limited materials." |
| Growing-areas row (class) | Ask Tilli for a class activity | "Give me a whole-class **[grade]** activity to strengthen **[skill]**. [x] of my students are at Beginner level in it." |
| Student skill card | Ask Tilli about [skill] | "How can I support **[Name]**, a **[grade]** student at **[band]** level in **[skill]**? Teacher score [t]%, parent [p]%, student-direct [s]%." |
| Perspective gap row | Talk this through with Tilli | "Teacher and parent scores for **[Name]**'s **[skill]** differ by [gap] points. What could explain this and what should I try at school? How do I raise it kindly with the parent?" |
| Insights chart footer | Ask Tilli what to do with this | "My **[section]** class data shows **[auto-summary]**. What are 2–3 practical next steps?" |

Buttons open Ask Tilli in a side panel (desktop) / full sheet (mobile) with the prompt editable before sending. This is the single highest-value feature in the redesign — Measures spots the need, Ask Tilli hands the teacher the next step.

---

## 9 · Scaling notes (design now, build later)

Same five destinations, same grammar, zoomed out:
- **School leader:** "My Garden" shows **garden beds** (one per class; bed health = band distribution). Tap a bed → that teacher's garden (read-only). "Beds to tend" = classes needing support, with actions ("Message the teacher," "Ask Tilli for a training focus"). Insights = compare classes/grades; Assess = school-wide completion rings per window.
- **School group leader:** an **aerial landscape of gardens** (one per school) — rendering gets slightly more abstract/professional at this zoom (flatter, map-like), but states, colours, and vocabulary stay identical. Insights = compare schools, spot outliers, export board-ready PDF.
- Component rule: any card built for the teacher view must accept an aggregation level prop (student / class / school) rather than being rebuilt.

---

## 10 · Responsive & accessibility (build responsive from the first component)

The UI must be **fully responsive across phone, tablet, laptop, and large screens** — not a desktop design squeezed down. Teachers are often on smartphones; leaders present on laptops and large displays. Every component gets defined behaviour at all four breakpoints.

### Breakpoints & layout behaviour
| | Phone < 640px | Tablet 640–1024px | Laptop 1024–1440px | Large / display > 1440px |
|---|---|---|---|---|
| **Navigation** | Bottom tab bar (5 items, icons + labels) | Collapsed icon rail, left | Full left sidebar | Full sidebar; content max-width ~1400px, centred |
| **Section picker** | Horizontally scrollable chip row, sticky top | Chip row, sticky | Chip row in header | Chip row in header |
| **Garden bed** | 4–5 plants per row, vertical scroll; pinch-free (no zoom needed) | 6–8 per row | Full bed, one viewport, organic arrangement | Larger plants, more air; comfortable from 2m viewing distance |
| **Plants-to-tend strip** | Swipeable full-width cards | 2-up cards | 3-up cards | 3-up, larger |
| **Student page tabs** | Tabs become a segmented control, sticky under header | Tabs | Tabs | Tabs |
| **Skill cards (12)** | 1 per row | 2 per row | 3 per row | 3 per row, wider |
| **Radar + gap table** | Stacked: radar, then table as cards (one skill per card, no wide table) | Stacked | Side by side | Side by side |
| **Assess: star entry** | One question per screen-height, thumb-reach stars ≥48px, sticky progress dots | Same, roomier | Two-column: question list + active question | Same as laptop |
| **Insights charts** | One chart per viewport, horizontal-scroll bars where needed | 1–2 per row | 2 per row | 2 per row |
| **Ask Tilli panel** | Full-screen bottom sheet | Side sheet, 60% | Side panel, ~420px | Side panel |

### Responsive rules
- Design mobile-first; enhance upward. No feature exists only on desktop.
- Touch targets ≥ 44px everywhere; star rating comfortable one-thumb on a 380px screen.
- Tables never scroll in two directions on phones — reflow to cards instead.
- Test orientations: tablet landscape (common in schools) must use the laptop-style layout.
- The garden must feel *composed* at every width — plants reflow into pleasing organic clusters, never a broken grid.

### Accessibility
- Plant states distinguishable without colour (silhouette + icon differ, not hue alone) for colour-blind users.
- Text on watercolor washes must always meet WCAG AA contrast — use the deepest wash tones or charcoal for text, never mid-pastel on light pastel.
- All copy in simple English; leave string room for Sinhala/Tamil localisation later.
- Respect reduced-motion settings: growth animations become gentle fades.
- Performance: the garden renders ≤ 30 plants as lightweight SVG (or Lottie for the celebration moments only); no heavy canvas/3D; must be smooth on low-end Android.

---

## 11 · Build order for Claude Design

1. The plant component (4 states + hover card) — everything depends on it
2. My Garden home (bed + tending strip + highlights)
3. Student page (Overview + Skills tabs)
4. Assess → To do + Enter observation
5. Insights (reuse chart patterns, recolour)
6. Ask Tilli side-panel embedding
7. Perspectives tab + History
8. School-leader garden-bed variant (proof the grammar scales)

**Definition of done for v1:** a teacher can open the app, know in 3 seconds who needs her, tap once to see why (real numbers), and tap once more to get an Ask Tilli activity — all without reading a single red warning.
