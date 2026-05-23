import { Router } from "express";
import { db, usersTable, userPlatformsTable, feedbackTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

async function ensureUser(clerkId: string) {
  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    [user] = await db.insert(usersTable).values({ clerkId, displayName: "KoaUser" }).returning();
  }
  return user;
}

const router = Router();

router.get("/users/me", requireAuth, async (req: any, res) => {
  try {
    const user = await ensureUser(req.userId);
    return res.json(user);
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    return res.status(500).json({ error: "Failed to get user" });
  }
});

router.patch("/users/me", requireAuth, async (req: any, res) => {
  try {
    const user = await ensureUser(req.userId);
    const { displayName, notificationsEnabled, theme } = req.body;

    const updates: Partial<typeof usersTable.$inferInsert> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
    if (theme !== undefined) updates.theme = theme;

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
    return res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    return res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/users/me/stats", requireAuth, async (req: any, res) => {
  try {
    const clerkId = req.userId;

    const [totalPlatformsRow] = await db
      .select({ count: count() })
      .from(userPlatformsTable)
      .where(eq(userPlatformsTable.userId, clerkId));

    const [activePlatformsRow] = await db
      .select({ count: count() })
      .from(userPlatformsTable)
      .where(eq(userPlatformsTable.userId, clerkId));

    const [feedbackRow] = await db
      .select({ count: count() })
      .from(feedbackTable)
      .where(eq(feedbackTable.userId, clerkId));

    return res.json({
      totalPlatforms: totalPlatformsRow?.count ?? 0,
      activePlatforms: activePlatformsRow?.count ?? 0,
      mostUsedCategory: null,
      totalFeedbackSubmitted: feedbackRow?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user stats");
    return res.status(500).json({ error: "Failed to get user stats" });
  }
});

export default router;
