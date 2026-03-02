#!/bin/bash
export PATH="/Users/jef/.nvm/versions/node/v24.11.1/bin:$PATH"
export NODE_BINARY="/Users/jef/.nvm/versions/node/v24.11.1/bin/node"
cd "$(dirname "$0")/android"
./gradlew assembleRelease
echo ""
echo "APK location: $(pwd)/app/build/outputs/apk/release/app-release.apk"
