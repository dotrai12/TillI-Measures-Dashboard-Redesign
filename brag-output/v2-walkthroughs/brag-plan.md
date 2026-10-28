# /brag plan — Tilli Measures walkthroughs (v2)

Two product walkthroughs, modelled on the ClipChop tour's *structure* (one app window, a short title + line per section, a cursor doing the real thing, zooms on the detail) in Tilli's own light, garden style. Real screens only — every frame of the app is a screenshot of the actual prototype, driven by script with the demo logins. Section captions, no voiceover.

**Audience:** principals / school admins (video 1) and teachers (video 2).
**Format:** 1920×1080, 30 fps; admin 65 s, teacher 61 s. Music: 96 BPM, C major (I–V–vi–IV), effects (clicks, chimes) in key and under the music.
**Demo data:** Banyan Tree School (Endline live, Baseline + Midline done). School admin: Suresh Raman. Teacher: Kavitha Sharma, Grade 1 A. All names are the prototype's fictional demo data.

## 1 · School admin walkthrough — `admin-walkthrough.mp4`

| Time | Section | What happens on the real screens |
|---|---|---|
| 0–3.75 | Intro | Tilli Measures · "For principals & school admins" · School admin walkthrough |
| 3.75 | **Sign in** — one link, school email | Get started → School → types the email → password → in |
| 11.9 | **Overview** — who's done, who's behind | Overview with the living graph; zoom on "Grade 3 A hasn't started Endline yet" + "8 of 56 children assessed" |
| 18.1 | **Any class, up close** | Taps Grade 3 → its children; zoom on the graph |
| 24.4 | **Results** | Switches to Results (grade, then whole school) |
| 30.0 | **Outcomes** — always as groups | Outcomes; zoom on "Where to help next / What's going well"; scrolls to Progress over time |
| 36.9 | **Roster & classes** | Roster → Classes: sizes and teachers; + Add students |
| 43.8 | **Reports** — newsletter paragraph | Reports; zoom on the paragraph; Copy to clipboard |
| 50.6 | **Ask Tilli** | Asks "Is the programme working?" → answer from the school's data; zoom |
| 59.4–65 | Outro | Tilli Measures · See how every child is growing · tillikids.com |

## 2 · Teacher walkthrough — `teacher-walkthrough.mp4` (v2.1, 27 Oct)

No title or end card. Bigger app window: captured at 1440×730 and shown at 1.2× (the admin video is 1440×900 at 0.86×). The caption band is shorter so the window fills the frame. 61 s.

| Time | Section | What happens on the real screens |
|---|---|---|
| 0 | **Sign in** | Get started → School → email → password → the class garden |
| 6.3 | **My Garden** | Full-bloom garden (zoom); scrolls to "Endline is open" → Continue |
| 12.5 | **Observe a child** | Navya: rates two questions (Usually, Almost always) |
| 18.1 | **Every child, up close** | Students → Advik Desai: "Something that grew", "Start by focusing on", Overall growth (zooms) |
| 24.4 | **Skills** | Skills tab: Base / Mid / End per skill (zoom) |
| 29.4 | **Three perspectives** | Perspectives tab: Teacher / Parent / Student score for every skill, biggest gaps first; scrolls the list |
| 36.3 | **History** | History tab: Endline / Midline / Baseline / Enrolled, record changes (zoom) |
| 41.3 | **Insights** | Class Skill Overview |
| 46.3 | **Ask Tilli** | "Give me a 10-minute activity for this week" → Tilli's idea; zoom |
| 52.5 | **Parent reports** | Students → Parent reports → Select all → Preview the family report; zoom, then out |

Dropped from v2: intro/outro cards, "Your assessment journey", the class-level Perspectives view.

## 3 · Developmental profile — `profile-walkthrough.mp4` (website, 27 Oct)

For the website section "We bring together every single data point about a child into a developmental profile…". The data side of the teacher dashboard, not the assessing. 16:9, white background (sits on the site's white card), ~104 s. Opens and closes on the site's pill line — "Tilli measures the **12 foundational skills** that impact learning and well-being" (3 s in, 4 s out); the last frame matches the first, so it loops cleanly. Section times below are from the first screen (add 3.1 s). Pages really scroll: the capture joins each page's scrolling area into one tall image and the video scrolls it under the real sticky sidebar and header.

**Demo data:** Little Sprouts School, Kavya Rao, Kindergarten A, **Anaya Menon** — the one demo child with past years (Nursery 2024–25, Pre-K 2025–26, each with a handover note). Endline preview stage (dev panel), so the year is full.

| Time | Section | What happens on the real screens |
|---|---|---|
| 0 | **One profile for every child** | Students (30 children) — scrolls the list, back up, opens Anaya |
| 6.9 | **What grew, and what's next** | Overview: Something that grew / Start by focusing on (zoom), Overall growth |
| 13.8 | **All 12 skills** | Skills tab — scrolls Social-Emotional → Cognitive |
| 22.5 | **Three perspectives** | Perspectives tab — scrolls the teacher / parent / student list; opens "See it as a chart" (radar, zoom) |
| 34.4 | **It follows the child, year after year** | History tab — Across the years chart (zoom), Skill by skill table, Class by class handover notes (zoom), this year, record changes |
| 51.3 | **Ask Tilli about her** | Overview → "Ask Tilli for an activity" → sends → Tilli's answer (zoom) |
| 59.4 | **A report for every family** | Students → Parent reports → Select all → Preview → Next → Anaya's report, scrolled top to bottom → Download PDFs → "Preparing 1 of 30…" |
| 77.5 | **And the whole class** | Insights · My class — Class Skill Overview, Growth over time, Every skill up close (scrolling, zooms) |
| 90.0 | **The class through three lenses** | Insights · Perspectives — every skill, three viewpoints |

Capture-only setup (the app isn't changed): Kavya Rao's one-time setup is marked done (as the app does for its hero-school teachers), and the PDF library is swapped for a stand-in so the real download progress shows but no files are written.

Poster (frame 0 and the `.jpg`): admin — the intro title card at 2.5 s; teacher — Advik’s Three perspectives at 31.6 s; profile — its first frame (it may loop on the site).

## How it's built (see `source/README.md`)
`driver.swift` opens the real pages offscreen with a fresh demo data store, clicks/types through `capture/<video>.json` and screenshots each state (plus where every button is). `comp/index.html` places those screenshots in a window under the section caption, crossfades between states, moves a cursor to the recorded buttons with click ripples, and zooms. `render.swift` renders it frame by frame; `audio.swift` writes the soundtrack.
