/** GRMP Platform — Apps Script server (staging: shared DB, preset accounts, fictional data).
 *  Store: Drive JSON file (durable) + CacheService (fast) + LockService (serialised writes).
 *  Domain logic: appended below from data.js — single source with the client and the tests.
 */
const DB_FILE = 'grmp_platform_db.json';
const GEMINI_KEY = 'AIzaSyB6OATmFTq1xAZvkAqA1Ch_FJUQHNSoFsw';   // server-side only (never sent to clients)
const CACHE_KEY = 'grmp_db_v1';

/* ---------- storage ---------- */
function dbFile_() {
  const it = DriveApp.getFilesByName(DB_FILE);
  if (it.hasNext()) return it.next();
  const seeded = GRMP_EXPORT.buildSeed();
  return DriveApp.createFile(DB_FILE, JSON.stringify(seeded), 'application/json');
}
function loadDb_() {
  const cache = CacheService.getScriptCache();
  const parts = [];
  for (let i = 0; ; i++) {
    const c = cache.get(CACHE_KEY + '_' + i);
    if (c === null) break;
    parts.push(c);
  }
  if (parts.length) { try { return JSON.parse(parts.join('')); } catch (e) {} }
  const raw = dbFile_().getBlob().getDataAsString();
  const db = JSON.parse(raw);
  cachePut_(raw);
  return db;
}
function cachePut_(raw) {
  const cache = CacheService.getScriptCache();
  const CH = 90000;                       // cache values max ~100KB — chunk
  const items = {};
  let n = 0;
  for (let i = 0; i < raw.length; i += CH) { items[CACHE_KEY + '_' + n] = raw.substr(i, CH); n++; }
  items[CACHE_KEY + '_' + n] = null;      // will fail put on null — handle by removing
  delete items[CACHE_KEY + '_' + n];
  cache.remove(CACHE_KEY + '_' + n);      // terminator: ensure next slot absent
  cache.putAll(items, 21600);
}
function saveDb_(db) {
  const raw = JSON.stringify(db);
  dbFile_().setContent(raw);
  cachePut_(raw);
}

/* ---------- auth ---------- */
function findAccount_(db, u) {
  return (db.config.accounts || []).find(a => a.u === String(u || '').toLowerCase().trim());
}
function identityOf_(db, acct) {
  if (acct.kind === 'admin') {
    const admin = db.config.admins.find(x => x.name === acct.name);
    return { kind: 'admin', name: acct.name, label: acct.label, roles: admin ? admin.roles : [] };
  }
  const p = db.people.find(x => x.id === acct.personId);
  return { kind: 'person', personId: acct.personId, name: p ? p.name : acct.u, label: acct.label, roles: ['participant'] };
}
function sessionIdentity_(db, token) {
  if (!token) return null;
  const s = (db.sessions || {})[token];
  if (!s) return null;
  const acct = findAccount_(db, s.u);
  return acct ? identityOf_(db, acct) : null;
}

function login(u, pass) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const db = loadDb_();
    const acct = findAccount_(db, u);
    if (!acct || acct.pass !== String(pass || '').trim()) return { ok: false, error: 'Wrong account or passcode.' };
    const token = Utilities.getUuid();
    db.sessions = db.sessions || {};
    db.sessions[token] = { u: acct.u, at: db.today };
    saveDb_(db);
    return { ok: true, token: token, identity: identityOf_(db, acct), db: db };
  } finally { lock.releaseLock(); }
}
function logout(token) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const db = loadDb_();
    if (db.sessions && db.sessions[token]) { delete db.sessions[token]; saveDb_(db); }
    return { ok: true };
  } finally { lock.releaseLock(); }
}
function boot(token) {
  const db = loadDb_();
  const id = sessionIdentity_(db, token);
  // staging: the public microsite is browsable without a session (fictional data);
  // gated views are enforced client-side and every privileged action server-side.
  return { ok: true, db: db, identity: id };
}

/* ---------- permission model ---------- */
const PERMS = {
  decide: ['lead'], approvePair: ['lead'], issueCertificates: ['lead'],
  startNewCycle: ['lead'], adminReset: ['lead'], setToday: ['lead', 'coordinator'],
  suggestMatches: ['lead', 'coordinator'], replaceMentor: ['lead', 'coordinator'],
  promoteWaitlist: ['lead', 'coordinator'], toggleAttendance: ['lead', 'coordinator'],
  remindCloseoff: ['lead', 'coordinator'],
  score: ['lead', 'coordinator', 'mentor_reviewer', 'mentee_reviewer'],
  acknowledge: ['participant', 'ADMIN'], ackAllDocs: ['participant', 'ADMIN'],
  completeOrientation: ['participant', 'ADMIN'], confirmReturn: ['participant', 'ADMIN'],
  closeoff: ['participant', 'ADMIN'], submitMidReview: ['participant', 'ADMIN'],
  submitBuilderReflection: ['participant', 'ADMIN'],
  submitApplication: ['*'], raiseConcern: ['*'],
};
function allowed_(id, fn, args, db) {
  const spec = PERMS[fn];
  if (!spec) return false;
  if (spec.includes('*')) return true;
  const isAdmin = id.kind === 'admin';
  if (isAdmin && (spec.includes('ADMIN') || spec.some(r => id.roles.includes(r)))) return true;
  if (id.kind === 'person' && spec.includes('participant')) {
    // participants may only act on themselves / their own pair
    const self = id.personId;
    if (fn === 'closeoff') {
      const pr = db.pairs.find(p => p.id === args[0]);
      return !!pr && pr.menteeId === self;
    }
    return args[0] === self;
  }
  return false;
}

/* ---------- action dispatcher ---------- */
function applyAction(token, fn, args) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const db = loadDb_();
    let id = sessionIdentity_(db, token);
    if (!id) {
      const spec = PERMS[fn];
      if (spec && spec.includes('*')) id = { kind: 'anon', name: 'visitor', label: 'visitor', roles: [] };
      else return { ok: false, error: 'Session expired — sign in again.', db: null };
    }
    if (!allowed_(id, fn, args || [], db)) return { ok: false, error: 'Not permitted for your role (' + id.label + ').', db: db };
    let out;
    if (fn === 'ackAllDocs') {
      ['rules', 'charter', 'governance', 'pdpa', 'coi'].forEach(k => GRMP_EXPORT.D.acknowledge(db, args[0], k));
      out = true;
    } else if (fn === 'adminReset') {
      const fresh = GRMP_EXPORT.buildSeed();
      fresh.sessions = db.sessions;               // keep everyone signed in
      saveDb_(fresh);
      return { ok: true, out: true, db: fresh };
    } else {
      if (typeof GRMP_EXPORT.D[fn] !== 'function') return { ok: false, error: 'Unknown action ' + fn, db: db };
      out = GRMP_EXPORT.D[fn].apply(null, [db].concat(args || []));
    }
    db.audit.push({ at: db.today, actor: id.name || id.label, action: 'rpc:' + fn, entity: (args && args[0]) || '' });
    saveDb_(db);
    return { ok: true, out: out, db: db };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  } finally { lock.releaseLock(); }
}

/* ---------- AI proxy (key stays server-side) ---------- */
function aiGen(token, id, prompt) {
  const db = loadDb_();
  const who = sessionIdentity_(db, token);
  if (!who) return null;
  if (db.aiCache && db.aiCache[id]) return db.aiCache[id];
  try {
    const resp = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
        method: 'post', contentType: 'application/json',
        headers: { 'X-goog-api-key': GEMINI_KEY },
        payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        muteHttpExceptions: true,
      });
    if (resp.getResponseCode() !== 200) return null;
    const j = JSON.parse(resp.getContentText());
    const txt = (((j.candidates || [])[0] || {}).content || {}).parts ?
      j.candidates[0].content.parts.map(p => p.text || '').join('').trim() : '';
    if (!txt) return null;
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const db2 = loadDb_();
      db2.aiCache = db2.aiCache || {};
      db2.aiCache[id] = txt;
      saveDb_(db2);
    } finally { lock.releaseLock(); }
    return txt;
  } catch (e) { return null; }
}

/* ---------- serving ---------- */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('GRMP Platform — SMC (staging)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ==== domain layer appended below (generated from data.js — do not edit here) ==== */
