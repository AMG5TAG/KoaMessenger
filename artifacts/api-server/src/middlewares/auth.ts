import { getAuth } from "@clerk/express";

export const DEMO_USER_ID = "demo_user";

export function getUserId(req: any): string | null {
  const demoToken = req.headers["x-demo-token"];
  if (demoToken === "demo") {
    return DEMO_USER_ID;
  }
  return getAuth(req)?.userId ?? null;
}

export function requireAuth(req: any, res: any, next: any) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}
