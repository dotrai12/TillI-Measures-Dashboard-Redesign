/* ============================================================
   Tilli Measures — MOCK BACKEND / GUARD LAYER  (window.TilliAPI)
   ============================================================
   WHAT THIS IS
   ------------------------------------------------------------
   This is the SUBSTITUTE for the real backend. It implements every
   security guard from tilli-measures-identity-access-spec.md as a
   plain function, backed by localStorage so it behaves like a real
   system across reloads. The UI (landing.js, teacher.js,
   teacher-dashboard.js, parent.html) talks ONLY to these functions —
   never to window.TILLI_SCHOOL directly for anything security-relevant.

   >>> FOR THE DEVELOPER WIRING THE REAL BACKEND:
   >>> Every function marked  // SERVER-SIDE:  is a guard that MUST be
   >>> enforced on the server (the spec §1.2, §8). Replace the *body*
   >>> of each function with a real `fetch(...)` to your API. Keep the
   >>> function names, arguments, and return shapes identical and the
   >>> whole UI keeps working unchanged. Do NOT trust the client to
   >>> enforce these — this file only *simulates* server enforcement.

   Spec mapping:
     addStudent .............. Flow A / A4  (dedupe-on-add, merge, near-match flag)
     beginClaim / verifyClaim / confirmClaim ... Flow B / B1–B3 (verify-before-reveal)
     offboardStudent / revokeParentLink / reassignTeacher ... Flow C (Admin-only)
     verifySchool / inviteAdmin / inviteTeacher / acceptInvite ... Flow A / A1–A3
   ============================================================ */
(function () {
  'use strict';

  var STORE_KEY   = 'tilliMeasures.api.v1';
  var SEED_VER    = 4;                 // bump to force a re-seed after data-shape changes

  // Claim-flow tuning (spec §5 B2: rate-limit + lock).
  var MAX_ATTEMPTS = 5;                // lock after this many wrong second-factors
  var LOCK_MS      = 15 * 60 * 1000;   // 15-minute lockout

  /* ---------- tiny deterministic RNG (stable claim codes / DOBs) ---------- */
  function hashStr(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
  function seeded(adm, salt){ return hashStr(String(adm)+':'+salt); }

  // Stable claim code for a child — does NOT change while the child is at the
  // school (per product decision). Tilli shares it with school/teacher/parent.
  function makeClaimCode(adm){
    var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no I/O/0/1 ambiguity
    var h = seeded(adm, 'claim'); var out = '';
    for (var i=0;i<4;i++){ out += abc[h % abc.length]; h = Math.floor(h/abc.length) ^ (h<<3); h>>>=0; }
    return 'TIL-' + out;
  }
  // Stable plausible DOB (used only when a school's second factor is 'dob' | 'both').
  function makeDob(adm, grade){
    var h = seeded(adm, 'dob');
    var baseYear = /kinder/i.test(grade||'') ? 2020 : 2019;   // ~5yo vs ~6yo demo
    var month = (h % 12) + 1; var day = ((h>>4) % 28) + 1;
    return baseYear + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
  }

  /* ---------- string helpers ---------- */
  function norm(s){ return String(s==null?'':s).trim(); }
  function up(s){ return norm(s).toUpperCase(); }
  function low(s){ return norm(s).toLowerCase(); }
  function keyOf(schoolId, studentId){ return low(schoolId)+'::'+up(studentId); }
  function fullName(s){ return norm(s.first)+' '+norm(s.last); }
  function levenshtein(a,b){
    a=up(a); b=up(b); var m=a.length,n=b.length; if(!m)return n; if(!n)return m;
    var d=[]; for(var i=0;i<=m;i++)d[i]=[i]; for(var j=0;j<=n;j++)d[0][j]=j;
    for(i=1;i<=m;i++)for(j=1;j<=n;j++){ var c=a[i-1]===b[j-1]?0:1;
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+c); }
    return d[m][n];
  }

  /* ---------- persistence (the fake "database") ---------- */
  function blankDB(){
    return {
      seedVer: SEED_VER,
      schools: {},            // school_id -> { school_id, name, board, verified, status, claimMethod }
      sections: {},           // section_id -> { section_id, school_id, grade, section, name, teacherId }
      teacherMemberships: [], // { user_id(email), school_id, section_ids[], status }
      adminMemberships: [],   // { user_id(email), school_id, role:'admin'|'principal_view', status }
      students: {},           // keyOf() -> record (see seedFromSchool)
      parentLinks: [],        // { parent_user_id(email), school_id, student_id, status, verified_at }
      claimChallenges: {},    // challengeId -> { school_id, student_id, exists, created }
      claimTokens: {},        // claimToken  -> { school_id, student_id, created }
      attempts: {},           // keyOf() -> { count, lockedUntil }
      reviewQueue: [],        // near-match flags awaiting Admin (spec A4 / §9.2)
      invites: [],            // { token, school_id, email, role, section_ids[], used }
      // ---- NEW (cross-app assessment lifecycle) ----
      // deployments[school_id]['<phase>|<audience>'] = { phase, audience,
      //   deployed, status:'Live'|'Ended', window, assessments:[{id,name}],
      //   deployedAt, endedAt }.  Written by Platform Admin's planner; READ by
      //   the teacher + parent apps to know what to surface.
      deployments: {},
      // completions[school_id]['<phase>|<audience>|<studentId>|<assessId>'] =
      //   { by, at }.  Written when a teacher/parent/student finishes one item;
      //   the source of truth for every completion % across all four apps.
      completions: {},
      staff: {},              // school_id -> [{ name, email, role:'coordinator'|'teacher', section_id }]  (display names)
      createdSchools: [],     // ids of schools made via createSchoolFull (portfolio hydration)
      // Sign-in accounts provisioned by the Platform Admin "New invitation" flow.
      // email(lower) -> { email, role, school_id, tempPassword, password, mustReset,
      //   status:'invited'|'active', invitedBy, createdAt, activatedAt }
      accounts: {},
      // outcomes[school_id][student_id] = [{ key,name,group,pct,band,baseline,mid,post,
      //   teacher,parent,student,gap }]. Prototype SEL scores, auto-generated the first
      //   time a created school's dashboard is opened; a developer swaps this for real
      //   scored-assessment results. Completion (WHO) gates which points are shown.
      outcomes: {},
    };
  }
  function read(){
    try { var raw = localStorage.getItem(STORE_KEY); if(raw){ var db=JSON.parse(raw); if(db&&db.seedVer===SEED_VER) return db; } }
    catch(e){}
    return null;
  }
  function write(db){ try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch(e){} return db; }

  /* ---------- seed from the dummy dataset (window.TILLI_SCHOOL) ---------- */
  function seedFromSchool(){
    var db = blankDB();
    var SRC = window.TILLI_SCHOOL;
    if (!SRC) return write(db);   // no dataset loaded yet — empty but valid

    var sc = SRC.school;
    db.schools[sc.id] = {
      school_id: sc.id, name: sc.name, board: sc.board || 'CBSE',
      verified: true,                 // Tilli verified this demo school (spec A1)
      status: 'active',
      claimMethod: 'code',            // spec §9.1 per-school setting: default to claim code
    };

    (SRC.sections||[]).forEach(function(s){
      db.sections[s.id] = { section_id:s.id, school_id:sc.id, grade:s.grade, section:s.section, name:s.name, teacherId:s.teacherId };
    });

    // Teacher memberships — each seeded teacher is scoped to THEIR section only (spec A3).
    (SRC.teachers||[]).forEach(function(t){
      var sec = (SRC.sections||[]).find(function(s){ return s.teacherId===t.id; });
      db.teacherMemberships.push({ user_id: low(t.email), school_id: sc.id, section_ids: sec?[sec.id]:[], status:'active' });
    });

    // Mock Admin + Principal so the Flow-C guards are testable in the data layer.
    // (No admin UI in v1 — these exist purely so role checks resolve.)
    db.adminMemberships.push({ user_id:'admin@littlesprouts.edu',     school_id:sc.id, role:'admin',          status:'active' });
    db.adminMemberships.push({ user_id:'principal@littlesprouts.edu', school_id:sc.id, role:'principal_view', status:'active' });

    // Students — one canonical record per (school_id, student_id). student_id = admission no.
    (SRC.students||SRC.roster||[]).forEach(function(r){
      var secDef = (SRC.sections||[]).find(function(s){ return s.grade===r.grade && s.section===r.section; });
      var rec = {
        student_id: up(r.adm), school_id: sc.id,
        section_id: secDef ? secDef.id : null,
        first: r.first, last: r.last, name: r.first+' '+r.last,
        grade: r.grade, section: r.section, gender: r.gender,
        dob: makeDob(r.adm, r.grade),
        claimCode: makeClaimCode(r.adm),
        parentName: r.parentName || '', parentEmail: low(r.parentEmail||''),
        status: 'active',                       // 'active' | 'left'  (spec §3.2)
        source: 'seed', createdAt: null,
      };
      db.students[keyOf(sc.id, rec.student_id)] = rec;
    });

    // Parent links — the one demo parent, already verified against their children.
    (SRC.parents||[]).forEach(function(p){
      (p.children||[]).forEach(function(adm){
        db.parentLinks.push({ parent_user_id: low(p.email), school_id: sc.id, student_id: up(adm), status:'active', verified_at: 'seed' });
      });
    });

    return write(db);
  }

  function getDB(){
    var db = read() || seedFromSchool();
    // Lazy migration: stores written before the invitation/accounts feature
    // won't carry `accounts`. Add it without bumping SEED_VER (which would wipe
    // created schools).
    if (!db.accounts){ db.accounts = {}; write(db); }
    if (!db.outcomes){ db.outcomes = {}; write(db); }
    return db;
  }

  /* ---------- role resolution (spec §2, §7) ---------- */
  // SERVER-SIDE: role/scope is derived from the authenticated session, never
  // from anything the client sends. Here we look it up in the fake DB.
  function roleOf(db, email, schoolId){
    var e = low(email);
    if (!e) return null;
    var a = db.adminMemberships.find(function(m){ return m.user_id===e && m.school_id===schoolId && m.status==='active'; });
    if (a) return a.role;                        // 'admin' | 'principal_view'
    var t = db.teacherMemberships.find(function(m){ return m.user_id===e && m.school_id===schoolId && m.status==='active'; });
    if (t) return 'teacher';
    if (db.parentLinks.some(function(l){ return l.parent_user_id===e && l.school_id===schoolId && l.status==='active'; })) return 'parent';
    return null;
  }
  function teacherScope(db, email, schoolId){
    var m = db.teacherMemberships.find(function(x){ return x.user_id===low(email) && x.school_id===schoolId && x.status==='active'; });
    return m ? m.section_ids.slice() : [];
  }

  function resolveSchool(nameOrId){
    var db = getDB();
    var q = low(nameOrId);
    var byId = db.schools[nameOrId] || db.schools[low(nameOrId)];
    if (byId) return byId;
    var ids = Object.keys(db.schools);
    for (var i=0;i<ids.length;i++){ if (low(db.schools[ids[i]].name)===q) return db.schools[ids[i]]; }
    return null;
  }

  function newId(prefix){
    // Not security-sensitive — just an opaque handle for the demo.
    return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random()*1e6).toString(36);
  }

  /* ======================================================================
     FLOW A — ROSTER + DEDUPE  (spec §4)
     ====================================================================== */

  // DEMO ONLY — grant the onboarding teacher scope over the section they picked.
  // In the real system a teacher NEVER self-grants scope; it comes from the
  // Admin's invite (spec A3). Replace this with "accept invite" server-side.
  function ensureTeacherScope(email, schoolNameOrId, grade, section){
    var db = getDB();
    var school = resolveSchool(schoolNameOrId);
    if (!school){ return null; }
    var sid = school.school_id;
    // find (or create) a section for this grade+section label
    var secId = 'sec_' + low((grade||'')+'_'+(section||'')).replace(/[^a-z0-9]+/g,'_');
    if (!db.sections[secId]){
      db.sections[secId] = { section_id:secId, school_id:sid, grade:grade||'', section:section||'', name:((grade||'')+' '+(section||'')).trim(), teacherId:null };
    }
    var m = db.teacherMemberships.find(function(x){ return x.user_id===low(email) && x.school_id===sid; });
    if (!m){ m = { user_id:low(email), school_id:sid, section_ids:[], status:'active' }; db.teacherMemberships.push(m); }
    if (m.section_ids.indexOf(secId) < 0) m.section_ids.push(secId);
    m.status = 'active';
    write(db);
    return { school_id:sid, section_id:secId };
  }

  // Sections a teacher is allowed to touch (spec §4 A3/A4 scope).
  function sectionsForTeacher(email, schoolId){
    var db = getDB();
    var ids = teacherScope(db, email, schoolId);
    return ids.map(function(id){ return db.sections[id]; }).filter(Boolean);
  }

  // Roster the actor is entitled to see (verify-before-reveal does NOT apply to
  // a teacher for their own sections — they own that roster). Includes claimCode
  // so the teacher can hand it to the parent.
  function listRoster(email, schoolId, opts){
    var db = getDB(); opts = opts||{};
    var role = roleOf(db, email, schoolId);
    var all = Object.keys(db.students).map(function(k){ return db.students[k]; })
                    .filter(function(s){ return s.school_id===schoolId; });
    var scoped;
    if (role==='admin' || role==='principal_view') scoped = all;         // whole school (spec §7)
    else if (role==='teacher'){ var mine = teacherScope(db, email, schoolId);
      scoped = all.filter(function(s){ return mine.indexOf(s.section_id)>=0; }); }  // own sections only
    else scoped = [];                                                    // parents don't list rosters
    if (!opts.includeLeft) scoped = scoped.filter(function(s){ return s.status!=='left'; });
    return scoped.map(function(s){ return Object.assign({}, s); });
  }

  // SERVER-SIDE (spec A4): dedupe-on-add. All three add-paths (manual / CSV /
  // photo) funnel through here so the guard can't be bypassed.
  //   result: 'created' | 'merged' | 'denied'
  //         | 'name_dup'    -> same name, different admission number (teacher confirms)
  //         | 'id_conflict' -> same admission number, different child (teacher picks owner)
  //   input.force: 'name'    -> create despite a same-name match
  //                'replace'  -> on id_conflict, overwrite the record's identity
  function addStudent(input){
    var db = getDB();
    input = input || {};
    var schoolId = input.school_id;
    var actor    = low(input.actorEmail);
    var role     = roleOf(db, actor, schoolId);
    var sectionId= input.section_id;

    // GUARD: only a teacher (own sections) or admin may create a student (spec §7).
    if (role!=='teacher' && role!=='admin')
      return { ok:false, result:'denied', reason:'not-authorized' };
    if (role==='teacher' && teacherScope(db, actor, schoolId).indexOf(sectionId) < 0)
      return { ok:false, result:'denied', reason:'section-out-of-scope' };  // spec A4 scope

    var sid = up(input.student_id);
    if (!sid) return { ok:false, result:'denied', reason:'missing-student-id' };
    var k = keyOf(schoolId, sid);

    var inName = (norm(input.first)+' '+norm(input.last)).trim();
    var sameName = function(c){ return low(fullName(c)) === low(inName); };

    // 1) EXACT admission-number match (school_id, student_id).
    if (db.students[k]){
      var ex = db.students[k];
      // (a) Same number AND same name -> the same child re-entered (idempotent);
      //     fill any blanks. Same path the teacher takes after choosing REPLACE.
      if (input.force==='replace' || sameName(ex)){
        if (input.force==='replace'){ ex.first = norm(input.first); ex.last = norm(input.last); }
        ['first','last','dob','gender','parentName','parentEmail','section_id','grade','section'].forEach(function(f){
          if (!norm(ex[f]) && norm(input[f])) ex[f] = input[f];
        });
        ex.name = norm(ex.first)+' '+norm(ex.last);
        write(db);
        return { ok:true, result:'merged', student:Object.assign({}, ex) };
      }
      // (b) Same number, DIFFERENT child -> two kids can't share a number. The
      //     teacher picks who keeps it (resolve via force:'replace' or a new id).
      return { ok:true, result:'id_conflict',
               existing:{ name:ex.name, first:ex.first, last:ex.last, student_id:ex.student_id },
               incoming:{ first:norm(input.first), last:norm(input.last), student_id:sid } };
    }

    // 2) SAME NAME as an existing child, but a DIFFERENT admission number.
    //    Often two real children who share a name -> let the teacher confirm with
    //    "Ignore and add" (force:'name' skips this check and creates the record).
    if (input.force!=='name'){
      var candidates = Object.keys(db.students).map(function(x){ return db.students[x]; })
                             .filter(function(s){ return s.school_id===schoolId; });
      for (var i=0;i<candidates.length;i++){
        if (sameName(candidates[i])){
          return { ok:true, result:'name_dup',
                   matched:{ name:candidates[i].name, student_id:candidates[i].student_id },
                   incoming:{ first:norm(input.first), last:norm(input.last), student_id:sid } };
        }
      }
    }

    // 3) Genuinely new -> create ONE canonical record.
    var rec = {
      student_id: sid, school_id: schoolId, section_id: sectionId,
      first: norm(input.first), last: norm(input.last), name: (norm(input.first)+' '+norm(input.last)).trim(),
      grade: input.grade || (db.sections[sectionId]&&db.sections[sectionId].grade) || '',
      section: input.section || (db.sections[sectionId]&&db.sections[sectionId].section) || '',
      gender: input.gender || '', dob: input.dob || '',
      claimCode: makeClaimCode(sid),           // stable code the teacher hands to the parent
      parentName: norm(input.parentName), parentEmail: low(input.parentEmail),
      status:'active', source: input.source||'manual', createdAt: Date.now(),
    };
    db.students[k] = rec; write(db);
    return { ok:true, result:'created', student:Object.assign({}, rec) };
  }

  // Bulk add (CSV / photo OCR rows) — same dedupe guard per row, returns a summary
  // so the UI can show a confirm/review step on bulk import (spec A4 detail).
  function addStudentsBulk(actorEmail, schoolId, sectionId, rows, source){
    var summary = { created:[], merged:[], conflicts:[], denied:[] };
    (rows||[]).forEach(function(r){
      var res = addStudent(Object.assign({ actorEmail:actorEmail, school_id:schoolId, section_id:sectionId, source:source||'csv' }, r));
      if (res.result==='created') summary.created.push(res.student);
      else if (res.result==='merged') summary.merged.push(res.student);
      else if (res.result==='name_dup' || res.result==='id_conflict') summary.conflicts.push(res);
      else summary.denied.push({ row:r, reason:res.reason });
    });
    return { ok:true, summary:summary };
  }

  /* ======================================================================
     FLOW B — SECURE PARENT CLAIM  (spec §5, verify-before-reveal)
     ====================================================================== */

  // B1 — parent enters the child's student_id. REVEAL NOTHING (spec B1,
  // acceptance #6): the response is identical whether or not the id exists.
  function _beginClaim(schoolNameOrId, studentId){
    var db = getDB();
    var school = resolveSchool(schoolNameOrId);
    var sid = up(studentId);
    // Note whether it exists ONLY server-side; never surface it.
    var exists = !!(school && db.students[keyOf(school.school_id, sid)]);
    var challengeId = newId('chal');
    db.claimChallenges[challengeId] = { school_id: school?school.school_id:null, student_id: sid, exists: exists, created: Date.now() };
    write(db);
    // Uniform response — no name, grade, section, or exists/doesn't-exist signal.
    return { ok:true, challengeId: challengeId, next:'second-factor', factor: school ? school.claimMethod : 'code' };
  }

  function _attemptKey(schoolId, sid){ return keyOf(schoolId||'?', sid); }

  // B2 — parent enters the second factor (claim code, or DOB per school setting).
  // SERVER-SIDE: rate-limit + lock; wrong-id and wrong-factor return the SAME
  // generic error; never confirm existence (spec B2 / acceptance #8).
  function _verifyClaim(challengeId, secondFactor){
    var db = getDB();
    var ch = db.claimChallenges[challengeId];
    if (!ch) return { ok:false, error:'expired' };            // challenge unknown/old — restart
    var ak = _attemptKey(ch.school_id, ch.student_id);
    var at = db.attempts[ak] || { count:0, lockedUntil:0 };

    if (at.lockedUntil && Date.now() < at.lockedUntil){
      write(db);
      return { ok:false, error:'locked', retryAt: at.lockedUntil };   // rate-limit lock (allowed to say "locked")
    }

    var GENERIC = { ok:false, error:'mismatch' };             // the ONLY failure the caller can see
    var school  = ch.school_id ? db.schools[ch.school_id] : null;
    var stu     = (ch.school_id) ? db.students[keyOf(ch.school_id, ch.student_id)] : null;

    var pass = false;
    if (stu && stu.status==='active' && school){
      var f = norm(secondFactor);
      var method = school.claimMethod || 'code';
      var codeOk = up(f) === up(stu.claimCode);
      var dobOk  = norm(f) === norm(stu.dob);
      pass = method==='code' ? codeOk : method==='dob' ? dobOk : (codeOk||dobOk);
    }

    if (!pass){
      at.count += 1;
      if (at.count >= MAX_ATTEMPTS){ at.lockedUntil = Date.now() + LOCK_MS; at.count = 0; }
      db.attempts[ak] = at; write(db);
      return GENERIC;                                         // identical for not-found & wrong-factor
    }

    // Success — issue a one-shot claim token; reveal is gated behind THIS.
    db.attempts[ak] = { count:0, lockedUntil:0 };
    var token = newId('claim');
    db.claimTokens[token] = { school_id: ch.school_id, student_id: ch.student_id, created: Date.now() };
    delete db.claimChallenges[challengeId];
    write(db);
    // B3 reveal — only now do we return the child's details, for confirmation.
    return { ok:true, claimToken: token, child: { name:stu.name, first:stu.first, grade:stu.grade, section:stu.section, school:school.name, student_id:stu.student_id } };
  }

  // B3 — parent confirms it's the right child -> create the ParentLink.
  // SERVER-SIDE: a claim LINKS, it never creates a student (spec B3 / acceptance #10).
  function _confirmClaim(claimToken, parentEmail){
    var db = getDB();
    var tk = db.claimTokens[claimToken];
    if (!tk) return { ok:false, error:'expired' };
    var stu = db.students[keyOf(tk.school_id, tk.student_id)];
    if (!stu || stu.status==='left') return { ok:false, error:'unavailable' };
    var e = low(parentEmail);
    var existing = db.parentLinks.find(function(l){ return l.parent_user_id===e && l.school_id===tk.school_id && l.student_id===tk.student_id; });
    if (existing){ existing.status='active'; existing.verified_at = existing.verified_at||Date.now(); }
    else db.parentLinks.push({ parent_user_id:e, school_id:tk.school_id, student_id:tk.student_id, status:'active', verified_at:Date.now() });
    delete db.claimTokens[claimToken];
    write(db);
    return { ok:true, linked:{ student_id:stu.student_id, name:stu.name, grade:stu.grade, section:stu.section } };
  }

  // Children a parent is linked to (active links only). Replaces the old
  // hardcoded/URL-trusting lookup in parent.html (spec §7 "own children only").
  function childrenForParent(parentEmail, schoolId){
    var db = getDB();
    var e = low(parentEmail);
    return db.parentLinks
      .filter(function(l){ return l.parent_user_id===e && l.status==='active' && (!schoolId || l.school_id===schoolId); })
      .map(function(l){ var s = db.students[keyOf(l.school_id, l.student_id)]; return s && s.status!=='left' ? Object.assign({}, s) : null; })
      .filter(Boolean);
  }

  /* ======================================================================
     FLOW C — LIFECYCLE & REVOKE  (spec §6, Admin-only; data-layer only in v1)
     ====================================================================== */

  // SERVER-SIDE: only an Admin may offboard. Student set 'left', parent links
  // revoked, record RETAINED (never deleted) — spec §6 / acceptance #11, #13.
  function offboardStudent(actorEmail, schoolId, studentId){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var s = db.students[keyOf(schoolId, studentId)];
    if (!s) return { ok:false, error:'not-found' };
    s.status = 'left';
    db.parentLinks.forEach(function(l){ if (l.school_id===schoolId && l.student_id===up(studentId)) l.status='revoked'; });
    write(db);
    return { ok:true, student_id:s.student_id, status:'left' };
  }

  // SERVER-SIDE: Admin-only. Link revoked; student record untouched (spec §6).
  function revokeParentLink(actorEmail, schoolId, studentId, parentEmail){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var l = db.parentLinks.find(function(x){ return x.school_id===schoolId && x.student_id===up(studentId) && x.parent_user_id===low(parentEmail) && x.status==='active'; });
    if (!l) return { ok:false, error:'not-found' };
    l.status = 'revoked'; write(db);
    return { ok:true };
  }

  // SERVER-SIDE: Admin-only. Move a departing teacher's sections to another
  // teacher; roster/student data stays with the school (spec §6 / acceptance #12).
  function reassignTeacher(actorEmail, schoolId, fromEmail, toEmail, sectionIds){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var from = db.teacherMemberships.find(function(m){ return m.user_id===low(fromEmail) && m.school_id===schoolId; });
    var to   = db.teacherMemberships.find(function(m){ return m.user_id===low(toEmail) && m.school_id===schoolId; });
    if (!from) return { ok:false, error:'from-not-found' };
    if (!to){ to = { user_id:low(toEmail), school_id:schoolId, section_ids:[], status:'active' }; db.teacherMemberships.push(to); }
    var move = (sectionIds && sectionIds.length) ? sectionIds : from.section_ids.slice();
    move.forEach(function(id){ if (to.section_ids.indexOf(id)<0) to.section_ids.push(id); var i=from.section_ids.indexOf(id); if(i>=0) from.section_ids.splice(i,1); });
    if (from.section_ids.length===0) from.status='revoked';   // departed teacher's access revoked
    write(db);
    return { ok:true, from:from.section_ids, to:to.section_ids };
  }

  /* ======================================================================
     FLOW A — INVITES & VERIFICATION  (spec §4 A1–A3, closed trust chain)
     Data-layer only in v1 (no admin/Tilli UI yet).
     ====================================================================== */

  // SERVER-SIDE (spec A1): only Tilli staff mark a school verified.
  function verifySchool(actorRole, schoolId){
    var db = getDB();
    if (actorRole !== 'tilli') return { ok:false, error:'not-authorized' };
    if (!db.schools[schoolId]) return { ok:false, error:'not-found' };
    db.schools[schoolId].verified = true; write(db);
    return { ok:true };
  }

  // SERVER-SIDE (spec A2): invite-only, and only into a VERIFIED school.
  function inviteAdmin(actorRole, schoolId, email){
    var db = getDB();
    if (actorRole !== 'tilli') return { ok:false, error:'not-authorized' };
    var sc = db.schools[schoolId];
    if (!sc || !sc.verified) return { ok:false, error:'school-not-verified' };  // no admin into an unverified school
    var inv = { token:newId('inv'), school_id:schoolId, email:low(email), role:'admin', section_ids:[], used:false };
    db.invites.push(inv); write(db);
    return { ok:true, invite:inv };
  }

  // SERVER-SIDE (spec A3): Admin invites teachers, each scoped to section(s).
  function inviteTeacher(actorEmail, schoolId, email, sectionIds){
    var db = getDB();
    if (roleOf(db, actorEmail, schoolId) !== 'admin') return { ok:false, error:'not-authorized' };
    var inv = { token:newId('inv'), school_id:schoolId, email:low(email), role:'teacher', section_ids:(sectionIds||[]).slice(), used:false };
    db.invites.push(inv); write(db);
    return { ok:true, invite:inv };
  }

  // Accept an invite -> creates the scoped membership. No open self-signup: an
  // account can only join a school through a matching invite token (spec §5, A2/A3).
  function acceptInvite(token, email){
    var db = getDB();
    var inv = db.invites.find(function(x){ return x.token===token && !x.used; });
    if (!inv) return { ok:false, error:'invalid-invite' };
    if (low(email) !== inv.email) return { ok:false, error:'email-mismatch' };
    if (inv.role==='admin') db.adminMemberships.push({ user_id:inv.email, school_id:inv.school_id, role:'admin', status:'active' });
    else db.teacherMemberships.push({ user_id:inv.email, school_id:inv.school_id, section_ids:inv.section_ids.slice(), status:'active' });
    inv.used = true; write(db);
    return { ok:true, role:inv.role, school_id:inv.school_id, section_ids:inv.section_ids };
  }

  /* ======================================================================
     ACCOUNTS — Platform Admin "New invitation" (temp password → first-login reset)
     ----------------------------------------------------------------------
     Real (for the demo) sign-in accounts. createInvite mints a one-time
     temporary password the admin relays to the recipient; on first sign-in
     the account is flagged mustReset, so the login flow forces the user to
     choose their own password (setPassword) before continuing. When the
     invite carries a school + a school-scoped role, we also create the
     matching membership so the app routes them to the right dashboard.
     ====================================================================== */
  function makeTempPassword(){
    // Readable one-time code: 3 letters + 4 digits (no lookalikes).
    var abc='ABCDEFGHJKMNPQRSTUVWXYZ', dig='23456789', out='';
    for (var i=0;i<3;i++) out += abc[Math.floor(Math.random()*abc.length)];
    for (var j=0;j<4;j++) out += dig[Math.floor(Math.random()*dig.length)];
    return out;
  }
  // Map the Platform Admin role label to an internal membership role.
  function membershipRoleFor(label){
    var r = low(label);
    if (r.indexOf('teacher')>=0) return 'teacher';
    if (r.indexOf('school admin')>=0 || r==='admin' || r.indexOf('coordinator')>=0) return 'admin';
    return null;   // Super Admin / School Group Admin → account only, no per-school membership
  }
  function createInvite(input){
    input = input || {};
    var db = getDB();
    var email = low(input.email);
    if (!email) return { ok:false, error:'missing-email' };
    var temp = makeTempPassword();
    var acct = {
      email: email, role: input.role || 'Super Admin', school_id: input.school_id || null,
      tempPassword: temp, password: null, mustReset: true, status: 'invited',
      invitedBy: low(input.invitedBy) || null, createdAt: Date.now(), activatedAt: null,
      // Optional roster metadata carried by teacher invites (grade/section/board),
      // so the school dashboard can render the full invite receipt + user table.
      name: input.name || null, grade: input.grade || null,
      section: input.section || null, board: input.board || null,
    };
    db.accounts[email] = acct;

    // Best-effort: give a school-scoped invite the membership its dashboard needs
    // so first login routes correctly (created schools resolve role via roleOf).
    var mRole = membershipRoleFor(acct.role);
    if (acct.school_id && mRole==='admin' && !db.adminMemberships.some(function(m){ return m.user_id===email && m.school_id===acct.school_id; }))
      db.adminMemberships.push({ user_id:email, school_id:acct.school_id, role:'admin', status:'active' });
    if (acct.school_id && mRole==='teacher' && !db.teacherMemberships.some(function(m){ return m.user_id===email && m.school_id===acct.school_id; }))
      db.teacherMemberships.push({ user_id:email, school_id:acct.school_id, section_ids:[], status:'active' });

    write(db);
    return { ok:true, email:email, tempPassword:temp, role:acct.role, school_id:acct.school_id,
      name:acct.name, grade:acct.grade, section:acct.section, board:acct.board, createdAt:acct.createdAt };
  }
  function getAccount(email){ var a = getDB().accounts[low(email)]; return a ? Object.assign({}, a) : null; }
  function listAccounts(){ var db = getDB(); return Object.keys(db.accounts).map(function(k){ return Object.assign({}, db.accounts[k]); }); }
  // Validate a sign-in attempt. Returns { ok, mustReset } on success. Only
  // accounts we minted are enforced here; the loose demo default lives in the
  // login flow for everyone else.
  function checkPassword(email, pw){
    var a = getDB().accounts[low(email)];
    if (!a) return { ok:false, error:'no-account' };
    var want = a.mustReset ? a.tempPassword : a.password;
    if (want == null) return { ok:false, error:'no-password' };
    if (norm(pw) !== want) return { ok:false, error:'mismatch' };
    return { ok:true, mustReset:!!a.mustReset, role:a.role, school_id:a.school_id };
  }
  // First-login reset (or any later change): store the user's own password and
  // clear the one-time temp + mustReset flag.
  function setPassword(email, newPw){
    var db = getDB();
    var a = db.accounts[low(email)];
    if (!a) return { ok:false, error:'no-account' };
    if (norm(newPw).length < 6) return { ok:false, error:'too-short' };
    a.password = norm(newPw); a.tempPassword = null; a.mustReset = false;
    a.status = 'active'; a.activatedAt = a.activatedAt || Date.now();
    write(db);
    return { ok:true };
  }

  /* ---------- read helpers the UI needs ---------- */
  function getStudent(schoolId, studentId){ var db=getDB(); var s=db.students[keyOf(schoolId,studentId)]; return s?Object.assign({},s):null; }
  function schoolSettings(schoolNameOrId){ var sc=resolveSchool(schoolNameOrId); return sc?{ claimMethod:sc.claimMethod, verified:sc.verified }:null; }
  function reviewQueue(actorEmail, schoolId){ var db=getDB(); if(roleOf(db,actorEmail,schoolId)!=='admin') return []; return db.reviewQueue.filter(function(f){return f.school_id===schoolId;}); }

  /* ======================================================================
     NEW — FULL SCHOOL MATERIALIZATION  (Platform Admin "Add school")
     ----------------------------------------------------------------------
     The Add-School wizard captures grade/section *counts* only. To let the
     teacher & parent apps actually run assessments, a created school needs a
     real roster: named students with admission numbers + claim codes, one
     teacher per section, and a coordinator. We generate that deterministically
     (stable across reloads via a per-school seeded RNG) and write it straight
     into the shared DB so every other app can consume it.
     ====================================================================== */
  function slugify(s){ return low(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'school'; }
  // Deterministic per-school RNG so the same wizard input always yields the
  // same roster (names/adm numbers) — no surprises on reload.
  function schoolRng(seedStr){ var s = hashStr(seedStr) || 1; return function(){ s = (Math.imul(s,1664525) + 1013904223) >>> 0; return s/4294967296; }; }
  function makeJoinCode(schoolId){
    var abc='ABCDEFGHJKMNPQRSTUVWXYZ23456789', h=seeded(schoolId,'join'), out='';
    for(var i=0;i<6;i++){ out+=abc[h%abc.length]; h=Math.floor(h/abc.length) ^ (h<<3); h>>>=0; }
    return out;
  }

  // input: { name, board, city, country, grades:[{grade, students, sections:[{name,students}]}],
  //          admin:{name,email} }  (shape produced by the wizard's draft object)
  // Returns a runbook-friendly summary (codes the user needs to click through).
  function createSchoolFull(input){
    input = input || {};
    var db = getDB();
    var name = norm(input.name) || 'New School';
    var baseId = slugify(name), id = baseId, n = 1;
    while (db.schools[id]) { id = baseId + '-' + (++n); }
    var R = schoolRng(id);

    var code = (up(name).replace(/[^A-Z]/g,'').slice(0,4) || 'SCHL');
    while (code.length < 4) code += 'X';
    code = code + '-' + (1000 + Math.floor(R()*9000));
    var joinCode = makeJoinCode(id);

    db.schools[id] = {
      school_id:id, name:name, board:input.board||'CBSE',
      city:input.city||'', country:input.country||'',
      verified:true, status:'active', claimMethod:'code',
      joinCode:joinCode, code:code, source:'created', createdAt:Date.now(),
    };
    db.staff[id] = [];

    // Coordinator (school admin) — from the wizard, or generated.
    var coordEmail = low(input.admin && input.admin.email) || ('coordinator@' + baseId + '.edu');
    var coordName  = norm(input.admin && input.admin.name) || 'School Coordinator';
    db.adminMemberships.push({ user_id:coordEmail, school_id:id, role:'admin', name:coordName, status:'active' });
    db.staff[id].push({ name:coordName, email:coordEmail, role:'coordinator', section_id:null });

    // Normalise grades: a grade with no explicit sections but a count becomes
    // one section 'A' carrying that count.
    var grades = (input.grades||[]).map(function(g){
      var secs = (g.sections||[]).slice();
      if (!secs.length && (parseInt(g.students,10)||0) > 0) secs = [{ name:'A', students:parseInt(g.students,10)||0 }];
      return { grade:g.grade, sections:secs };
    }).filter(function(g){ return g.grade && g.sections.length; });

    var teachers = [];
    grades.forEach(function(g){
      g.sections.forEach(function(sec){
        var secId = 'sec_' + id + '_' + slugify(g.grade + '_' + sec.name);
        // Sections are created WITHOUT a teacher. Teachers don't exist until a
        // Tilli/school admin invites one (inviteTeacher) or a teacher self-joins
        // with the school code (resolveJoinCode → ensureTeacherScope). The old
        // "one teacher per section" auto-seed was removed per product rule.
        db.sections[secId] = { section_id:secId, school_id:id, grade:g.grade, section:sec.name,
          name:(g.grade+' '+sec.name).trim(), teacherId:null };

        // Students are NOT seeded here either — the section is created empty so
        // the coordinator can add students via the roster / CSV flow and
        // experience the real onboarding. The wizard's per-section count only
        // sizes the section for planning; it doesn't fabricate placeholder rows.
      });
    });

    db.deployments[id] = {};
    db.completions[id] = {};
    if (db.createdSchools.indexOf(id) < 0) db.createdSchools.push(id);
    write(db);

    // A few claim samples for the runbook (first student of each section).
    var claimSamples = Object.keys(db.students).map(function(k){ return db.students[k]; })
      .filter(function(s){ return s.school_id===id; }).slice(0,6)
      .map(function(s){ return { adm:s.student_id, name:s.name, grade:s.grade, section:s.section, claimCode:s.claimCode }; });

    return { ok:true, school_id:id, name:name, code:code, joinCode:joinCode,
      claimMethod:'code',
      coordinator:{ name:coordName, email:coordEmail },
      teachers:teachers,
      studentCount:Object.keys(db.students).filter(function(k){ return db.students[k].school_id===id; }).length,
      claimSamples:claimSamples };
  }

  // Teacher self-join by the school join code (spec: teacher enters code, is
  // added as staff). Returns the school so the app can route to it. Section
  // scope is granted separately (ensureTeacherScope) when they pick a class.
  function resolveJoinCode(codeStr){
    var db = getDB(); var q = up(codeStr);
    var ids = Object.keys(db.schools);
    for (var i=0;i<ids.length;i++){ if (up(db.schools[ids[i]].joinCode||'')===q) return Object.assign({}, db.schools[ids[i]]); }
    return null;
  }
  function listSchools(){ var db=getDB(); return Object.keys(db.schools).map(function(k){ return Object.assign({}, db.schools[k]); }); }
  function staffFor(schoolId){ var db=getDB(); return (db.staff[schoolId]||[]).slice(); }
  // Unscoped roster for portfolio / coordinator DISPLAY (not a security path —
  // parent claim + teacher scope still go through the guarded functions above).
  function studentsForSchool(schoolId, opts){ var db=getDB(); opts=opts||{};
    return Object.keys(db.students).map(function(k){ return db.students[k]; })
      .filter(function(s){ return s.school_id===schoolId && (opts.includeLeft || s.status!=='left'); })
      .map(function(s){ return Object.assign({}, s); }); }
  // Grade/section structure + counts, for the org portfolio hub.
  function schoolStats(schoolId){
    var secs = sectionsForSchool(schoolId);
    var studs = studentsForSchool(schoolId);
    var byGrade = {};
    secs.forEach(function(sec){
      (byGrade[sec.grade] = byGrade[sec.grade] || []).push({ name:sec.section, id:sec.section_id,
        students: studs.filter(function(s){ return s.section_id===sec.section_id; }).length });
    });
    var grades = Object.keys(byGrade).map(function(g){ return { grade:g, sections:byGrade[g] }; });
    var staff = staffFor(schoolId);
    return { students:studs.length, sections:secs.length, grades:grades,
      staff:staff.length, teachers:staff.filter(function(x){return x.role==='teacher';}).length,
      coordinator: (staff.find(function(x){return x.role==='coordinator';})||null) };
  }
  function sectionsForSchool(schoolId){ var db=getDB(); return Object.keys(db.sections).map(function(k){ return db.sections[k]; }).filter(function(s){ return s.school_id===schoolId; }).map(function(s){ return Object.assign({},s); }); }
  // Resolve a section by grade+section name, creating it (empty, no teacher) if it
  // doesn't exist. Used by the roster/CSV import so students land under a real
  // section even for grade/section combos the wizard didn't pre-create.
  function ensureSection(schoolId, grade, section){
    var db = getDB(); grade = norm(grade); section = norm(section);
    var found = Object.keys(db.sections).map(function(k){ return db.sections[k]; })
      .filter(function(s){ return s.school_id===schoolId && low(s.grade)===low(grade) && low(s.section||'')===low(section); })[0];
    if (found) return found.section_id;
    var secId = 'sec_' + schoolId + '_' + slugify(grade + '_' + (section||'na'));
    if (!db.sections[secId]){
      db.sections[secId] = { section_id:secId, school_id:schoolId, grade:grade, section:section,
        name:(grade+' '+(section||'')).trim(), teacherId:null };
      write(db);
    }
    return secId;
  }

  /* ======================================================================
     NEW — ASSESSMENT DEPLOYMENT + COMPLETION  (the end of the flow)
     ====================================================================== */
  function depKey(phase, audience){ return phase + '|' + audience; }
  function compKey(phase, audience, studentId, assessId){ return phase + '|' + audience + '|' + up(studentId) + '|' + assessId; }

  // Platform Admin deploys one phase/audience lane (Baseline|Teacher, etc.).
  function deployPhase(schoolId, phase, audience, opts){
    var db = getDB(); opts = opts||{};
    if (!db.deployments[schoolId]) db.deployments[schoolId] = {};
    var k = depKey(phase, audience);
    db.deployments[schoolId][k] = {
      phase:phase, audience:audience, deployed:true, status:'Live',
      window:opts.window||'', start:opts.start||'', end:opts.end||'',
      assessments:(opts.assessments||[]).slice(),
      deployedAt:Date.now(), endedAt:null,
    };
    write(db);
    return Object.assign({}, db.deployments[schoolId][k]);
  }
  function endPhase(schoolId, phase, audience){
    var db = getDB(); var k = depKey(phase, audience);
    var d = db.deployments[schoolId] && db.deployments[schoolId][k];
    if (!d) return null;
    d.status = 'Ended'; d.endedAt = Date.now(); write(db);
    return Object.assign({}, d);
  }
  function undeployPhase(schoolId, phase, audience){
    var db = getDB(); var k = depKey(phase, audience);
    if (db.deployments[schoolId]) { delete db.deployments[schoolId][k]; write(db); }
    return true;
  }
  function getDeployments(schoolId){
    var db = getDB(); var m = db.deployments[schoolId]||{};
    return Object.keys(m).map(function(k){ return Object.assign({}, m[k]); });
  }
  // What a teacher/parent should see: live (or ended) lanes for their audience.
  function deploymentsFor(schoolId, audience, opts){
    opts = opts||{};
    return getDeployments(schoolId).filter(function(d){
      return d.audience===audience && (opts.includeEnded ? true : d.status==='Live');
    });
  }

  // A teacher/parent/student finishes one assessment item for one student.
  function markComplete(schoolId, phase, audience, studentId, assessId, byEmail){
    var db = getDB();
    if (!db.completions[schoolId]) db.completions[schoolId] = {};
    db.completions[schoolId][compKey(phase, audience, studentId, assessId)] = { by:low(byEmail||''), at:Date.now() };
    write(db);
    return true;
  }
  function isComplete(schoolId, phase, audience, studentId, assessId){
    var db = getDB();
    return !!(db.completions[schoolId] && db.completions[schoolId][compKey(phase, audience, studentId, assessId)]);
  }
  // Completion for a lane, over a given set of student ids (the scope that must
  // respond). expected = students × assessments in the lane.
  function completionStats(schoolId, phase, audience, studentIds){
    var db = getDB();
    var dep = db.deployments[schoolId] && db.deployments[schoolId][depKey(phase, audience)];
    var assessments = (dep && dep.assessments) || [];
    var ids = studentIds || [];
    var expected = ids.length * assessments.length;
    var done = 0;
    ids.forEach(function(sid){ assessments.forEach(function(a){ if (isComplete(schoolId, phase, audience, sid, a.id)) done++; }); });
    return { done:done, expected:expected, pct: expected ? Math.round(done*100/expected) : 0,
      assessments:assessments.length, students:ids.length,
      status: dep ? dep.status : 'Not deployed' };
  }

  /* ======================================================================
     NEW — PROTOTYPE SEL OUTCOMES (auto-generated; local only)
     ----------------------------------------------------------------------
     Created schools carry a real roster + real completion but no scored
     results. For the working prototype we synthesize per-student, per-skill
     scores (baseline/mid/post + teacher/parent/student perspectives) with the
     SAME deterministic algorithm the demo dataset uses (school-data.js
     buildSkills), so a created school's dashboard reads exactly like the demo
     one. Scores are generated once and persisted to localStorage; a developer
     replaces genSkills()/outcomesForSchool() with real assessment results.
     pointStatusFor() gates WHICH points are shown, from REAL completion — a
     point becomes 'complete' only once its phase is fully completed (or ended).
     ====================================================================== */
  function _hashStr(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function _mulberry32(a){ return function(){ a|=0; a=(a+0x6d2b79f5)|0; var t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
  function _clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }
  function _band(p){ return p<34?'seedling':p<67?'sprouting':'blooming'; }
  // Mirror of school-data.js buildSkills(): a plausible year-long trajectory
  // (baseline < mid < post, with per-skill jitter) + 3 rater perspectives,
  // seeded off the student id so every reload is identical.
  function genSkills(student, skills){
    var first = student.first || String(student.name||'').split(' ')[0] || student.student_id || '';
    var seedId = student.student_id || student.adm || first;
    var rndS = _mulberry32(_hashStr(first+':garden'));
    var base = 40 + rndS()*26; var post = {};
    skills.forEach(function(sk){ post[sk.key] = Math.round(_clamp(base+(rndS()-0.5)*60,6,98)); });
    var rnd = _mulberry32(_hashStr(seedId+':assess'));
    return skills.map(function(sk){
      var p = post[sk.key];
      var growth = Math.round(rnd()*22);
      var mid = _clamp(p-Math.round(growth*0.55),2,99);
      var pre = _clamp(mid-Math.round(growth*0.45),2,99);
      var teacher = _clamp(p+Math.round((rnd()-0.5)*12),2,100);
      var parent  = _clamp(p+Math.round((rnd()-0.4)*22),2,100);
      var studentP= _clamp(p+Math.round((rnd()-0.55)*26),2,100);
      return { key:sk.key, name:sk.name, group:sk.group, pct:p, band:_band(p),
        baseline:pre, mid:mid, post:p, teacher:teacher, parent:parent, student:studentP,
        gap:Math.max(teacher,parent,studentP)-Math.min(teacher,parent,studentP) };
    });
  }
  // Generate (once) + persist + return outcomes for every current student.
  // `skills` is the 12-skill catalogue (passed in so this layer needn't own it).
  function outcomesForSchool(schoolId, skills){
    if (!skills || !skills.length) return (getDB().outcomes||{})[schoolId] || {};
    var db = getDB(); db.outcomes = db.outcomes || {};
    var store = db.outcomes[schoolId] = db.outcomes[schoolId] || {};
    var changed = false;
    studentsForSchool(schoolId).forEach(function(s){
      if (!store[s.student_id]){ store[s.student_id] = genSkills(s, skills); changed = true; }
    });
    if (changed) write(db);
    return store;
  }
  // Per assessment point (baseline/midline/endline) → 'upcoming'|'open'|'complete',
  // derived from REAL deployments + completion. 'complete' (bands appear) only when
  // every deployed lane of that phase is 100% complete, or the phase was ended.
  function pointStatusFor(schoolId){
    var ids = studentsForSchool(schoolId).map(function(s){ return s.student_id; });
    var db = getDB(); var deps = db.deployments[schoolId] || {};
    var PH = [['baseline','Baseline'],['midline','Midline'],['endline','Endline']];
    var AUD = ['Teacher','Parent','Direct Assessment'];
    var out = {};
    PH.forEach(function(pr){
      var lanes = AUD.map(function(a){ return deps[pr[1]+'|'+a]; }).filter(Boolean);
      if (!lanes.length){ out[pr[0]] = 'upcoming'; return; }
      // 'complete' (bands appear) as soon as ANY deployed lane is ended or 100%
      // complete — so one audience finishing (e.g. a teacher bulk-marking their
      // class) publishes that point, rather than needing every lane to finish.
      var done = lanes.some(function(d){
        if (d.status==='Ended') return true;
        var c = completionStats(schoolId, pr[1], d.audience, ids);
        return c.expected>0 && c.done>=c.expected;
      });
      out[pr[0]] = done ? 'complete' : 'open';
    });
    return out;
  }

  /* ---------- dev utilities ---------- */
  function reset(){ try{ localStorage.removeItem(STORE_KEY); }catch(e){} return seedFromSchool(); }
  function _dump(){ return getDB(); }

  /* ---------- public surface ---------- */
  window.TilliAPI = {
    // Flow A — roster
    ensureTeacherScope: ensureTeacherScope,   // DEMO helper (see note above)
    sectionsForTeacher: sectionsForTeacher,
    listRoster: listRoster,
    addStudent: addStudent,
    addStudentsBulk: addStudentsBulk,
    reviewQueue: reviewQueue,
    // Flow B — parent claim (verify before reveal)
    beginClaim: function(schoolNameOrId, studentId){ return _beginClaim(schoolNameOrId, studentId); },
    verifyClaim: function(challengeId, secondFactor){ return _verifyClaim(challengeId, secondFactor); },
    confirmClaim: function(claimToken, parentEmail){ return _confirmClaim(claimToken, parentEmail); },
    childrenForParent: childrenForParent,
    // Flow C — lifecycle (Admin-only)
    offboardStudent: offboardStudent,
    revokeParentLink: revokeParentLink,
    reassignTeacher: reassignTeacher,
    // Flow A — invites / verification
    verifySchool: verifySchool,
    inviteAdmin: inviteAdmin,
    inviteTeacher: inviteTeacher,
    acceptInvite: acceptInvite,
    // Accounts — Platform Admin invitation → temp password → first-login reset
    createInvite: createInvite,
    getAccount: getAccount,
    listAccounts: listAccounts,
    checkPassword: checkPassword,
    setPassword: setPassword,
    // reads + config
    getStudent: getStudent,
    schoolSettings: schoolSettings,
    resolveSchool: function(x){ var s=resolveSchool(x); return s?Object.assign({},s):null; },
    roleOf: function(email, schoolId){ return roleOf(getDB(), email, schoolId); },
    // NEW — full school creation + directory (Platform Admin "Add school")
    createSchoolFull: createSchoolFull,
    resolveJoinCode: resolveJoinCode,
    listSchools: listSchools,
    staffFor: staffFor,
    sectionsForSchool: sectionsForSchool,
    ensureSection: ensureSection,
    studentsForSchool: studentsForSchool,
    schoolStats: schoolStats,
    // NEW — assessment lifecycle (deploy → complete → stats)
    deployPhase: deployPhase,
    endPhase: endPhase,
    undeployPhase: undeployPhase,
    getDeployments: getDeployments,
    deploymentsFor: deploymentsFor,
    markComplete: markComplete,
    isComplete: isComplete,
    completionStats: completionStats,
    // NEW — prototype SEL outcomes (local, auto-generated) + point lifecycle
    outcomesForSchool: outcomesForSchool,
    pointStatusFor: pointStatusFor,
    // dev
    reset: reset,
    _dump: _dump,
  };
})();
