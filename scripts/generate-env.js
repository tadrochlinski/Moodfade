const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.mjs', '.cjs']);
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.expo']);

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!ignoreDirs.has(name)) walk(full, out);
    } else if (exts.has(path.extname(name)) || name === 'app.json' || name === 'app.config.js') {
      out.push(full);
    }
  }
}

const files = [];
walk(root, files);

const rx = [
  /process\.env\.([A-Z0-9_]+)/g,
  /process\.env\[['"`]([A-Z0-9_]+)['"`]\]/g,
  /(EXPO_PUBLIC_[A-Z0-9_]+)/g,
  /(REACT_NATIVE_[A-Z0-9_]+)/g,
  /(SPOTIFY_[A-Z0-9_]+)/g,
  /(FIREBASE_[A-Z0-9_]+)/g,
];

const vars = new Set();

for (const f of files) {
  let c = '';
  try { c = fs.readFileSync(f, 'utf8'); } catch { continue; }
  for (const r of rx) {
    let m;
    while ((m = r.exec(c))) vars.add(m[1] || m[0]);
  }
}

// spróbuj dodać expo.extra z app.json
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const extra = appJson?.expo?.extra || {};
  for (const k of Object.keys(extra)) {
    if (typeof extra[k] === 'string' && /process\.env\./.test(extra[k])) {
      const name = extra[k].split('process.env.').pop().replace(/[^A-Z0-9_]/g, '');
      if (name) vars.add(name);
    }
  }
} catch {}

const arr = [...vars].filter(Boolean).sort();
const out = [
  '# .env.example generated',
  '# Fill values, do NOT commit real .env',
  '',
  ...arr.map(k => `${k}=__FILL_ME_IN__`)
].join('\n');

fs.writeFileSync(path.join(root, '.env.example'), out, 'utf8');
console.log(`Wrote .env.example with ${arr.length} variables`);
