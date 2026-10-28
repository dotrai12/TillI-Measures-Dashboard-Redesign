// Developmental profile video (for the website) — Little Sprouts School, Kavya Rao, Kindergarten A,
// Anaya Menon (demo data, Endline preview). Same format as timeline-admin.js, plus
// scroll: [time, channel, px | {to: rect, at: y}, seconds, page] — 'doc' scrolls the page,
// 'modal' the parent-report dialog; rects tagged "scroll" in the capture follow the scroll.
// White background; opens and closes on the website's one-line pill (`line`), so a loop is
// seamless. Captured at 1440×730, shown at 1.2×. Times below are from the first screen;
// they're shifted by OPEN (the opening card) at the end of this file.
var REST = [1345, 470];          // cursor rest point, right of the content column
var OPEN = 3.125, CLOSE = 4.0;   // opening card / closing card, seconds
window.TIMELINE = {
  total: 97 + OPEN + CLOSE, poster: 0, intro: OPEN, outro: 97 + OPEN,
  line: 'Tilli measures the <b>12 foundational skills</b> that impact learning and well-being',
  layout: { k: 1.2, appH: 730, viewTop: 128, winTop: 6, capTop: 20, capTitle: 42, capLine: 24, cursor: 40, bg: 'white' },
  captions: [
    [-0.6, 'One profile for every child', 'Every child in your class has their own <b>developmental profile</b>.'],
    [6.875, 'What grew, and what’s next', 'A <b>celebration</b>, a <b>focus</b>, and growth across the year.'],
    [13.75, 'All 12 skills', 'Social-emotional and cognitive skills at <b>Baseline</b>, <b>Midline</b> and <b>Endline</b>.'],
    [22.5, 'Three perspectives', 'What the <b>teacher</b>, the <b>parent</b> and the <b>child</b> show us — side by side.'],
    [34.375, 'It follows the child, year after year', 'Every year, every class, every <b>handover note</b> — in one place.'],
    [51.25, 'Ask Tilli about her', 'Turn her profile into an <b>activity you can try today</b>.'],
    [59.375, 'A report for every family', 'Preview each child’s <b>parent report</b>, then download them all.'],
    [77.5, 'And the whole class', 'Where your class is <b>strong</b> and how it’s <b>growing</b>, skill by skill.'],
    [90.0, 'The class through three lenses', 'Teacher, parent and child views of <b>every skill</b>, lined up to compare.'],
  ],
  shots: [
    [0, '01-students', 0, 'measures.tilli.app/teacher/kindergarten-a'],
    [6.1, '02-overview', 0.35],
    [13.4, '03-skills', 0.3],
    [22.3, '04-persp', 0.3], [28.8, '05-persp-chart', 0.3],
    [34.3, '06-history', 0.3],
    [50.8, '07-overview-again', 0.3],
    [52.1, '08-ask', 0.3], [54.1, '09-ask-sent', 0.25], [55.4, '10-ask-answer', 0.35],
    [59.4, '11-students-again', 0.35],
    [60.5, '12-select', 0.25], [61.7, '13-selected', 0.25],
    [62.9, '14-report-first', 0.35], [64.2, '15-report', 0.25],
    [73.2, '16-dl-1', 0.3], [75.4, '17-dl-3', 0.3],
    [77.7, '18-insights', 0.35],
    [90.3, '19-ins-persp', 0.3],
  ],
  scroll: [
    [0.9, 'doc', 650, 2.6, '01-students'], [3.9, 'doc', 0, 1.3],
    [9.4, 'doc', 78, 0.8, '02-overview'], [12.0, 'doc', 0, 0.6],
    [14.6, 'doc', 810, 5.4, '03-skills'], [20.6, 'doc', 0, 1.0],
    [23.6, 'doc', 534, 4.0, '04-persp'], [29.0, 'doc', 879, 1.4, '05-persp-chart'], [32.6, 'doc', 0, 1.0],
    [35.3, 'doc', { to: 'hAcross', at: 100 }, 1.3, '06-history'],
    [38.4, 'doc', { to: 'hTable', at: 120 }, 1.2, '06-history'],
    [40.6, 'doc', { to: 'hClass', at: 100 }, 2.0, '06-history'],
    [46.0, 'doc', 2071, 2.2, '06-history'], [49.4, 'doc', 0, 1.2],
    [64.9, 'modal', 2286, 7.0, '15-report'],
    [80.8, 'doc', { to: 'insGrowth', at: 90 }, 1.8, '18-insights'],
    [85.8, 'doc', 1525, 1.8, '18-insights'], [88.8, 'doc', 0, 1.0],
    [91.4, 'doc', 190, 1.5, '19-ins-persp'],
  ],
  cursor: [
    [0.3, REST], [4.8, REST], [5.6, { name: 'anaya', fx: 0.15 }], [6.0, { name: 'anaya', fx: 0.15 }],
    [6.8, REST], [12.4, REST], [13.0, 'stabSkills'], [13.3, 'stabSkills'],
    [14.0, REST], [21.2, REST], [21.9, 'stabPersp'], [22.2, 'stabPersp'],
    [23.0, REST], [27.6, REST], [28.4, { name: 'chartSum', fx: 0.07 }], [28.7, { name: 'chartSum', fx: 0.07 }],
    [29.4, REST], [33.2, REST], [33.9, 'stabHistory'], [34.2, 'stabHistory'],
    [35.0, REST], [49.8, REST], [50.4, 'stabOverview'], [50.7, 'stabOverview'],
    [51.6, { name: 'askTend', fx: 0.5 }], [52.0, { name: 'askTend', fx: 0.5 }],
    [52.8, [960, 600]], [53.6, 'askSend'], [54.0, 'askSend'], [54.8, [960, 600]], [58.5, [960, 600]],
    [59.0, 'navStudents'], [59.3, 'navStudents'],
    [60.1, 'selStart'], [60.4, 'selStart'], [61.3, 'selAll'], [61.6, 'selAll'],
    [62.5, 'selPreview'], [62.8, 'selPreview'], [63.8, 'rpNext'], [64.1, 'rpNext'],
    [64.8, [1300, 420]], [72.2, [1300, 420]], [72.8, 'rpDownload'], [73.1, 'rpDownload'],
    [73.9, [1300, 420]], [76.6, [1300, 420]], [77.3, 'navInsights'], [77.6, 'navInsights'],
    [78.3, REST], [89.4, REST], [89.9, 'inPersp'], [90.2, 'inPersp'],
    [91.0, REST], [96.4, REST],
  ],
  clicks: [6.0, 13.3, 22.2, 28.7, 34.2, 50.7, 52.0, 54.0, 59.3, 60.4, 61.6, 62.8, 64.1, 73.1, 77.6, 90.2],
  zoom: [
    [7.4, 1.3, 'stuTwoCol', 0.9], [9.6, 1.3, [828, 540], 1.0], [12.0, 1, [720, 365], 0.7],
    [14.2, 1.15, [828, 420], 0.9], [20.3, 1, [720, 365], 0.6],
    [23.0, 1.25, [828, 450], 0.9], [27.6, 1, [720, 365], 0.6],
    [30.2, 1.35, 'chartBody', 0.9], [32.2, 1, [720, 365], 0.6],
    [36.7, 1.35, { name: 'hAcross', fx: 0.3, dy: 80 }, 0.9], [38.2, 1, [720, 365], 0.6],
    [42.9, 1.4, { name: 'hNote', fx: 0.5, dy: 50 }, 0.9], [45.6, 1, [720, 365], 0.7],
    [52.6, 1.3, 'askPanel', 0.9], [58.0, 1, [720, 365], 0.7],
    [64.4, 1.15, [720, 380], 0.8], [72.0, 1, [720, 365], 0.6],
    [73.8, 1.6, 'prep', 0.8], [76.4, 1, [720, 365], 0.7],
    [78.4, 1.2, [828, 470], 0.9], [80.4, 1, [720, 365], 0.6],
    [83.0, 1.25, [828, 400], 0.9], [85.4, 1, [720, 365], 0.6],
    [90.9, 1.2, [828, 450], 0.9], [95.4, 1, [720, 365], 0.8],
  ],
};
// Push the walkthrough back by the opening card.
(function (V) {
  ['captions', 'shots', 'scroll', 'cursor', 'zoom'].forEach(function (k) { V[k].forEach(function (e) { e[0] += OPEN; }); });
  V.clicks = V.clicks.map(function (t) { return t + OPEN; });
})(window.TIMELINE);
