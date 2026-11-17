// node scripts/doctor.mjs: checks the things that most often break a first Android build.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ANDROID, color, ok, warn, fail, info, readConfig, findJava, findAndroidSdk } from './lib.mjs';

export function doctor({ quiet = false } = {}) {
  let problems = 0;
  const bad = (msg, hint) => { problems++; console.log(color.red('✖ ') + msg + (hint ? '\n    ' + color.dim(hint) : '')); };

  if (!quiet) console.log(color.bold('\nChecking your setup…\n'));

  // Node
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor >= 20) ok(`Node.js ${process.versions.node}`);
  else bad(`Node.js ${process.versions.node} is too old (need 20+)`, 'Install the LTS version from https://nodejs.org');

  // Java
  const java = findJava();
  if (java && java.version >= 21) ok(`Java ${java.version}${java.home ? color.dim(` (${java.home})`) : ''}`);
  else if (java) bad(`Java ${java.version} found, but Android builds need JDK 21+`, 'Easiest fix: install Android Studio (it bundles JDK 21).');
  else bad('Java (JDK 21) not found', 'Install Android Studio (it bundles JDK 21), or set JAVA_HOME.');

  // Android SDK
  const sdk = findAndroidSdk();
  if (sdk) ok(`Android SDK ${color.dim(`(${sdk})`)}`);
  else bad('Android SDK not found', 'Open Android Studio once and finish the setup wizard, or set ANDROID_HOME.');

  // Config
  const cfg = readConfig();
  if (/^com\.example\./.test(cfg.appId)) {
    bad(`appId is still the placeholder "${cfg.appId}"`,
      'Set your own in capacitor.config.json, e.g. "com.yourname.appname". It can NEVER change after you publish.');
  } else if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(cfg.appId)) {
    bad(`appId "${cfg.appId}" is not valid`, 'Use lowercase letters, numbers and dots, e.g. com.yourname.notes');
  } else ok(`appId ${cfg.appId}`);

  if (cfg.appName === 'My App') warn('appName is still "My App" (change it in capacitor.config.json)');
  else ok(`appName "${cfg.appName}"`);

  // Web build output
  const webDir = path.join(ROOT, cfg.webDir || 'dist');
  if (fs.existsSync(path.join(webDir, 'index.html'))) ok(`Web build found in ${cfg.webDir}/`);
  else info(`No web build in ${cfg.webDir}/ yet (run your web build first)`);

  // Android project
  if (fs.existsSync(ANDROID)) ok('Android project exists');
  else info('No android/ folder yet (run "npx cap add android")');

  if (fs.existsSync(path.join(ANDROID, 'keystore.properties'))) ok('Release signing key configured');
  else info('No android/keystore.properties yet (needed for a signed release build)');

  console.log();
  if (problems) console.log(color.red(`${problems} problem(s) to fix first.`));
  else if (!quiet) console.log(color.green('All good. You are ready to build.'));
  return problems;
}

if (process.argv[1]?.endsWith('doctor.mjs')) {
  if (doctor()) fail('Fix the problems above, then run the doctor again.');
}
