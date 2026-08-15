/* GRMP — Firestore adapter (real database, real-time).
   Model: the domain db object is split into top-level "slices"; each slice is one doc in
   collection `state` ({v: <value>}). Mutations run the SAME GRMP.D functions locally,
   then only changed slices are written (JSON diff). onSnapshot streams everyone else's
   changes in live — no refresh needed.
   Staging posture: permissions are enforced app-side (fictional data); production adds
   Firebase Auth + rules/Functions. */

const FIRE = {
  slices: ['people','pairs','reviews','midreviews','menteeMidReviews','endEvaluations','builderReflections','certificates',
           'concerns','emails','audit','events','config','archives','aiCache','today','version'],
  fs: null,
  last: {},            // sliceName -> last JSON string seen (from snapshot or own write)
  ready: false,
  suspended: false,    // guard against re-render storms during batch apply

  init(){
    if(typeof firebase==='undefined' || !window.FIREBASE_CONFIG) return false;
    firebase.initializeApp(window.FIREBASE_CONFIG);
    this.fs = firebase.firestore();
    /* Proxied networks can wedge Firestore's streaming WebChannel (requests hang,
       REST works). Auto-detect falls back to long-polling when that happens. */
    try{ this.fs.settings({experimentalForceLongPolling:true, useFetchStreams:false, merge:true}); }catch(e){}
    return true;
  },

  assemble(docs){
    const db = {};
    docs.forEach(d => { db[d.id] = d.data().v; });
    if(!('people' in db)) return null;            // genuinely empty / mid-seed — wait
    /* Schema evolution: a newly-added slice won't exist in a database written by the
       previous build. Default it locally ([] — every optional slice is a collection)
       instead of returning null, which would hang every client on "Connecting…"
       until someone hand-wiped Firestore. persist() writes the backfill on first use. */
    this.slices.forEach(s => { if(!(s in db)) db[s] = []; });
    return db;
  },

  async seedIfEmpty(){
    const col = this.fs.collection('state');
    const snap = await col.limit(1).get();
    if(!snap.empty) return false;
    const fresh = GRMP.buildSeed();
    fresh.sessions = {};
    const batch = this.fs.batch();
    this.slices.forEach(s => batch.set(col.doc(s), {v: fresh[s]===undefined?null:fresh[s]}));
    await batch.commit();
    return true;
  },

  /* boot: seed if needed, then live-subscribe. onDb(db) fires on every remote change. */
  async boot(onDb){
    await this.seedIfEmpty();
    const col = this.fs.collection('state');
    return new Promise((resolve)=>{
      let first = true;
      col.onSnapshot(snap=>{
        const db = this.assemble(snap.docs);
        if(!db) return;
        snap.docs.forEach(d=>{ this.last[d.id] = JSON.stringify(d.data().v); });
        this.ready = true;
        onDb(db, first);
        if(first){ first=false; resolve(db); }
      }, err=>{ console.error('firestore snapshot error', err); });
    });
  },

  /* persist: diff current db against last-seen slice JSON; batch-write changes.
     `last` is updated ONLY after the commit resolves. The previous version updated it
     optimistically before the write — one failed commit then poisoned the baseline, and
     every later mutation that produced the same JSON diffed as "no change" and was
     silently never written again. That is a data-loss machine, not an optimisation. */
  async persist(db){
    if(!this.ready) return;
    const col = this.fs.collection('state');
    const batch = this.fs.batch();
    const staged = [];
    this.slices.forEach(s=>{
      const now = JSON.stringify(db[s]===undefined?null:db[s]);
      if(this.last[s] !== now){
        batch.set(col.doc(s), {v: db[s]===undefined?null:db[s]});
        staged.push([s, now]);
      }
    });
    if(staged.length){
      await batch.commit();                       // throws → last untouched → retried next persist
      staged.forEach(([s, now])=>{ this.last[s] = now; });
    }
    return staged.length;
  },

  async resetAll(){
    const fresh = GRMP.buildSeed();
    fresh.sessions = {};
    const col = this.fs.collection('state');
    const batch = this.fs.batch();
    this.slices.forEach(s => batch.set(col.doc(s), {v: fresh[s]===undefined?null:fresh[s]}));
    await batch.commit();
    return fresh;
  },
};
if (typeof window!=='undefined') window.FIRE = FIRE;
