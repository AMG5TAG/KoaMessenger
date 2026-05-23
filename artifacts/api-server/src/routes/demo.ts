import { Router } from "express";
import { db, usersTable, userPlatformsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DEMO_USER_ID } from "../middlewares/auth";

const DEMO_CLERK_ID = "demo_user";
const DEMO_PLATFORMS = [1, 2, 3, 4, 5, 6]; // WhatsApp, Telegram, Messenger, Discord, Slack, Signal

const router = Router();

// POST /demo/setup — initialize demo user and add platforms
router.post("/demo/setup", async (req, res) => {
  try {
    // Ensure demo user exists
    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, DEMO_CLERK_ID));
    if (!user) {
      [user] = await db.insert(usersTable).values({
        clerkId: DEMO_CLERK_ID,
        displayName: "Demo User",
        notificationsEnabled: true,
        theme: "dark",
      }).returning();
    }

    // Clear existing demo platforms
    await db.delete(userPlatformsTable).where(eq(userPlatformsTable.userId, DEMO_USER_ID));

    // Add demo platforms
    for (let i = 0; i < DEMO_PLATFORMS.length; i++) {
      const platformId = DEMO_PLATFORMS[i];
      await db.insert(userPlatformsTable).values({
        userId: DEMO_USER_ID,
        platformId,
        sortOrder: i,
        isActive: true,
      });
    }

    return res.json({ success: true, userId: DEMO_USER_ID });
  } catch (err: any) {
    req.log?.error?.({ err }, "Failed to setup demo");
    return res.status(500).json({ error: "Failed to setup demo" });
  }
});

// POST /demo/reset — reset demo platforms
router.post("/demo/reset", async (req, res) => {
  try {
    await db.delete(userPlatformsTable).where(eq(userPlatformsTable.userId, DEMO_USER_ID));
    for (let i = 0; i < DEMO_PLATFORMS.length; i++) {
      const platformId = DEMO_PLATFORMS[i];
      await db.insert(userPlatformsTable).values({
        userId: DEMO_USER_ID,
        platformId,
        sortOrder: i,
        isActive: true,
      });
    }
    return res.json({ success: true });
  } catch (err: any) {
    req.log?.error?.({ err }, "Failed to reset demo");
    return res.status(500).json({ error: "Failed to reset demo" });
  }
});

export default router;
