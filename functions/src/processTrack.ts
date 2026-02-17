import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { exec, ffmpegPath, parseRMS, getDuration } from "./audioUtils";
import { validateTikTokUrl } from "./validateUrl";

// yt-dlp binary path — bundled in functions/bin/yt-dlp
// __dirname = /workspace/lib at runtime; one ".." reaches /workspace/bin/yt-dlp
const YTDLP_PATH = path.join(__dirname, "..", "bin", "yt-dlp");

// Make yt-dlp executable once per cold start
try {
  fs.chmodSync(YTDLP_PATH, 0o755);
} catch {
  // May fail on Windows dev machines; harmless — Linux runtime is what matters
}

const MAX_TRACKS_PER_USER = 25;

export interface ProcessTrackData {
  tiktokUrl: string;
}

export interface ProcessTrackResult {
  trackId: string;
  status: "ready" | "duplicate";
  duplicateTrackId?: string;
}

export async function processTrack(
  uid: string,
  data: ProcessTrackData
): Promise<ProcessTrackResult> {
  const { tiktokUrl } = data;

  // 1. Validate + resolve URL
  const { resolvedUrl, videoId } = await validateTikTokUrl(tiktokUrl);

  // 2. Check for duplicates
  const db = admin.firestore();
  const existing = await db
    .collection("users")
    .doc(uid)
    .collection("tracks")
    .where("videoId", "==", videoId)
    .limit(1)
    .get();

  if (!existing.empty) {
    return { trackId: existing.docs[0].id, status: "duplicate", duplicateTrackId: existing.docs[0].id };
  }

  // 2b. Check per-user track limit
  const allTracks = await db
    .collection("users")
    .doc(uid)
    .collection("tracks")
    .count()
    .get();
  if (allTracks.data().count >= MAX_TRACKS_PER_USER) {
    throw new Error(`You've reached the limit of ${MAX_TRACKS_PER_USER} tracks. Delete some tracks to add new ones.`);
  }

  // 3. Create Firestore doc with status "processing"
  const trackRef = db.collection("users").doc(uid).collection("tracks").doc();
  const trackId = trackRef.id;

  await trackRef.set({
    tiktokUrl,
    videoId,
    resolvedUrl,
    name: videoId, // placeholder; updated after yt-dlp fetches title
    storagePath: `users/${uid}/tracks/${trackId}.wav`,
    downloadUrl: null,
    durationSeconds: 0,
    fullDurationSecs: 0,
    rms: 0.001,
    status: "processing",
    errorMessage: null,
    ordinal: Date.now(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const tmpDir = `/tmp/${trackId}`;

  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    // 4. Download audio with yt-dlp
    const ytArgs = [
      "--no-playlist",
      "-f", "ba/b",
      "--print", "title",
      "--no-simulate",
      "-o", `${tmpDir}/raw.%(ext)s`,
    ];

    const cookiesB64 = process.env.TIKTOK_COOKIES_B64;
    if (cookiesB64) {
      const cookiesPath = `${tmpDir}/cookies.txt`;
      fs.writeFileSync(cookiesPath, Buffer.from(cookiesB64, "base64"));
      ytArgs.push("--cookies", cookiesPath);
    }

    ytArgs.push(resolvedUrl);

    const { stdout: ytStdout } = await exec(YTDLP_PATH, ytArgs, { cwd: tmpDir });
    const trackName = (ytStdout.split("\n")[0] || videoId).trim() || videoId;

    // 5. Find the downloaded file
    const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith("raw."));
    if (!files.length) throw new Error("yt-dlp did not produce an output file.");
    const rawFile = path.join(tmpDir, files[0]);

    // 6. Get full duration
    const fullDuration = await getDuration(rawFile);

    // 7. Encode to WAV 44100Hz 16-bit + measure RMS
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

    // 8. Upload to Firebase Storage
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

    // 9. Build the Firebase Storage download URL
    const encodedPath = encodeURIComponent(storagePath);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    // 10. Update Firestore doc to ready
    await trackRef.update({
      name: trackName,
      downloadUrl,
      durationSeconds: fullDuration,
      fullDurationSecs: fullDuration,
      rms,
      status: "ready",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { trackId, status: "ready" };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await trackRef.update({
      status: "error",
      errorMessage: message.slice(0, 500),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => { /* ignore secondary failure */ });
    throw err;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  }
}
