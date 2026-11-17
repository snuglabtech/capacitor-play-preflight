// npm run version:bump [patch|minor|major|x.y.z]
// Every upload to Google Play needs a NEW versionCode. This bumps it by 1 and
// updates the user-visible versionName (default: patch, 1.0.0 → 1.0.1).
import fs from 'node:fs';
import { APP_GRADLE, ok, fail, readVersion } from './lib.mjs';

if (!fs.existsSync(APP_GRADLE)) fail('No android/ folder yet.', 'Run "npx cap add android" first.');

const arg = process.argv[2] || 'patch';
const { code, name } = readVersion();
if (!code || !name) fail('Could not read versionCode/versionName from android/app/build.gradle');

const parts = name.split('.').map(Number);
while (parts.length < 3) parts.push(0);
let next;
if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg;
else if (arg === 'major') next = `${parts[0] + 1}.0.0`;
else if (arg === 'minor') next = `${parts[0]}.${parts[1] + 1}.0`;
else if (arg === 'patch') next = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
else fail(`Unknown argument "${arg}"`, 'Use: patch, minor, major, or an exact version like 2.1.0');

let g = fs.readFileSync(APP_GRADLE, 'utf8');
g = g.replace(/versionCode\s+\d+/, `versionCode ${code + 1}`)
     .replace(/versionName\s+"[^"]+"/, `versionName "${next}"`);
fs.writeFileSync(APP_GRADLE, g);
ok(`Version ${name} (${code}) → ${next} (${code + 1})`);
