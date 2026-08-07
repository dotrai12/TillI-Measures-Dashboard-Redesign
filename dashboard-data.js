// Tilli Measures — sample data for the teacher dashboard.
// Deterministic generation so the prototype is stable across renders.

export const SKILLS = [
  { key: "emotion_awareness", name: "Emotion Awareness", group: "sel" },
  { key: "emotion_regulation", name: "Emotion Regulation", group: "sel" },
  { key: "empathy", name: "Empathy", group: "sel" },
  { key: "relationship_skills", name: "Relationship Skills", group: "sel" },
  { key: "metacognition", name: "Metacognition", group: "sel" },
  { key: "critical_thinking", name: "Critical Thinking", group: "sel" },
  { key: "working_memory", name: "Working Memory", group: "cog" },
  { key: "planning", name: "Planning & Organization", group: "cog" },
  { key: "cognitive_flexibility", name: "Cognitive Flexibility", group: "cog" },
  { key: "inhibition_distraction", name: "Inhibition (Distraction)", group: "cog" },
  { key: "inhibition_response", name: "Inhibition (Response)", group: "cog" },
  { key: "attention", name: "Attention", group: "cog" },
];

export const WINDOWS = [
  { key: "baseline", label: "Baseline", sub: "Start of year", date: "Apr 2" },
  { key: "mid", label: "Mid-year", sub: "Week 8", date: "Jun 18" },
  { key: "post", label: "End of year", sub: "Week 14", date: "Sep 24" },
];

export const PERSPECTIVES = [
  { key: "teacher", label: "Teacher", icon: "👩‍🏫" },
  { key: "parent", label: "Parent", icon: "🏠" },
  { key: "student", label: "Student", icon: "🧒" },
];

export const SECTIONS = [
  { id: "prek_a", name: "Pre-K A", grade: "Pre-K", n: 24 },
  { id: "prek_b", name: "Pre-K B", grade: "Pre-K", n: 26 },
  { id: "kg_d", name: "KG D", grade: "KG", n: 27 },
  { id: "kg_e", name: "KG E", grade: "KG", n: 25 },
  { id: "ukg_a", name: "UKG A", grade: "UKG", n: 28 },
  { id: "grade1_a", name: "Grade 1 A", grade: "Grade 1", n: 27 },
];

const FIRST = [
  "Aditya", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Rohan", "Saanvi",
  "Vihaan", "Aarav", "Myra", "Reyansh", "Aadhya", "Krish", "Anika", "Dhruv",
  "Nethmi", "Sahan", "Dinuki", "Kavindu", "Senuri", "Tharindu", "Amaya", "Ravindu",
  "Hasini", "Sithara", "Nimna", "Pasindu", "Oshadi", "Yasas", "Rithik", "Meera",
  "Zara", "Kabir", "Aisha", "Vivaan", "Riya", "Advik", "Prisha", "Neel",
];
const LAST = [
  "Sharma", "Joshi", "Nair", "Reddy", "Patel", "Iyer", "Fernando", "Perera",
  "Silva", "Bandara", "Jayawardena", "Wickramasinghe", "Menon", "Rao", "Gupta",
  "Verma", "Das", "Kulasekara", "Rajapaksa", "Wijesinghe", "Kumar", "Pillai",
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function bandOf(pct) {
  if (pct < 34) return "Beginner";
  if (pct < 67) return "Learner";
  return "Expert";
}

// Curated "tend reason" phrasing per skill (warm, teacher-to-teacher).
const TEND_PHRASE = {
  emotion_awareness: "Naming feelings could use practice",
  emotion_regulation: "Emotion regulation could use practice",
  empathy: "Seeing others' feelings is still growing",
  relationship_skills: "Making friends could use gentle support",
  metacognition: "Thinking about thinking is still budding",
  critical_thinking: "Reasoning through problems is growing",
  working_memory: "Holding steps in mind could use practice",
  planning: "Planning & organizing is ready for tending",
  cognitive_flexibility: "Switching between ideas is still growing",
  inhibition_distraction: "Staying with a task amid distraction is growing",
  inhibition_response: "Pausing before reacting could use practice",
  attention: "Sustained attention is ready for tending",
};

function buildStudent(section, i) {
  const seed = hashStr(section.id + ":" + i);
  const rnd = mulberry32(seed);
  const first = FIRST[Math.floor(rnd() * FIRST.length)];
  const last = LAST[Math.floor(rnd() * LAST.length)];
  const name = first + " " + last;
  const initials = (first[0] + last[0]).toUpperCase();

  // Grade-tuned base ability so older sections score a touch higher.
  const gradeLift = { "Pre-K": -6, KG: 0, UKG: 4, "Grade 1": 8 }[section.grade] || 0;
  const base = clamp(46 + gradeLift + (rnd() - 0.5) * 46, 12, 92);

  // ~1 in 14 students has no data yet (recent joiner).
  const noData = rnd() < 0.055;

  const skills = SKILLS.map((sk) => {
    const jitter = (rnd() - 0.5) * 34;
    const post = clamp(Math.round(base + jitter), 4, 99);
    const growth = Math.round(rnd() * 22);
    const mid = clamp(post - Math.round(growth * 0.55), 2, 99);
    const pre = clamp(mid - Math.round(growth * 0.45), 2, 99);
    // Perspective scores centred on post with mild spread.
    const teacher = clamp(post + Math.round((rnd() - 0.5) * 12), 2, 100);
    const parent = clamp(post + Math.round((rnd() - 0.4) * 22), 2, 100);
    const student = clamp(post + Math.round((rnd() - 0.55) * 26), 2, 100);
    const gap = Math.max(teacher, parent, student) - Math.min(teacher, parent, student);
    return {
      key: sk.key, name: sk.name, group: sk.group,
      pct: post, band: bandOf(post), pre, mid, post,
      teacher, parent, student, gap,
    };
  });

  const overallPct = Math.round(skills.reduce((a, s) => a + s.pct, 0) / skills.length);
  const overallPre = Math.round(skills.reduce((a, s) => a + s.pre, 0) / skills.length);
  const band = bandOf(overallPct);
  const growth = overallPct - overallPre;
  const chips = {
    beginner: skills.filter((s) => s.band === "Beginner").length,
    learner: skills.filter((s) => s.band === "Learner").length,
    expert: skills.filter((s) => s.band === "Expert").length,
  };
  const maxGap = Math.max(...skills.map((s) => s.gap));

  let state;
  if (noData) state = "waiting";
  else if (band === "Expert" || growth >= 16) state = "blossoming";
  else if (band === "Beginner" || chips.beginner >= 3 || maxGap >= 30) state = "tending";
  else state = "growing";

  // Celebrate line = biggest grower; tend line = lowest skill.
  const grew = [...skills].sort((a, b) => (b.post - b.pre) - (a.post - a.pre))[0];
  const lowest = [...skills].sort((a, b) => a.pct - b.pct)[0];
  const celebrateLine = `${grew.name} grew from ${bandOf(grew.pre)} to ${bandOf(grew.post)} since baseline`;
  const tendReason = TEND_PHRASE[lowest.key];

  return {
    id: section.id + "_" + i,
    first, last, name, initials,
    parentEmail: (first + "." + last + "@parent.tilli.co").toLowerCase(),
    section: section.name, grade: section.grade,
    band, overallPct, overallPre, growth, chips, maxGap,
    state, skills, celebrateLine, tendReason,
    lowestSkill: lowest, topGrower: grew,
    grewSincePre: growth,
  };
}

export function buildAllData() {
  const sections = SECTIONS.map((sec) => {
    const students = Array.from({ length: sec.n }, (_, i) => buildStudent(sec, i));
    // Disambiguate students who share a first name (add last initial).
    const firstCounts = {};
    students.forEach((st) => { firstCounts[st.first] = (firstCounts[st.first] || 0) + 1; });
    students.forEach((st) => { st.dispFirst = firstCounts[st.first] > 1 ? st.first + " " + st.last[0] + "." : st.first; });
    // Assessment status for the "baseline" window (deterministic).
    students.forEach((st, i) => {
      if (st.state === "waiting") st.assess = "todo";
      else if (i % 9 === 3) st.assess = "in_progress";
      else if (i > sec.n - 5) st.assess = "todo";
      else st.assess = "done";
    });
    // Full assessment log: per window × per perspective completion (deterministic).
    // Earlier windows are more complete; the Post window is mid-cycle right now.
    const PROBS = {
      baseline: { teacher: 0.99, parent: 0.9, student: 0.86 },
      mid: { teacher: 0.94, parent: 0.79, student: 0.71 },
      post: { teacher: 0.44, parent: 0.17, student: 0.12 },
    };
    students.forEach((st) => {
      const rndA = mulberry32(hashStr(st.id + ":assesslog"));
      st.assessLog = WINDOWS.map((w) => {
        const persp = PERSPECTIVES.map((p) => {
          const done = st.state === "waiting" ? false : rndA() < PROBS[w.key][p.key];
          return { key: p.key, label: p.label, icon: p.icon, done };
        });
        const doneCount = persp.filter((p) => p.done).length;
        const status = doneCount === 3 ? "done" : doneCount === 0 ? "pending" : "in_progress";
        return { key: w.key, label: w.label, sub: w.sub, date: w.date, persp, doneCount, status };
      });
      st.windowsDone = st.assessLog.filter((w) => w.status === "done").length;
      st.perspDone = st.assessLog.reduce((a, w) => a + w.doneCount, 0);
    });
    return { ...sec, students };
  });
  return { sections, skills: SKILLS, windows: WINDOWS, perspectives: PERSPECTIVES };
}
