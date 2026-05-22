# Task Tracker

An Expo Router task tracker app based on the provided mobile UI reference.

## Scripts

- `npm run web` starts the app for web preview.
- `npm run start` starts Expo for device preview.
- `npm run typecheck` runs TypeScript checks.
- `npm run eas:init` connects this project to an Expo account for EAS builds.
- `npm run build:android:apk` creates an installable Android APK with the `apk` EAS profile.

## Build Android APK

1. Sign in to Expo:

   ```bash
   npx eas-cli@latest login
   ```

2. Initialize EAS once for this project:

   ```bash
   npm run eas:init
   ```

3. Build the APK:

   ```bash
   npm run build:android:apk
   ```

4. When the build finishes, download the APK from the EAS link and install it on your Android phone.
