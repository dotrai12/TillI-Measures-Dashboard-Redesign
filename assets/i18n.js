/* ============================================================
   Tilli Measures — languages + the shared word list (window.TilliI18n)
   ------------------------------------------------------------
   Every app shows screen text through t(key). English lives here;
   translations live in TilliAPI (edited on Tilli → Translations) and
   are shown ONLY once a person has approved them — anything else, or
   anything whose English has changed since, shows in English.

   Language: the person's own pick (saved on their account, and on the
   device before sign-in) → else the browser's language if we have it →
   else English. Load after tilli-api.js.

   6A: the groundwork + the consent screens. 6B: sign-in, the parent app
   and the parent snapshot (keys in STRINGS, machine drafts in
   i18n-drafts.js). The teacher app and school dashboard use the page
   translator instead (autoTranslate, below) — no keys, no drafts.
   ============================================================ */
(function () {
  'use strict';

  var LANGS = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'si', name: 'Sinhala', native: 'සිංහල' },
  ];
  var CODES = LANGS.map(function (l) { return l.code; });
  var DEVICE_KEY = 'tilliMeasures.lang';
  var LOCALE = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', si: 'si-LK' };   // dates + numbers

  // English originals by key. area = where it shows (the Translations screen filters by it).
  var STRINGS = {
    'lang.label': { area: 'Everywhere', en: 'Language' },
    'consent.agreeAll': { area: 'Parent consent', en: 'I agree to all of the below' },
    'consent.required': { area: 'Parent consent', en: 'Required' },
    'consent.optional': { area: 'Parent consent', en: 'Optional' },
    'consent.continue': { area: 'Parent consent', en: 'Continue' },
    'consent.notNow': { area: 'Parent consent', en: 'Not now' },
    'consent.notNowLogout': { area: 'Parent consent', en: 'Not now — log out' },
    'consent.tickRequired': { area: 'Parent consent', en: 'Tick the required box to continue. You can come back and do it later.' },
    'consent.changeLater': { area: 'Parent consent', en: 'You can change this any time from your profile.' },
    'consent.privacy': { area: 'Parent consent', en: 'Read the full privacy notice' },
    'consent.save': { area: 'Parent consent', en: 'Save' },
    'consent.savesNow': { area: 'Parent consent', en: 'Press Save to keep your changes.' },
    'consent.stopsApp': { area: 'Parent consent', en: 'Without the required box, the parent app stops until you tick it again.' },
    'consent.oneThing': { area: 'Parent consent', en: 'One thing first' },
    'consent.backProfile': { area: 'Parent consent', en: 'Back to profile' },
    'consent.yourProfile': { area: 'Parent consent', en: 'Your profile' },
    'consent.short': { area: 'Parent consent', en: 'Choose what you’re happy to share.' },
    'consent.whyAsk': { area: 'Parent consent', en: 'Why we ask' },
    'consent.requiredNote': { area: 'Parent consent', en: '* required' },
    'consent.profileTitle': { area: 'Parent consent', en: 'Consent & privacy' },
    'consent.saved': { area: 'Parent consent', en: 'Saved ✓' },
    'consent.leaveUnsaved': { area: 'Parent consent', en: 'Leave without saving your changes?' },
  };
  function area(name, map) { Object.keys(map).forEach(function (k) { STRINGS[k] = { area: name, en: map[k] }; }); }

  // ---- 6B · the help button (every app) ----
  area('Everywhere', {
    'help.need': 'Need help?',
    'help.close': 'Close',
    'help.sub': 'Questions about the dashboard, or something not working? The Tilli team is happy to help.',
    'help.email': 'Email the Tilli team',
    'help.report': 'Report a problem',
    'help.reportSub': 'Tell us what happened and where',
    'help.bubbleTitle': 'Need help? Contact the Tilli team · drag to move',
    'common.section': 'Section {s}',
    'phase.baseline': 'Baseline', 'phase.midline': 'Midline', 'phase.endline': 'Endline', 'phase.between': 'In between',
  });

  // ---- 6B · sign-in page (index.html + landing.js) ----
  area('Sign-in', {
    'signin.eyebrow': 'Developmentally on track by 10',
    'signin.welcome': 'Welcome to Tilli Measures',
    'signin.tagline': 'Every skill a seed. Watch the whole child grow.',
    'signin.getStarted': 'Get started',
    'signin.stat1': 'foundational skills, measured from three angles',
    'signin.stat2': 'a year · 20 minutes a week',
    'signin.dialog': 'Get started with Tilli Measures',
    'signin.back': 'Back',
    'signin.close': 'Close',
    'signin.taking': 'You’re taking: {name}',
    'signin.whoTitle': 'Who are you?',
    'signin.whoSub': 'We’ll set up the right garden for you.',
    'signin.roleParent': 'Parent / Home',
    'signin.roleParentSub': 'Follow your child’s assessments',
    'signin.roleSchool': 'School',
    'signin.roleSchoolSub': 'See your whole class garden',
    'signin.roleTilli': 'Tilli Team',
    'signin.roleTilliSub': 'Internal view across the school',
    'signin.typeMore': 'Type at least {n} letters to search…',
    'signin.groupLinkSub': 'This link was shared by {group}. Pick your school to continue.',
    'signin.noAccountSub': 'No account yet for {email}. Pick your school to join it.',
    'signin.startTyping': 'Start typing to find it in the list.',
    'signin.pickInGroup': 'Pick your school in {group}',
    'signin.selectSchool': 'Select your school',
    'signin.whichSchool': 'Which school does your child go to?',
    'signin.schoolPh': 'Select school',
    'signin.schoolAria': 'Search school',
    'signin.noMatch': 'No match — use “{q}”',
    'signin.continue': 'Continue',
    'signin.pillTilli': 'Tilli Team · internal',
    'signin.pillGroup': 'School group',
    'signin.pillSchool': 'School · teachers, admins & school groups',
    'signin.enterEmail': 'Enter your email',
    'signin.emailAria': 'Email address',
    'signin.enter': 'Enter',
    'signin.checking': 'Checking if your account exists…',
    'signin.createTitle': 'Create your Tilli account',
    'signin.verifyTitle': 'Check your email',
    'signin.verifyBody': 'We’ve sent a verification link to {email}. Open it to finish creating your account.',
    'signin.verifySpam': 'Can’t find it? Check your spam or junk folder.',
    'signin.verifyResend': 'Resend email',
    'signin.verifyResent': 'Sent again — it can take a minute to arrive.',
    'signin.verifyOther': 'Use a different email',
    'signin.verifyDemo': 'Continue as if verified (demo only)',
    'signin.enterTitle': 'Enter your Tilli account',
    'signin.joining': 'Joining {school}',
    'signin.googleCreate': 'Create via Google',
    'signin.googleEnter': 'Enter via Google',
    'signin.or': 'OR',
    'signin.pwCreate': 'Create a password',
    'signin.pwEnter': 'Enter your password',
    'signin.pwAria': 'Password',
    'signin.showPw': 'Show password',
    'signin.hidePw': 'Hide password',
    'signin.pwWrong': 'That password doesn’t match this account. Please try again.',
    'signin.forgot': 'Forgot password?',
    'signin.forgotHelp': 'To reset your password, contact your school admin — they can re-send an invite that lets you set a new one.',
    'signin.pwCreateBtn': 'Create via password',
    'signin.pwEnterBtn': 'Enter via password',
    'signin.codeTitle': 'Enter your school code',
    'signin.codeSub': 'Your school admin can share it with you. It tells us which school you’re joining.',
    'signin.codeAria': 'School code',
    'signin.verify': 'Verify',
    'signin.codeUnknown': 'We don’t recognise that code. Codes change sometimes — ask your school office for the current one.',
    'signin.codeNotInGroup': 'That code isn’t for a school in {group}. Check it with your school office.',
    'signin.codeWrongSession': 'This session is for {school}. Use that school’s code.',
    'signin.codeDifferent': 'That code is for a different school. Check it with your school office.',
    'signin.isYourSchool': 'Is this your school?',
    'signin.yesMySchool': 'Yes, that’s my school',
    'signin.notMySchool': 'Not my school',
    'signin.setPwTitle': 'Set your password',
    'signin.joiningAs': 'Joining as {role}',
    'signin.joiningAsFor': 'Joining as {role} for {school}',
    'signin.newPw': 'New password (min 6 characters)',
    'signin.newPwAria': 'New password',
    'signin.confirmPw': 'Confirm new password',
    'signin.setPwBtn': 'Set password & continue',
    'signin.pwShort': 'Use at least 6 characters.',
    'signin.pwMismatch': 'Those passwords don’t match.',
    'signin.pwFail': 'Could not set the password. Try again.',
    'kids.title': 'Select the child you want to know more about',
    'kids.tapChild': 'Tap a child to see how their garden is growing.',
    'kids.addFirst': 'Add your first child to get started.',
    'kids.add': '+ add child',
    'kids.statusDone': 'assessment complete',
    'kids.statusPending': 'assessment pending',
    'kids.loading': 'Getting our notepad to note down your child’s details…',
    'kids.addTitle': 'Add your child',
    'kids.addSub': 'Enter your child’s admission number at {school}. You’ll check it’s the right child next.',
    'kids.theirSchool': 'their school',
    'kids.admLabel': 'Admission number',
    'kids.admPh': 'Enter admission number of your child',
    'kids.notFound': 'We can’t find that admission number at {school}. Check it on a school letter or ask the school office.',
    'kids.locked': 'Too many tries — please wait a few minutes, then try again.',
    'kids.found': 'We found your child',
    'kids.confirmSub': 'Please confirm this is the right student.',
    'kids.admNo': 'Admission number · {adm}',
    'kids.understand': 'Understand {name} with Tilli Measures.',
    'kids.yesMine': 'Yes, that’s my child',
    'kids.notMine': 'Not your child? Click here',
  });

  // ---- 6B · parent app (parent.html) ----
  area('Parent app', {
    'parent.yourChild': 'Your child',
    'parent.yourFamily': 'Your family',
    'parent.yourTeacher': 'your teacher',
    'parent.noGrade': 'No grade set',
    'parent.parentOf': '{name}’s parent',
    'parent.addChild': '+ Add another child',
    'parent.profile': 'Profile',
    'parent.logout': 'Log out',
    'parent.ord1': '1st', 'parent.ord2': '2nd', 'parent.ord3': '3rd',
    'parent.phaseTitle': '{ord} phase · {phase}',
    'parent.allDone': 'All assessments completed for {name}',
    'parent.someDone': '{n} assessments completed for {name}',
    'parent.locked': 'Locked',
    'parent.viewDetails': 'View details',
    'parent.viewReport': 'View report',
    'parent.continueAssess': 'Continue assessment',
    'parent.fullView': 'Get a full view of {name}',
    'parent.footnote': 'Every check-in helps {name}’s garden grow 🌱',
    'parent.allPhases': 'All phases',
    'parent.watchGrow': 'Watch {name} grow',
    'parent.snapshotOf': '{name}’s {phase} snapshot',
    'parent.revisit': 'Revisit the warm summary from {name}’s last completed window.',
    'parent.seeSnapshot': 'See snapshot',
    'parent.noSnapshot': 'No snapshot yet',
    'parent.firstReport': '{name}’s first report appears once a window is complete.',
    'parent.soon': 'soon',
    'parent.nextOpens': '{phase} opens {date}',
    'parent.nextSoon': 'The next window opens soon',
    'parent.eyebrowBetween': 'Parent home · In between windows',
    'parent.resting': 'No check-ins are open right now — {name}’s garden is resting until {phase} opens {date}.',
    'parent.restingSoon': 'No check-ins are open right now — {name}’s garden is resting until the next window opens.',
    'parent.nothingNow': 'Nothing to complete right now',
    'parent.revisitPast': 'You can revisit past reports any time.',
    'parent.eyebrowPast': 'Completed window · {phase}',
    'parent.eyebrowFuture': 'Upcoming window · {phase}',
    'parent.eyebrowNow': 'Open now · {phase}',
    'parent.subLocked': '{phase} opens {date} — nothing to do just yet.',
    'parent.subProgress': '{done} of {total} check-ins done — finish them to complete {name}’s garden.',
    'parent.subDone': 'Every check-in is complete — {name}’s {phase} report is ready below.',
    'parent.upcoming': 'Upcoming',
    'parent.completed': 'Completed',
    'parent.inProgress': 'In progress',
    'parent.start': 'Start',
    'parent.opens': 'Opens {date}',
    'parent.completedOn': 'Completed {date}',
    'parent.due': 'Due {date}',
    'parent.hintNow': 'Tap an assessment to start it, then tap again to mark it done.',
    'parent.hintPast': 'This window is complete — a look back at {name}’s history.',
    'parent.hintFuture': '{phase} opens {date}.',
    'parent.notStarted': 'Not started yet',
    'parent.nCompleted': '{done} of {total} completed',
    'parent.opensUnlock': 'Opens {date} — complete the window to unlock it.',
    'parent.snapReady': '{name}’s snapshot is ready',
    'parent.parentSnap': '{name}’s parent snapshot',
    'parent.snapReadySub': 'A warm summary of what you’re seeing at home, from your survey.',
    'parent.snapLockedSub': 'Complete the Parent report to unlock your snapshot.',
    'parent.completeAll': 'Complete all assessments to access it',
    'parent.assessFor': 'Assessments for {name}',
    'parent.a.parent': 'Parent report',
    'parent.sub.survey10': 'Parent survey · 10 questions',
    'parent.sub.activity5': 'Child activity · about 5 min',
    'parent.sub.activity4': 'Child activity · about 4 min',
    'parent.yearGraduated': '{name} has graduated — well done!',
    'parent.yearNowIn': '{name} is now in {cls}.',
    'parent.yearStarted': '{year} has started',
    'parent.yearLastUnder': 'Last year’s check-ins are under {last}.',
    'parent.dismiss': 'Dismiss',
    'parent.lastNA': 'Last year’s check-ins aren’t available.',
    'parent.readOnly': 'read-only',
    'parent.didntRun': 'Didn’t run',
    'parent.parentCheckin': 'Parent check-in',
    'parent.activityWithChild': 'Activity with your child',
    'parent.activityToDo': 'Activity to do with your child',
    'parent.notDone': 'Not done',
    'parent.nDone': '{done} of {total} done',
    'parent.yearAria': 'School year',
    'parent.thisYear': 'This year',
    'parent.lastYear': 'Last year',
    'parent.graduated': 'Graduated',
    'parent.eyebrowHome': 'Parent home · {school}',
    'parent.hasGraduated': '{name} has graduated',
    'parent.lastYearOf': '{name}’s last year',
    'parent.gradSub': 'There are no new check-ins for {name} here. Their past check-ins stay below.',
    'parent.lastSub': 'What you and {name} completed last year. Nothing here can be changed.',
    'parent.noPast': 'No past check-ins yet.',
    'parent.liveSub': 'Complete each check-in your school has opened — your answers save right away.',
    'parent.noneSub': 'No check-ins are open yet. They’ll appear here as your school deploys each window.',
    'parent.notDeployed': 'Not deployed yet',
    'parent.notDeployedSub': '{name}’s {phase} check-ins will show up here once your school opens this window.',
    'parent.opensOn': 'Opens on {date}',
    'parent.scheduledOne': '1 check-in for {name} — open {start} to {end}.',
    'parent.scheduledMany': '{n} check-ins for {name} — open {start} to {end}.',
    'parent.opensAfter': 'Opens after “{name}”',
    'parent.finishFirst': 'Finish “{name}” first to unlock this.',
    'parent.notOpenYet': 'This window hasn’t opened yet — it unlocks when your school opens it.',
    'parent.windowEnded': 'Window ended · not completed',
    'parent.missed': 'Missed',
    'parent.tapMark': '{kind} · tap to mark done',
    'parent.markDone': 'Mark done',
    'parent.noAssess': 'No assessments in this window yet',
    'parent.ended': 'Ended',
    'parent.openUntil': 'open until {date}',
    'parent.backHome': 'Back to home',
    'parent.followingOne': 'You’re following 1 child at {school}. Tap a child to open their check-ins.',
    'parent.followingMany': 'You’re following {n} children at {school}. Tap a child to open their check-ins.',
    'parent.yourChildren': 'Your children',
    'parent.linked': '{n} linked',
    'parent.toGo': '{n} to go',
    'parent.allDoneShort': 'All done ✓',
    'parent.checkinsN': '{done}/{total} check-ins',
    'parent.consentHead': 'Consent & privacy',
    'parent.agreedOn': 'Agreed on {date}',
    'parent.notGiven': 'Not given yet',
    'parent.whatAgreed': 'What you agreed to',
    'parent.readAgain': 'Read it again, or change the optional choices.',
  });

  // ---- 6B · the parent snapshot (after each window). {name}, {Name}, {subj},
  // {Subj}, {obj}, {poss}, {be}, {teacher} are filled in for the child — a
  // translation can use just {name} where the language needs no pronouns.
  area('Parent snapshot', {
    'snap.noteFor': 'A note for',
    'snap.family': '{name}’s family',
    'snap.lead': 'Here is a brief analysis based on your observations and how {name} did in the {phase} Tilli games.',
    'snap.shining': '3 places where {name} is shining',
    'snap.support': 'Where {name} needs support',
    'snap.tryHome': '3 things you can try at home',
    'snap.tapCard': 'tap on each card to learn more',
    'snap.workTeacher': 'Work with the teacher',
    'snap.teacherCopy': 'When you’re ready, ask {teacher} for {name}’s fuller report. It brings this survey together with {name}’s own activities and what {poss} teacher sees in class — three angles on the same wonderful child.',
    'snap.download': 'Download PDF',
    'snap.downloaded': 'Downloaded ✓',
    'snap.saveImage': 'Save image',
    'snap.saved': 'Saved ✓',
    'snap.footer': 'For family use only · for enquiry / questions email info@tillikids.com · a fresh snapshot follows each assessment window.',
    'snap.activity': 'Activity',
    'snap.type0': 'Playful game', 'snap.type1': 'Everyday chat', 'snap.type2': 'Daily routine',
    'snap.freq0': 'A few times a week', 'snap.freq1': 'Once a day', 'snap.freq2': 'Once a week',
  });
  // Per skill: one strength line, the growth heading + description, and three
  // try-at-home activities (title + body).
  var SNAP = {
    emotion_awareness: ['{Subj} {be} good at putting feelings into words — you’ll often hear {name} say ‘I feel cross’ or ‘that made me happy’ without being asked.',
      'Putting feelings into words', 'Right now {name} sometimes shows big feelings through {poss} body or actions before {subj} can name them. A little help spotting and naming feelings gives {obj} the words to tell you what’s going on.',
      [['Name it as you go', 'Say what you notice out loud: ‘you look frustrated with that puzzle.’ Hearing feelings named gives {name} the words to use next time.'],
       ['Feelings check-in', 'At dinner, each share one feeling from the day. Take a turn yourself so it feels normal.'],
       ['Story feelings', 'While reading, pause and ask ‘how do you think they feel?’ Picture books are full of easy feelings to spot.']]],
    emotion_regulation: ['When something upsets {name}, {subj} {be} usually able to settle back down before long and get on with the day.',
      'Settling big feelings', 'When something feels unfair or frustrating, it can take {name} a while to come back down. With a few calming tricks to reach for, those moments get shorter and gentler.',
      [['Practise calm when it’s calm', 'Try belly-breathing together when everyone is relaxed, so the trick is ready for the wobbly moments.'],
       ['A calm-down corner', 'Set up a cosy spot with a cushion or soft toy {name} can choose to go to when feelings get big — never as a punishment.'],
       ['Name the size', 'Talk about feelings as small, medium or big. Spotting one early makes it easier to handle before it grows.']]],
    empathy: ['{Name} tends to notice when someone else is sad or left out, and will often go over to comfort them.',
      'Tuning in to how others feel', '{Name} is still learning to read when a friend is upset or wants a turn. Gentle noticing games help {obj} see things from someone else’s side.',
      [['How do they feel?', 'During stories or at the park, wonder aloud how someone else might be feeling, and why.'],
       ['Little helper jobs', 'Give {name} small caring jobs — carrying something for a sibling, checking on a friend — so kindness gets lots of practice.'],
       ['Feelings faces', 'Play a quick game guessing feelings from faces in photos or books. It builds the habit of reading others.']]],
    relationship_skills: ['{Name} plays warmly with others — sharing, taking turns and finding {poss} way back after a squabble.',
      'Playing and sharing with others', 'Taking turns and smoothing over little disagreements are still growing for {name}. Short, guided play gives {obj} a friendly place to practise.',
      [['One-to-one play', 'Set up a short playdate with a single friend. Fewer children makes taking turns easier to manage.'],
       ['Turn-taking games', 'Simple board games are gentle practice for waiting, winning and losing.'],
       ['Talk it back', 'After a squabble, calmly help {name} name what happened and think of one thing to try next time.']]],
    metacognition: ['{Name} likes to think out loud about {poss} own thinking — what was tricky, and what {subj} {be} going to try next.',
      'Noticing how they think', '{Name} is beginning to look back on what {subj} {be} doing and why. Simple ‘what worked, what was tricky’ chats help that reflecting habit take root.',
      [['Look-back chats', 'After a task ask ‘what was tricky, and what would you try next time?’ Keep it curious, not a test.'],
       ['Think out loud', 'Narrate your own thinking — ‘I’ll do the hard bit first’ — so {name} hears how planning sounds.'],
       ['Two ways', 'When something is tricky, ask {name} to think of two ways to try it before picking one.']]],
    critical_thinking: ['{Name} asks plenty of ‘but why?’ questions and enjoys working out how things fit together.',
      'Thinking things through', '{Name} is still building the habit of weighing choices and asking why. Open questions instead of quick answers give {obj} room to reason it out.',
      [['Ask, don’t tell', 'When {name} wonders about something, ask ‘why do you think that is?’ before giving the answer.'],
       ['What might happen?', 'During stories, pause and guess together what could come next, and why.'],
       ['Sorting games', 'Sort toys or socks by colour, size or type. Grouping things builds reasoning in a playful way.']]],
    working_memory: ['{Name} can hold a few steps in mind at once — give {obj} a two-part instruction and {subj} {be} usually able to see it through.',
      'Holding steps in mind', 'Longer instructions can slip away before {name} finishes them. Breaking things into a couple of clear steps helps {obj} keep the whole plan in mind.',
      [['Two-step errands', 'Give little two-part jobs — ‘put your cup in the sink and grab your shoes.’ Add a step as it gets easy.'],
       ['Quick memory games', 'Play a short round of ‘I packed my bag’ after dinner. Five minutes is plenty.'],
       ['Say it back', 'Ask {name} to repeat the plan back to you before starting, so the steps stick.']]],
    planning: ['{Name} likes things in order — {subj} {be} happy to line up a task and work through it step by step.',
      'Planning and organising', 'Getting started and keeping bits in order is still coming along for {name}. A simple picture checklist gives {obj} a way to see what comes next.',
      [['Picture checklist', 'Make a simple picture list for a routine like the morning bag, and let {name} tick things off.'],
       ['Plan it first', 'Before an activity, ask ‘what do we need, and what comes first?’ Planning aloud makes it a habit.'],
       ['First, then', 'Use ‘first we do this, then that’ language so the order of steps feels clear and doable.']]],
    cognitive_flexibility: ['When a plan changes, {name} tends to roll with it and try another way rather than getting stuck.',
      'Adapting when things change', 'A sudden change to a plan can feel hard for {name} just now. Playful ‘let’s try it another way’ moments make switching feel safe and fun.',
      [['Another way', 'Play ‘let’s do it differently’ — brush teeth with the other hand, take a new route to the park.'],
       ['Gentle heads-up', 'Warn before a change: ‘five more minutes, then we tidy up.’ Knowing what’s coming makes switching easier.'],
       ['What else could it be?', 'Look at a cloud or a squiggle and take turns saying what else it could be. Silly is good.']]],
    inhibition_distraction: ['{Name} can settle into something and keep going, even with a bit of noise and bustle around {obj}.',
      'Staying focused', 'It’s easy for {name} to be pulled away by whatever is going on nearby. Short bursts of quiet focus, then a break, help that staying-power grow.',
      [['Quiet focus bursts', 'Try a few minutes of one task in a calm spot, then a movement break. Slowly stretch the time.'],
       ['Clear the deck', 'Before something that needs focus, tidy away the other toys so there is less pulling {poss} attention.'],
       ['Beat the timer', 'Set a short, fun timer and see how much of one job {name} can finish before it rings.']]],
    inhibition_response: ['{Subj} {be} often able to stop and think for a moment before jumping straight in.',
      'Pausing before acting', '{Name} sometimes jumps straight in before stopping to think. Fun ‘wait for it’ games make that pause feel like play rather than a rule.',
      [['Red light, green light', 'Play stop-and-go games. They make pausing before acting genuinely fun.'],
       ['Wait for the word', 'Play games where {name} waits for a signal before moving — good practice for holding on a beat.'],
       ['Take a breath', 'Coach one slow breath before answering or reacting. A tiny pause is a big skill.']]],
    attention: ['{Name} can stay with a game or a story for a good stretch without drifting off.',
      'Staying with one thing', '{Name}’s focus can drift after a little while. Slowly stretching cosy reading or building time helps {obj} stay with one thing for longer.',
      [['A little longer', 'Read or build together and gently stretch the time by a minute or two each week.'],
       ['One thing at a time', 'Offer a single activity rather than several, so it is easier to stay with it to the end.'],
       ['Finish-it moments', 'Pick a small task to see all the way through together, and celebrate reaching the end.']]],
  };
  Object.keys(SNAP).forEach(function (k) {
    var s = SNAP[k], m = {};
    m['snap.shine.' + k] = s[0]; m['snap.growHead.' + k] = s[1]; m['snap.growDesc.' + k] = s[2];
    s[3].forEach(function (a, i) { m['snap.act.' + k + '.' + i + '.t'] = a[0]; m['snap.act.' + k + '.' + i + '.b'] = a[1]; });
    area('Parent snapshot', m);
  });
  // The consent wording itself is content (TilliAPI.consentConfig) — read live
  // so a new version's English shows up here for translating.
  function dynamicStrings() {
    var out = {}, A = window.TilliAPI;
    if (!A || !A.consentConfig) return out;
    var c = A.consentConfig();
    out['consent.title'] = { area: 'Parent consent', en: c.title };
    out['consent.intro'] = { area: 'Parent consent', en: c.intro };
    c.items.forEach(function (it) { out['consent.item.' + it.id] = { area: 'Parent consent', en: it.text }; });
    return out;
  }
  // Everything Tilli → Translations lists: the word list, then the page
  // translator's strings (one row per English text, even if seen in two apps).
  function catalog() {
    var all = Object.assign({}, STRINGS, dynamicStrings()), have = {};
    var out = Object.keys(all).map(function (k) { have[k] = 1; return { key: k, en: all[k].en, area: all[k].area }; });
    uiCatalog().forEach(function (c) { if (!have[c.key]) { have[c.key] = 1; out.push(c); } });
    return out;
  }

  // Machine drafts for "Draft with Ask Tilli" live in i18n-drafts.js, which
  // only the Tilli console loads (parents' phones never download them).
  var DRAFTS = {};

  // ---------- which language ----------
  function signedInEmail() {
    try { var s = JSON.parse(localStorage.getItem('tilliMeasures.session') || 'null'); return s && s.email ? String(s.email).toLowerCase() : ''; } catch (e) { return ''; }
  }
  function known(code) { return CODES.indexOf(code) >= 0 ? code : null; }
  // The browser's preferred languages, first one we have (hi-IN → hi).
  function detect() {
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (var i = 0; i < list.length; i++) { var c = known(String(list[i] || '').toLowerCase().split('-')[0]); if (c) return c; }
    return 'en';
  }
  function devicePick() { try { return known(localStorage.getItem(DEVICE_KEY)); } catch (e) { return null; } }
  // A shared device (the student assessment page): its own language on this
  // device only — never the signed-in teacher's account choice.
  var scopeKey = null;
  function deviceOnly(name) { scopeKey = DEVICE_KEY + '.' + name; document.documentElement.lang = current(); }
  function current() {
    if (scopeKey) { var v = null; try { v = known(localStorage.getItem(scopeKey)); } catch (e) { /* no storage */ } return v || detect(); }
    var A = window.TilliAPI, e = signedInEmail();
    return (e && A && A.userLang && known(A.userLang(e))) || devicePick() || detect();
  }
  // email: whose account to save it on (defaults to whoever is signed in).
  function setLang(code, email) {
    code = known(code) || 'en';
    if (scopeKey) { try { localStorage.setItem(scopeKey, code); } catch (e) { /* convenience */ } document.documentElement.lang = code; return code; }
    try { localStorage.setItem(DEVICE_KEY, code); } catch (e) { /* device pick is a convenience */ }
    var A = window.TilliAPI, e = String(email || signedInEmail()).toLowerCase();
    if (e && A && A.setUserLang) A.setUserLang(e, code);
    document.documentElement.lang = code;
    return code;
  }

  // ---------- text ----------
  function englishOf(key, fallback) { var s = STRINGS[key] || dynamicStrings()[key]; return s ? s.en : (fallback != null ? fallback : key); }
  // t(key[, english][, vars]) — the approved translation in the current language,
  // else the English. {name} placeholders are filled from vars.
  function t(key, english, vars) {
    if (english && typeof english === 'object') { vars = english; english = null; }
    var en = englishOf(key, english), lang = current(), out = en, A = window.TilliAPI;
    if (lang !== 'en' && A && A.translationsFor) {
      var rec = (cacheFor(lang))[key];
      if (rec && rec.status === 'approved' && rec.src === en) out = rec.text;
    }
    return vars ? out.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : out;
  }
  // html(key, vars) — the same text made safe for innerHTML: the translation is
  // escaped, then {x} is filled with vars as given (callers pass escaped/markup
  // values, e.g. { name: '<b>' + esc(n) + '</b>' }).
  function html(key, vars) {
    var s = esc(t(key));
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
  }
  // Static pages: <span data-i18n="key">English</span> → its text in the current language.
  function apply(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  }
  var cache = {};
  function cacheFor(lang) { return cache[lang] || (cache[lang] = window.TilliAPI.translationsFor(lang)); }
  function refresh() { cache = {}; }
  function fmtDate(v, opts) {
    var d = v instanceof Date ? v : new Date(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + 'T00:00:00' : v);
    try { return d.toLocaleDateString(LOCALE[current()] || 'en-IN', opts || { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d.toDateString(); }
  }

  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  // ---------- the switcher ----------
  // A small select in each dashboard (sign-in, parent + teacher profile, school
  // admin account menu, student assessment page). Each language in its own script.
  function switcherHTML(cls) {
    var cur = current();
    return '<label class="lang-switch' + (cls ? ' ' + cls : '') + '"><span class="lang-switch-ic" aria-hidden="true">🌐</span>' +
      '<select data-langswitch aria-label="' + esc(t('lang.label')) + '">' +
      LANGS.map(function (l) { return '<option value="' + l.code + '"' + (l.code === cur ? ' selected' : '') + '>' + l.native + '</option>'; }).join('') +
      '</select></label>';
  }
  // onChange(code) — default reloads so every screen redraws in the new language.
  function wire(root, onChange) {
    (root || document).querySelectorAll('[data-langswitch]').forEach(function (sel) {
      if (sel.dataset.langwired) return; sel.dataset.langwired = '1';
      sel.addEventListener('change', function () { setLang(sel.value); refresh(); (onChange || function () { location.reload(); })(sel.value); });
    });
  }

  // ---------- the page translator (teacher app, school dashboard) ----------
  // For screens whose text isn't wired to t(): any text node, placeholder, title
  // or aria-label whose whole text matches an APPROVED translation is swapped
  // on screen (key 'ui:' + the English). While the page is in English, new text
  // is noted for Tilli → Translations. Left alone: text with a number, an email
  // or a link, people's and the school's names, anything inside translate="no"
  // or .notranslate, and form fields.
  var UI_ATTRS = ['placeholder', 'title', 'aria-label'];
  var UI_SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };
  var UI_SKIP_SEL = '[translate="no"], .notranslate, [contenteditable="true"]';
  var UI_MAX_LEN = 300;      // longer text is content, not a screen string
  var UI_NOTE_MS = 1500;     // new strings are saved in one batch after this pause
  var UI_PREFIX = 'ui:';
  function uiCandidate(s) {
    return s.length >= 2 && s.length <= UI_MAX_LEN && /[A-Za-z]{2}/.test(s) && !/\d/.test(s) && !/@|https?:|www\./i.test(s);
  }
  // People's and the school's names from the page's roster — data, not screen text.
  function rosterNames() {
    var out = {}, S = window.TILLI_SCHOOL || {}, add = function (x) { if (x) out[String(x).trim()] = 1; };
    (S.students || []).forEach(function (s) { add(s.first); add(s.last); add(s.name); add((s.first || '') + ' ' + (s.last || '')); });
    (S.teachers || []).forEach(function (t) { add(t.name); });
    if (S.school) add(S.school.name);
    return out;
  }
  function autoTranslate(opts) {
    opts = opts || {};
    var area = opts.area, root = opts.root || document.body, A = window.TilliAPI;
    if (!area || !root || !A || !A.noteUiStrings || typeof MutationObserver === 'undefined') return;
    var lang = current(), map = {};
    if (lang !== 'en') {
      var recs = A.translationsFor(lang);
      Object.keys(recs).forEach(function (k) {
        var r = recs[k], en = k.slice(UI_PREFIX.length);
        if (k.indexOf(UI_PREFIX) === 0 && r.status === 'approved' && r.src === en) map[en] = r.text;
      });
    }
    var skipText = rosterNames();
    Object.keys(STRINGS).forEach(function (k) { skipText[STRINGS[k].en] = 1; });   // already in the word list
    var seen = (A.uiStrings()[area]) || {}, pending = {}, timer = null;
    var mine = new WeakMap();   // text node → the text we put there, so our own swap isn't read back as English
    function queue(s) {
      if (lang !== 'en' || seen[s] || skipText[s]) return;
      pending[s] = 1;
      if (!timer) timer = setTimeout(function () {
        var list = Object.keys(pending); pending = {}; timer = null;
        list.forEach(function (x) { seen[x] = 1; });
        if (list.length) A.noteUiStrings(area, list);
      }, UI_NOTE_MS);
    }
    function skipped(el) { return !el || UI_SKIP_TAGS[el.tagName] || (el.closest && el.closest(UI_SKIP_SEL)); }
    function doText(node) {
      var v = node.nodeValue;
      if (mine.get(node) === v || skipped(node.parentElement)) return;
      var s = v.trim();
      if (!uiCandidate(s)) return;
      if (map[s]) { var nv = v.replace(s, map[s]); mine.set(node, nv); node.nodeValue = nv; }
      else queue(s);
    }
    function doAttrs(el) {
      UI_ATTRS.forEach(function (a) {
        var v = el.getAttribute(a), s = v && v.trim();
        if (!s || !uiCandidate(s)) return;
        if (map[s]) el.setAttribute(a, map[s]); else queue(s);
      });
    }
    function walk(node) {
      if (node.nodeType === 3) { doText(node); return; }
      if (node.nodeType !== 1 || skipped(node)) return;
      doAttrs(node);
      var w = document.createTreeWalker(node, 5 /* elements + text */, {
        acceptNode: function (n) { return n.nodeType === 1 && skipped(n) ? 2 /* reject subtree */ : 1; },
      });
      for (var n = w.nextNode(); n; n = w.nextNode()) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
    }
    walk(root);
    // Runs before the browser paints, so a translated screen never flashes English.
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') doText(m.target);
        else if (m.type === 'attributes' && !skipped(m.target)) doAttrs(m.target);
      });
    }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: UI_ATTRS });
  }
  // The page translator's strings, for Tilli → Translations.
  function uiCatalog() {
    var A = window.TilliAPI, by = (A && A.uiStrings) ? A.uiStrings() : {}, out = [];
    Object.keys(by).forEach(function (area) {
      Object.keys(by[area]).forEach(function (en) { out.push({ key: UI_PREFIX + en, en: en, area: area, ui: true }); });
    });
    return out;
  }

  document.documentElement.lang = current();
  window.TilliI18n = { LANGS: LANGS, CODES: CODES, catalog: catalog, drafts: DRAFTS, current: current, detect: detect,
    setLang: setLang, deviceOnly: deviceOnly, t: t, html: html, apply: apply, refresh: refresh, autoTranslate: autoTranslate, fmtDate: fmtDate, switcherHTML: switcherHTML, wire: wire };
})();
