# Roam Budget Mobile

React Native + Expo mobile client for the Travel Budget & Group Expense Tracker.

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

3. Start Metro:

   ```bash
   npm run start
   ```

4. Open Android Studio with `mobile/android`.

For Android emulator API calls, `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080` points to your host machine.

For a faster local emulator APK build on Windows, use:

```bash
cd android
./gradlew.bat --project-cache-dir "$env:TEMP/roam-budget-gradle-cache" :app:assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon --no-watch-fs --console plain
```

The committed Android config keeps all production ABIs enabled by default.

## Offline Sync

The app stores trips, expenses, splits, and settlements in SQLite first. Each local mutation is written to `outbox`; `src/sync/syncEngine.ts` pushes pending events to `/sync/push` and advances the pull cursor from `/sync/pull`.

## Sharing A Trip With A Friend

1. Both people install the same APK and create accounts against the same backend API.
2. Create a trip on your phone.
3. Open `Settings`.
4. Enter your friend's account email in `Share trip`.
5. Tap `Add friend by email`.
6. Your friend opens `Settings` and taps `Refresh from cloud`.

After that, both phones sync through the backend. Offline edits are saved locally first and pushed the next time the phone is online.
