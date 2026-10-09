#!/usr/bin/env node
// Fails if credential-shaped strings or server-only secret names appear in the web bundle or in source.
//   node scripts/check-secrets.mjs bundle [--production]   scans apps/web/.next/static after `next build`
//   node scripts/check-secrets.mjs repo                    scans every file git would commit
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const mode = process.argv[2] ?? 'repo';
const production = process.argv.includes('--production');

const CREDENTIAL_PATTERNS = [
  ['AWS access key id', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['OpenAI-style key', /\bsk-[A-Za-z0-9_-]{24,}\b/],
  ['Meta access token', /\bEAA[A-Za-z0-9]{60,}\b/],
  ['Postgres URL with password', /postgres(ql)?:\/\/[^:\s/'"]+:(?!postgres@|estateflow@|password@|p@|\$\{)[^@\s'"]{6,}@(?!localhost|127\.0\.0\.1|db:)/],
];

// Server-only variable names. Their presence in client JS means server code was bundled.
const SERVER_ONLY_NAMES = [
  'AI_API_KEY',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'META_APP_SECRET',
  'RECONSTRUCTION_API_KEY',
  'RECONSTRUCTION_WEBHOOK_SECRET',
  'LOCAL_AUTH_SECRET',
  'DATABASE_URL',
];

const PRODUCTION_FORBIDDEN = [
  ['demo password', /Demo123!/],
];

function walk(dir, filter, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, filter, out);
    else if (filter(full) && st.size < 5_000_000) out.push(full);
  }
  return out;
}

const findings = [];

if (mode === 'bundle') {
  const dir = path.join(root, 'apps/web/.next/static');
  const files = walk(dir, (f) => f.endsWith('.js'));
  if (files.length === 0) {
    console.error('No bundle found. Run `npm run build -w @estateflow/web` first.');
    process.exit(2);
  }
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const [label, re] of CREDENTIAL_PATTERNS) if (re.test(text)) findings.push(`${label} in ${path.relative(root, file)}`);
    for (const name of SERVER_ONLY_NAMES) if (text.includes(name)) findings.push(`server-only name ${name} in ${path.relative(root, file)}`);
    if (production) for (const [label, re] of PRODUCTION_FORBIDDEN) if (re.test(text)) findings.push(`${label} in production bundle ${path.relative(root, file)}`);
  }
  console.log(`Scanned ${files.length} client bundle files${production ? ' (production rules)' : ''}.`);
} else {
  // Files git would commit: tracked plus untracked-but-not-ignored. Ignored local .env files are skipped.
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  const files = listed
    .filter((rel) => !rel.endsWith('package-lock.json') && rel !== 'scripts/check-secrets.mjs')
    .map((rel) => path.join(root, rel))
    .filter((f) => {
      try {
        return statSync(f).isFile() && statSync(f).size < 5_000_000;
      } catch {
        return false;
      }
    });
  for (const file of files) {
    const rel = path.relative(root, file);
    if (rel === '.env' || rel.endsWith('.tfvars') || rel.endsWith('.tfstate')) findings.push(`${rel} must not exist in the repository tree`);
    const text = readFileSync(file, 'utf8');
    for (const [label, re] of CREDENTIAL_PATTERNS) if (re.test(text)) findings.push(`${label} in ${rel}`);
  }
  console.log(`Scanned ${files.length} source files.`);
}

if (findings.length) {
  console.error('Secret check failed:');
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('No secrets found.');
