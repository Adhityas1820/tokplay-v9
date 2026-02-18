import * as admin from "firebase-admin";
import { Request, Response, NextFunction } from "express";

const ALLOWED_EMAILS = [
  "adhitya.srini@gmail.com",
  "cmikec12@gmail.com",
  "sofiathomas2023@gmail.com",
];

export interface AuthRequest extends Request {
  uid?: string;
  userEmail?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = decoded.email?.toLowerCase() ?? "";
    if (!ALLOWED_EMAILS.includes(email)) {
      res.status(403).json({ error: "Your account is not authorized to use this app." });
      return;
    }
    req.uid = decoded.uid;
    req.userEmail = email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
