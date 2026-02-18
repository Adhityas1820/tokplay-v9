import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { AuthRequest } from "../middleware/auth";
import { processTrack } from "../processTrack";

const router = Router();

// POST /api/tracks — add a TikTok URL
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const { tiktokUrl } = req.body as { tiktokUrl?: string };
  if (!tiktokUrl || typeof tiktokUrl !== "string") {
    res.status(400).json({ error: "tiktokUrl is required." });
    return;
  }
  try {
    const result = await processTrack(req.uid!, { tiktokUrl });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    res.status(500).json({ error: message });
  }
});

// DELETE /api/tracks/:id — delete a track
router.delete("/:trackId", async (req: AuthRequest, res: Response): Promise<void> => {
  const trackId = String(req.params.trackId ?? "");
  if (!trackId) { res.status(400).json({ error: "trackId is required." }); return; }

  const db = admin.firestore();
  const trackRef = db.collection("users").doc(req.uid!).collection("tracks").doc(trackId);
  const docSnap = await trackRef.get();

  if (!docSnap.exists) { res.status(404).json({ error: "Track not found." }); return; }

  const storagePath = docSnap.data()?.storagePath as string | undefined;
  if (storagePath) {
    try { await admin.storage().bucket().file(storagePath).delete(); } catch { /* not fatal */ }
  }
  await trackRef.delete();
  res.json({ success: true });
});

export default router;
