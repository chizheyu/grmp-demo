// Assembles fsdist/ for Firebase Hosting (real-database runtime).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'fsdist');
fs.mkdirSync(dist, { recursive: true });
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
for (const f of ['styles.css','data.js','ai.js','fire.js','views_public.js','views_console.js','app.js'])
  fs.writeFileSync(path.join(dist, f), read(f));
const cfg = JSON.parse(fs.readFileSync(path.join(root,'platform','fb_config.json'),'utf8'));
// The AI proxy endpoint is public (it holds no secret — the key lives in Script
// Properties on the server). Absent file = AI layer stays off, deterministic text only.
// It is the Apps Script deployment (server.gs doPost), which reads LLM_KEY from
// Script Properties. Absent file = AI layer stays off, deterministic text only.
let aiProxy = '';
try { aiProxy = fs.readFileSync(path.join(root,'..','.platform_url'),'utf8').trim(); } catch (e) {}
const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>GRMP Platform — SMC</title>
<link rel="stylesheet" href="styles.css">
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
<script>window.FIREBASE_CONFIG = ${JSON.stringify(cfg)};
window.AI_PROXY_URL = ${JSON.stringify(aiProxy)};</script>
</head><body>
<div id="app"></div>
<div id="overlay-root"></div>
<script src="data.js"></script>
<script src="ai.js"></script>
<script src="fire.js"></script>
<script src="views_public.js"></script>
<script src="views_console.js"></script>
<script src="app.js"></script>
</body></html>`;
fs.writeFileSync(path.join(dist, 'index.html'), html);
console.log('fsdist built:', fs.readdirSync(dist).join(', '));
