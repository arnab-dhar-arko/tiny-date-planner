# Deploy Roam Budget

This project has two public pieces:

- `roam-budget-api`: Express API + PostgreSQL, used by the Android app for accounts, shared trips, and sync.
- `roam-budget-web`: Static web prototype.

## Option A: Render Blueprint

1. Push this repository to GitHub.
2. Open Render.
3. Choose `New` -> `Blueprint`.
4. Connect the GitHub repo.
5. Render will read `render.yaml` and create:
   - PostgreSQL database
   - backend API service
   - static web service
6. Wait until both services are live.
7. Copy the backend URL, for example:

   ```text
   https://roam-budget-api.onrender.com
   ```

8. Update `mobile/.env`:

   ```env
   EXPO_PUBLIC_API_BASE_URL=https://roam-budget-api.onrender.com
   EXPO_PUBLIC_DEFAULT_CURRENCY=USD
   ```

9. Rebuild the Android APK.

## Android APK For Manual Phone Testing

### Recommended: EAS Cloud APK

After Render gives you the API URL, update `mobile/.env`, then:

```powershell
cd X:\codax\mobile
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Expo will give you a download link for an APK that can be installed on your phone and shared with your friend.

For Play Store:

```powershell
cd X:\codax\mobile
npx eas-cli build -p android --profile production
```

That creates an Android App Bundle (`.aab`).

### Local Debug APK

For a real Android phone:

```powershell
cd X:\codax\mobile\android
.\gradlew.bat --project-cache-dir "$env:TEMP\roam-budget-gradle-cache" :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --no-daemon --no-watch-fs --console plain --max-workers=2
```

Install with USB debugging:

```powershell
C:\Users\arnab\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r X:\codax\mobile\android\app\build\outputs\apk\debug\app-debug.apk
```

Share the same APK with your friend. Both phones must use the same `EXPO_PUBLIC_API_BASE_URL` build.

The local debug APK is mainly for development. For normal use away from your computer, use the EAS `preview` APK.

## Friend Sharing Flow

1. You sign up.
2. Your friend signs up.
3. You create a trip.
4. Open `Settings`.
5. Add your friend's email.
6. Your friend opens `Settings`.
7. Your friend taps `Refresh from cloud`.

Offline changes are saved locally first and pushed when the phone is online.

## Notes

- Render free services may sleep when idle. The first request after sleep can take a minute.
- For Play Store publishing, create a release signing key and use an Android App Bundle (`.aab`) instead of the debug APK.
