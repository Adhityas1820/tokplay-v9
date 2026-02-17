import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { processTrack, ProcessTrackData } from "./processTrack";
import { uploadTrack, UploadTrackData } from "./uploadTrack";

// Initialize Firebase Admin SDK once (uses the Cloud Functions runtime service account automatically)
admin.initializeApp();

// ── Allowlist ──────────────────────────────────────────────────────────────
// Only these Google accounts can use the app. Add your friends' Gmail addresses here.
const ALLOWED_EMAILS: string[] = [
  // Add authorized Gmail addresses here, e.g.:
  // "you@gmail.com",
  // "friend@gmail.com",
];

function checkAllowed(email: string | undefined) {
  if (!email || !ALLOWED_EMAILS.includes(email.toLowerCase())) {
    throw new HttpsError(
      "permission-denied",
      "Your account is not authorized to use this app.",
    );
  }
}

/**
 * processTrackFn — Accepts a TikTok URL, scrapes audio via yt-dlp,
 * encodes to WAV, stores in Firebase Storage, and saves metadata to Firestore.
 */
export const processTrackFn = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "1GiB",
    maxInstances: 10,
    secrets: ["TIKTOK_COOKIES_B64"],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    checkAllowed(request.auth.token.email);

    const uid = request.auth.uid;
    const data = request.data as ProcessTrackData;

    if (!data?.tiktokUrl || typeof data.tiktokUrl !== "string") {
      throw new HttpsError("invalid-argument", "tiktokUrl is required.");
    }

    try {
      return await processTrack(uid, data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Processing failed.";
      throw new HttpsError("internal", message);
    }
  },
);

/**
 * uploadTrackFn — Accepts a base64-encoded audio file, converts to WAV,
 * stores in Firebase Storage, and saves metadata to Firestore.
 */
export const uploadTrackFn = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 300,
    memory: "1GiB",
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    checkAllowed(request.auth.token.email);

    const uid = request.auth.uid;
    const data = request.data as UploadTrackData;

    if (!data?.audioBase64 || typeof data.audioBase64 !== "string") {
      throw new HttpsError("invalid-argument", "audioBase64 is required.");
    }
    if (!data?.fileName || typeof data.fileName !== "string") {
      throw new HttpsError("invalid-argument", "fileName is required.");
    }

    try {
      return await uploadTrack(uid, data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      throw new HttpsError("internal", message);
    }
  },
);

/**
 * deleteTrackFn — Deletes a track's WAV file from Storage and its Firestore document.
 */
export const deleteTrackFn = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    checkAllowed(request.auth.token.email);

    const uid = request.auth.uid;
    const { trackId } = request.data as { trackId: string };

    if (!trackId || typeof trackId !== "string") {
      throw new HttpsError("invalid-argument", "trackId is required.");
    }

    const db = admin.firestore();
    const trackRef = db
      .collection("users")
      .doc(uid)
      .collection("tracks")
      .doc(trackId);
    const doc = await trackRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Track not found.");
    }

    const storagePath = doc.data()?.storagePath as string | undefined;

    // Delete Storage file
    if (storagePath) {
      try {
        await admin.storage().bucket().file(storagePath).delete();
      } catch {
        // File may not exist; not fatal
      }
    }

    // Delete Firestore document
    await trackRef.delete();

    return { success: true };
  },
);
