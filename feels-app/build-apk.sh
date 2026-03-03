#!/bin/bash
set -e
cd "$(dirname "$0")"
# Ensure node is in PATH - put it FIRST but keep system paths
export PATH="/Users/jef/.nvm/versions/node/v24.11.1/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
cd android
./gradlew assembleRelease
echo ""
echo "APK: $(pwd)/app/build/outputs/apk/release/app-release.apk"
