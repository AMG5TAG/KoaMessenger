import { getAuth } from "@clerk/express";

export function getUserId(req: any): string | null {
  return getAuth(req)?.userId ?? null;
}

export function requireAuth(req: any, res: any, next: any) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}
