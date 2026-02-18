import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import app from "./app";

// Initialize Firebase Admin SDK once
admin.initializeApp();

/**
 * apiFn — Express REST API for TokPlay.
 * Routes:
 *   POST   /api/tracks       → process TikTok URL (yt-dlp + ffmpeg)
 *   DELETE /api/tracks/:id   → delete track from Storage + Firestore
 *   POST   /api/upload       → upload base64 MP3, convert to WAV
 */
export const apiFn = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "1GiB",
    maxInstances: 10,
    secrets: ["TIKTOK_COOKIES_B64"],
  },
  app,
);
