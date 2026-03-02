# Building the APK

## ALWAYS BUILD LOCALLY AFTER FRONTEND CHANGES

When you change any file in `feels-app/`, you MUST rebuild the APK.

### Build Command

```bash
cd feels-app
source ~/.nvm/nvm.sh && nvm use default
cd android && ./gradlew assembleRelease
```

APK output: `feels-app/android/app/build/outputs/apk/release/app-release.apk`

### DO NOT

- Push frontend changes without rebuilding APK
- Use `eas build` (cloud) - USE LOCAL BUILD
- Assume git push affects the running APK
- Forget that the emulator runs a COMPILED APK, not live code

### The APK is pre-compiled

- Frontend code changes = REBUILD REQUIRED
- Backend code changes = git push to Railway (no APK rebuild needed)
- The emulator runs the APK file, NOT your source code

### Node/NVM Setup for Gradle

Gradle needs node in PATH. Before building:
```bash
source ~/.nvm/nvm.sh && nvm use default
export PATH="$NVM_BIN:$PATH"
```
