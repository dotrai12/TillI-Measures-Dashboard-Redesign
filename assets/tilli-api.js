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
  var SEED_VER    = 3;                 // bump to force a re-seed after data-shape changes

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

  function getDB(){ return read() || seedFromSchool(); }

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

  /* ---------- read helpers the UI needs ---------- */
  function getStudent(schoolId, studentId){ var db=getDB(); var s=db.students[keyOf(schoolId,studentId)]; return s?Object.assign({},s):null; }
  function schoolSettings(schoolNameOrId){ var sc=resolveSchool(schoolNameOrId); return sc?{ claimMethod:sc.claimMethod, verified:sc.verified }:null; }
  function reviewQueue(actorEmail, schoolId){ var db=getDB(); if(roleOf(db,actorEmail,schoolId)!=='admin') return []; return db.reviewQueue.filter(function(f){return f.school_id===schoolId;}); }

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
    // reads + config
    getStudent: getStudent,
    schoolSettings: schoolSettings,
    resolveSchool: function(x){ var s=resolveSchool(x); return s?Object.assign({},s):null; },
    roleOf: function(email, schoolId){ return roleOf(getDB(), email, schoolId); },
    // dev
    reset: reset,
    _dump: _dump,
  };
})();
