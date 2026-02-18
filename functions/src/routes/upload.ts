import { Router, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { uploadTrack } from "../uploadTrack";

const router = Router();

// POST /api/upload — upload a base64-encoded MP3
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const { audioBase64, fileName } = req.body as { audioBase64?: string; fileName?: string };

  if (!audioBase64 || typeof audioBase64 !== "string") {
    res.status(400).json({ error: "audioBase64 is required." });
    return;
  }
  if (!fileName || typeof fileName !== "string") {
    res.status(400).json({ error: "fileName is required." });
    return;
  }

  try {
    const result = await uploadTrack(req.uid!, { audioBase64, fileName });
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    res.status(500).json({ error: message });
  }
});

export default router;
