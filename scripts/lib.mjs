// Shared helpers for the kit scripts. Node 20+, no extra dependencies.
import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ANDROID = path.join(ROOT, 'android');
export const APP_GRADLE = path.join(ANDROID, 'app', 'build.gradle');
export const IS_WIN = process.platform === 'win32';

const c = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
export const color = { green: c(32), yellow: c(33), red: c(31), bold: c(1), dim: c(2) };
export const ok = (msg) => console.log(color.green('✔ ') + msg);
export const warn = (msg) => console.log(color.yellow('▲ ') + msg);
export const info = (msg) => console.log(color.dim('• ') + msg);
export const step = (msg) => console.log('\n' + color.bold('▶ ' + msg));
export function fail(msg, hint) {
  console.error('\n' + color.red('✖ ' + msg));
  if (hint) console.error('  ' + hint);
  process.exit(1);
}

export function readConfig() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'capacitor.config.json'), 'utf8'));
}

/** Run a command, streaming output. Exits the script if it fails. */
export function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    stdio: 'inherit',
    shell: IS_WIN, // needed for npx/.bat on Windows
    env: { ...process.env, ...javaEnv(), ...(opts.env || {}) },
  });
  if (res.status !== 0) fail(`Command failed: ${cmd} ${args.join(' ')}`, opts.hint);
}

// ---------------------------------------------------------------- Java ---

function javaVersionAt(javaHome) {
  const bin = javaHome ? path.join(javaHome, 'bin', IS_WIN ? 'java.exe' : 'java') : 'java';
  try {
    const out = execSync(`"${bin}" -version 2>&1`, { encoding: 'utf8' });
    const m = out.match(/version "(\d+)/);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/** Finds a JDK 21+ (JAVA_HOME, Android Studio's bundled JDK, Homebrew, PATH). */
export function findJava() {
  const candidates = [process.env.JAVA_HOME];
  if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
      '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
      '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    );
    try { candidates.push(execSync('/usr/libexec/java_home -v 21+ 2>/dev/null', { encoding: 'utf8' }).trim()); } catch {}
  } else if (IS_WIN) {
    candidates.push(
      'C:\\Program Files\\Android\\Android Studio\\jbr',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'jbr'),
    );
  } else {
    candidates.push(
      path.join(os.homedir(), 'android-studio', 'jbr'),
      '/opt/android-studio/jbr',
      '/usr/lib/jvm/java-21-openjdk-amd64',
      '/usr/lib/jvm/java-21-openjdk',
    );
  }
  for (const home of candidates.filter(Boolean)) {
    if (!fs.existsSync(home)) continue;
    const v = javaVersionAt(home);
    if (v && v >= 21) return { home, version: v };
  }
  const v = javaVersionAt(null); // whatever "java" is on PATH
  return v ? { home: null, version: v } : null;
}

let cachedJavaEnv;
export function javaEnv() {
  if (cachedJavaEnv) return cachedJavaEnv;
  const j = findJava();
  cachedJavaEnv = j && j.home && j.version >= 21 ? { JAVA_HOME: j.home } : {};
  return cachedJavaEnv;
}

// --------------------------------------------------------- Android SDK ---

export function findAndroidSdk() {
  const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT];
  if (process.platform === 'darwin') candidates.push(path.join(os.homedir(), 'Library', 'Android', 'sdk'));
  else if (IS_WIN) candidates.push(path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'));
  else candidates.push(path.join(os.homedir(), 'Android', 'Sdk'));
  return candidates.find((p) => p && fs.existsSync(path.join(p, 'platform-tools'))) || null;
}

/** Writes android/local.properties so Gradle can always find the SDK. */
export function writeLocalProperties() {
  const sdk = findAndroidSdk();
  if (!sdk || !fs.existsSync(ANDROID)) return;
  const escaped = sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
  fs.writeFileSync(path.join(ANDROID, 'local.properties'), `sdk.dir=${escaped}\n`);
}

// -------------------------------------------------------------- Gradle ---

export function gradle(args, hint) {
  writeLocalProperties();
  const cmd = IS_WIN ? 'gradlew.bat' : './gradlew';
  run(cmd, args, { cwd: ANDROID, hint });
}

export function readVersion() {
  const g = fs.readFileSync(APP_GRADLE, 'utf8');
  return {
    code: Number((g.match(/versionCode\s+(\d+)/) || [])[1]),
    name: (g.match(/versionName\s+"([^"]+)"/) || [])[1],
  };
}
