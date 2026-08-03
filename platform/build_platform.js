// Assembles the Apps Script deployment bundle from the single-source files.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const dist = path.join(__dirname, 'dist');
fs.mkdirSync(dist, { recursive: true });
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// Code.gs = server + domain
fs.writeFileSync(path.join(dist, 'Code.gs'),
  read('platform/server.gs') + '\n' + read('data.js'));

// index.html = shell + inlined styles + scripts (order matters)
const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GRMP Platform — SMC (staging)</title>
<style>
${read('styles.css')}
</style>
<div id="app"></div>
<div id="overlay-root"></div>
<script>
${read('data.js')}
</script>
<script>
${read('ai.js')}
</script>
<script>
${read('views_public.js')}
</script>
<script>
${read('views_console.js')}
</script>
<script>
${read('app.js')}
</script>`;
fs.writeFileSync(path.join(dist, 'index.html'), html);

fs.writeFileSync(path.join(dist, 'appsscript.json'), JSON.stringify({
  timeZone: 'Asia/Singapore',
  exceptionLogging: 'STACKDRIVER',
  runtimeVersion: 'V8',
  webapp: { access: 'ANYONE_ANONYMOUS', executeAs: 'USER_DEPLOYING' },
}, null, 2));
console.log('dist built:', fs.readdirSync(dist).join(', '));
const sz = f => (fs.statSync(path.join(dist, f)).size / 1024).toFixed(0) + 'KB';
console.log('Code.gs', sz('Code.gs'), '| index.html', sz('index.html'));
