# /brag plan — Tilli Measures (assessment features)

**What it is:** Tilli Measures is a school dashboard that assesses children's social-emotional and thinking skills three times a year and shows the result as a garden that grows.
**Who it's for:** teachers, principals and school admins.
**What sets it apart:** every skill is seen three ways (teacher, parent, child); results read as Seed → Sprouting → Growing → Blooming instead of scores; the next step is always obvious; Ask Tilli turns results into an idea for tomorrow.
**Visual hook:** a row of sprouts that blooms into flowers — the dashboard's own garden art (`flower-band.js`).
**Share caption:** see `share-copy.txt`.

## Angle
Assessment that feels like watching your class bloom. Calm, warm and clear — one point per scene, each held long enough to read.

## Tone
`default` (playful, clean) at a gentle pace, by request: "not too fast-paced, digestible". Soft staggered transitions (old content out, then new in), no hard cuts.

## Format
Landscape 1920×1080, 30 fps, **75 s** (longer than the skill's 15–25 s on purpose: the brief asks for each point to be digestible). Every line on screen is held well past 0.3 s/word.

## Visual identity (from the project)
- Fonts: Quicksand 700 headings, Montserrat body (no weights above 700).
- Colours: green `#56C02B` / text green `#348C11`, cyan `#26BDE2`, pink `#E866B0`, yellow `#FCC30B`, orange `#F99B1C`, ink `#141414`, muted `#5B6170`, canvas `#F8F9FB`, washes `#F1FFEC` / `#D9F5FF`.
- Real pieces reused: `tilli.css` tokens, the Tilli wordmark, the brand icons (graduation cap, family, smiley, sparkle), the plant art from `flower-band.js`, and the product's own copy.
- Names on screen are the prototype's fictional demo children (Anaya, Saanvi …) and teacher (Kavya). No real people or schools.

## Music
96 BPM (beat 0.625 s, bar 2.5 s), C major, I–V–vi–IV. Soft plucked melody, warm pad, round bass, light kick and shaker. Effects are pentatonic plucks in the same key, under the music, on the beat. Every cut lands on a bar line.

## Storyboard (each scene = 3 bars = 7.5 s unless noted; cuts dip through the background)

| # | Time | Scene | On screen |
|---|---|---|---|
| 1 | 0.0–5.0 (2 bars) | **Hook** — sprouts pop up on the beat across a soft garden | "See how every child is growing." · "Tilli Measures — social-emotional and thinking skills, made simple." |
| 2 | 5.0–12.5 | **Three check-ins** — timeline Baseline → Midline → Endline; the garden grows from sprouts to buds to flowers as the marker moves | "Three check-ins a year." · "Baseline, Midline, Endline — and you watch the garden grow in between." |
| 3 | 12.5–20.0 | **Three viewpoints** — Teacher, Parent, Child cards arrive one by one | "One child. Three points of view." · Teacher observes in class · Parent answers a short survey at home · Child plays quick activities like Hearts & Flowers |
| 4 | 20.0–27.5 | **Teacher observation** — the real question card; a cursor picks "Growing", the progress bar fills | "Rate what you've seen." · "Seed, Sprouting, Growing, Blooming — no scores to decode." |
| 5 | 27.5–35.0 | **Assess journey** — the vine; the active step glows, "0 of 6" counts up to "6 of 6", the next step unlocks | "Always know what's next." · "Your class journey glows on the one step that's due." |
| 6 | 35.0–42.5 | **Insights** — 12 skill tiles appear, each with Teacher / Parent / Student %, then a growth line Baseline → Midline | "12 skills. One clear picture." · "See where your class is strong, growing, and ready for focus." |
| 7 | 42.5–52.5 (4 bars) | **Who could use you + Ask Tilli** — a child card, then a typed question and Tilli's reply | "Spot who needs a little extra." · "Then ask Tilli for an idea you can use tomorrow." |
| 8 | 52.5–60.0 | **Leaders** — school completion counts up; a ring fills for each class | "The whole school at a glance." · "Who's done, who's next, and how every class is growing." |
| 9 | 60.0–67.5 | **Families** — the parent report slides in: greeting, three lenses, the three levels | "A report families actually read." · "Three lenses, plain words, and their child's own garden." |
| 10 | 67.5–75.0 | **Outro** — full-bloom garden band, wordmark | "Assessment that grows with every child." · Tilli Measures · tillikids.com |

Poster frame (frame 0 and `brag.jpg`): scene 10, settled (t = 72.1 s).

## Build
Composition: one HTML page (`render(t)` is a pure function of time) using the project's `tilli.css`, fonts, wordmark, icons and `flower-band.js` plant art. Frames rendered through WebKit by a small Swift program and written to H.264; the soundtrack is synthesised in Swift (same key and beat grid as the cuts, effects snapped to the 32nd-note grid and mixed under the music) and muxed as AAC. Intermediate files live in the session scratchpad, not the repo.
