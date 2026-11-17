# capacitor-play-preflight

Two small Node scripts that catch the boring mistakes before a first Android build of a [Capacitor](https://capacitorjs.com) app:

- **`doctor`** checks your toolchain and config (Node, Java 21+, Android SDK, `appId`)
- **`version:bump`** increments `versionCode` and `versionName` in `android/app/build.gradle`

No dependencies. Plain Node 20+. Tested on macOS (Node 24, JDK 21, Capacitor 8); Windows and Linux paths are written but **not tested yet**, so issues and PRs are welcome.

```text
$ node scripts/doctor.mjs

Checking your setup…

✔ Node.js 24.5.0
✔ Java 21
✔ Android SDK
✖ appId is still the placeholder "com.example.myapp"
    Set your own in capacitor.config.json, e.g. "com.yourname.appname". It can NEVER change after you publish.
• No android/ folder yet (run "npx cap add android")

1 problem(s) to fix first.
```

## Why

Most failed first builds aren't code problems. They're a missing JDK, an SDK Gradle can't find, a leftover `com.example` app ID that becomes permanent once you publish, or an upload rejected because the `versionCode` wasn't increased. These scripts check those in a second instead of after a long Gradle run or a Play Console upload.

## Install

Copy the `scripts/` folder into the root of your Capacitor project and add two lines to `package.json`:

```json
{
  "scripts": {
    "doctor": "node scripts/doctor.mjs",
    "version:bump": "node scripts/version.mjs"
  }
}
```

The files already use the `.mjs` extension, so they run as ES modules even without `"type": "module"`. You can also call them directly with `node scripts/doctor.mjs`.

## Usage

```bash
npm run doctor                  # check toolchain + config
npm run version:bump            # 1.0.0 (1) -> 1.0.1 (2)
npm run version:bump minor      # 1.0.1 -> 1.1.0
npm run version:bump major      # 1.1.0 -> 2.0.0
npm run version:bump 2.4.0      # set an exact versionName
```

`version:bump` always adds 1 to `versionCode` (Google Play needs a strictly higher number for every upload) and updates `versionName` the way you ask.

## What `doctor` checks

| Check | How |
|---|---|
| Node.js 20+ | `process.versions.node` |
| Java 21+ | `JAVA_HOME`, Android Studio's bundled JDK, Homebrew, then `java` on `PATH` |
| Android SDK | `ANDROID_HOME`, `ANDROID_SDK_ROOT`, then the default install locations |
| `appId` | Not the `com.example.*` placeholder, and a valid format (lowercase letters, digits, dots) |
| `appName` | Warns if it's still `My App` |
| Project state | Whether `dist/`, `android/` and `android/keystore.properties` exist (informational) |

Exit code is `1` if there is a problem, so you can use it in CI or as a `prebuild` step.

## What it does NOT do

- It doesn't build, sign, or upload anything.
- It can't know what you already uploaded to Google Play, so it can't tell you a `versionCode` was used elsewhere.
- It doesn't make Google approve your app. Production access for new personal accounts depends on a closed test (currently 12 testers opted in for 14 days; check your Play Console for the current rule).

## Want the rest of the path?

I also made these (they are mine; the scripts here are free and MIT-licensed):

- **Free guide:** the 12-tester / 14-day closed-testing rule, with a day-by-day plan, tester messages and production-access answer examples: https://snuglab.gumroad.com/l/closed-testing
- **Paid kit ($21):** the full set of scripts (one-time setup, icons and splash generation, guided keystore, signed `.aab` build with a versionCode guard) plus a step-by-step guide and Play Console templates: https://snuglab.gumroad.com/l/webapp-to-play

## Contributing

Issues and PRs are welcome, especially reports from **Windows** and **Linux**: what `doctor` printed, and what was wrong. Please include your OS, Node version and `java -version`.

## License

MIT. See [LICENSE](LICENSE).
