# GitHub Actions Workflows

CI/CD for the Feels Flutter app. Two workflows live here:

| File | Trigger | What it does |
|---|---|---|
| `flutter-pr.yml` | PRs touching `feels-flutter/**` | analyze, test, build debug APK, upload as artifact |
| `flutter-release.yml` | Pushes to `main` touching `feels-flutter/**` (and manual dispatch) | analyze, test, build signed AAB, upload to Play Internal via fastlane, archive AAB |

---

## Required secrets

Set all three in **GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret**.

| Secret name | Source file | Notes |
|---|---|---|
| `KEYSTORE_BASE64` | `feels-flutter/android/app/feels-release.jks` | Upload keystore. Do NOT commit. |
| `KEY_PROPERTIES_BASE64` | `feels-flutter/android/key.properties` | Contains `storePassword`, `keyPassword`, `keyAlias`, `storeFile=feels-release.jks`. |
| `GOOGLE_PLAY_JSON_BASE64` | Google Cloud service-account JSON | Service account needs "Release manager" permission on the Play Console app. |

### Generating the base64 blobs

Run these locally (macOS/Linux) from the directory each file lives in:

```bash
# 1. Keystore
cd feels-flutter/android/app
base64 -i feels-release.jks -o keystore.b64

# 2. key.properties
cd feels-flutter/android
base64 -i key.properties -o key-properties.b64

# 3. Google Play service account JSON (wherever you saved it)
base64 -i google-play-service-account.json -o gp.b64
```

Then paste the contents of each `.b64` file into the corresponding GitHub secret.

On macOS, `base64 -i` produces a single-line blob by default, which is what GitHub Actions expects. If you ever see `invalid input` during `base64 --decode`, re-generate without line wrapping:

```bash
base64 -i feels-release.jks | tr -d '\n' > keystore.b64
```

### After uploading, delete the local blobs

```bash
rm keystore.b64 key-properties.b64 gp.b64
```

---

## Manually triggering a release

The release workflow has `workflow_dispatch` enabled, so you can ship a build without pushing a commit.

1. Go to **Actions -> Flutter Release**.
2. Click **Run workflow**.
3. Pick the `main` branch and hit **Run workflow**.

This rebuilds `HEAD` of `main` and uploads a fresh AAB to the internal track as a draft release.

You can also trigger from the CLI with `gh`:

```bash
gh workflow run flutter-release.yml --ref main
gh run watch
```

---

## Rolling back a bad release

Releases uploaded by this workflow land on the **internal** track as `release_status: "draft"`. They are not auto-promoted, so rollback is usually just "don't promote it".

### If the bad build is still a draft (internal)

1. Open **Play Console -> Testing -> Internal testing -> Releases overview**.
2. Find the draft release and click **Discard draft**.
3. Re-run the previous good commit:
   ```bash
   gh workflow run flutter-release.yml --ref <good-sha>
   ```
   (or revert the offending commit on `main` and let CI auto-ship).

### If the bad build was already promoted to a live track

1. In Play Console, open the track it's on (Internal / Closed / Open / Production).
2. Click **Create new release**.
3. Under **App bundles**, click **Add from library** and pick the previous good version code.
4. Save, review, and roll out. Play will deliver the older AAB as a "new" release with a higher version code on the track.

Note: Google Play does not let you downgrade `versionCode`, so rollback always means shipping the old bundle with a bumped version code. The workflow archives every AAB as an artifact for 30 days under the `feels-release-aab-<sha>` name, so you can always grab the previous build from a prior Actions run if you need it.

### Emergency halt

To stop further rollout of a live release while you investigate:

**Play Console -> Production (or whichever track) -> Releases overview -> Halt rollout**.

---

## Local fastlane equivalents

The workflow just wraps what you can run locally from `feels-flutter/android`:

```bash
# Build + upload a fresh AAB to internal testing
fastlane upload_internal

# Full release with metadata/screenshots
fastlane ship
```

See `feels-flutter/android/fastlane/Fastfile` for all available lanes.
