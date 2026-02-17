# TokPlay v9

Paste a TikTok link → server scrapes the audio → plays in your private cloud library.

## Stack
- **Frontend**: Single HTML file on Firebase Hosting (no build step)
- **Backend**: Firebase Cloud Functions (Node.js + yt-dlp + ffmpeg)
- **Database**: Firestore (per-user track metadata)
- **Storage**: Firebase Storage (WAV files)
- **Auth**: Firebase Auth (Google Sign-In)

---

## One-time Setup

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Create a Firebase project
Go to https://console.firebase.google.com → New project → name it (e.g. `tokplay`)

Enable these services in the Firebase Console:
- **Authentication** → Sign-in method → Google → Enable
- **Firestore Database** → Create database → Start in **production mode** → us-central1
- **Storage** → Get started → us-central1
- **Hosting** → Get started

### 3. Connect this project to Firebase
```bash
# In the tokplay-v9/ directory:
firebase use --add
# Select your project, alias it "default"
```

This updates `.firebaserc` with your real project ID.

### 4. Add your Firebase config to the frontend
In the Firebase Console → Project Settings → Your apps → Add Web App (or use existing).

Copy the config object and paste it into `public/index.html` replacing the placeholder:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tokplay-xxxxx.firebaseapp.com",
  projectId: "tokplay-xxxxx",
  storageBucket: "tokplay-xxxxx.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 5. Install function dependencies
```bash
cd functions
npm install
cd ..
```

### 6. Deploy
```bash
# Deploy everything at once
firebase deploy

# Or step by step (recommended first time):
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only functions
firebase deploy --only hosting
```

---

## Local Development

```bash
# Start all emulators (auth, functions, firestore, storage, hosting)
firebase emulators:start
```

Open http://localhost:4000 for the Emulator UI.
Open http://localhost:5000 for the app.

To test the Cloud Function locally, uncomment this line in `public/index.html`:
```javascript
// functions.useEmulator("localhost", 5001);
```

> Note: yt-dlp will make real HTTP requests to TikTok even in the emulator — that's expected.

---

## Updating yt-dlp

TikTok changes its extraction logic frequently. If tracks stop downloading, update the binary:
```bash
curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux" \
     -o functions/bin/yt-dlp
firebase deploy --only functions
```

## Optional: TikTok Cookie Auth

If yt-dlp fails on age-restricted or region-locked TikToks, you can provide cookies:

1. Export your TikTok browser session cookies as `cookies.txt` (Netscape format)
2. Store as a Firebase secret:
   ```bash
   base64 -w 0 cookies.txt | firebase functions:secrets:set TIKTOK_COOKIES_B64
   ```
3. Redeploy functions: `firebase deploy --only functions`

---

## Project Structure
```
tokplay-v9/
├── public/index.html       ← Frontend (edit Firebase config here)
├── functions/
│   ├── src/
│   │   ├── index.ts        ← Cloud Function exports
│   │   ├── processTrack.ts ← yt-dlp + ffmpeg + Storage + Firestore
│   │   └── validateUrl.ts  ← TikTok URL validation + short-link resolution
│   ├── bin/yt-dlp          ← Linux x86_64 binary (committed to repo)
│   └── package.json
├── firestore.rules
├── storage.rules
└── firebase.json
```
