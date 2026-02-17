import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { exec, ffmpegPath, parseRMS, getDuration } from "./audioUtils";

const MAX_TRACKS_PER_USER = 25;
const MAX_DURATION_SECS = 5 * 60; // 5 minutes

export interface UploadTrackData {
  audioBase64: string;
  fileName: string;
}

export interface UploadTrackResult {
  trackId: string;
  status: "ready";
}

export async function uploadTrack(
  uid: string,
  data: UploadTrackData
): Promise<UploadTrackResult> {
  const { audioBase64, fileName } = data;

  if (!audioBase64 || typeof audioBase64 !== "string") {
    throw new Error("audioBase64 is required.");
  }
  if (!fileName || typeof fileName !== "string") {
    throw new Error("fileName is required.");
  }

  // Only allow MP3 files
  if (!fileName.toLowerCase().endsWith(".mp3")) {
    throw new Error("Only MP3 files are supported.");
  }

  // Track name = filename without extension
  const trackName = path.basename(fileName, path.extname(fileName)).trim() || "Uploaded Track";

  // Check per-user track limit
  const db = admin.firestore();
  const allTracks = await db
    .collection("users")
    .doc(uid)
    .collection("tracks")
    .count()
    .get();
  if (allTracks.data().count >= MAX_TRACKS_PER_USER) {
    throw new Error(`You've reached the limit of ${MAX_TRACKS_PER_USER} tracks. Delete some tracks to add new ones.`);
  }

  // Create Firestore doc
  const trackRef = db.collection("users").doc(uid).collection("tracks").doc();
  const trackId = trackRef.id;
  const tmpDir = `/tmp/${trackId}`;

  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    // Write uploaded audio to temp file
    const ext = path.extname(fileName) || ".mp3";
    const rawFile = path.join(tmpDir, `raw${ext}`);
    fs.writeFileSync(rawFile, Buffer.from(audioBase64, "base64"));

    // Get duration and enforce limit
    const fullDuration = await getDuration(rawFile);
    if (fullDuration > MAX_DURATION_SECS) {
      throw new Error(`Audio must be under 5 minutes. This file is ${Math.ceil(fullDuration / 60)} minutes long.`);
    }

    // Convert to WAV 44100Hz 16-bit + measure RMS
    const outFile = path.join(tmpDir, "out.wav");
    const { stderr: ffStderr } = await exec(
      ffmpegPath,
      [
        "-i", rawFile,
        "-acodec", "pcm_s16le",
        "-ar", "44100",
        "-af", "astats=metadata=1:reset=1",
        "-y",
        outFile,
      ],
      { cwd: tmpDir }
    );

    const rms = parseRMS(ffStderr);

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const storagePath = `users/${uid}/tracks/${trackId}.wav`;
    const downloadToken = crypto.randomUUID();
    await bucket.upload(outFile, {
      destination: storagePath,
      metadata: {
        contentType: "audio/wav",
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    });

    // Build download URL
    const encodedPath = encodeURIComponent(storagePath);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    // Create Firestore doc as ready
    await trackRef.set({
      name: trackName,
      source: "upload",
      storagePath,
      downloadUrl,
      durationSeconds: fullDuration,
      fullDurationSecs: fullDuration,
      rms,
      status: "ready",
      errorMessage: null,
      ordinal: Date.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { trackId, status: "ready" };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Try to mark as error if doc was created
    await trackRef.update({
      status: "error",
      errorMessage: message.slice(0, 500),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => { /* doc may not exist yet */ });
    throw err;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  }
}
