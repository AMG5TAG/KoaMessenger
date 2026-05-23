import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, userPlatformsTable, platformsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
};

const router = Router();

router.get("/notifications/preferences", requireAuth, async (req: any, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.userId));

    const userPlats = await db
      .select()
      .from(userPlatformsTable)
      .where(eq(userPlatformsTable.userId, req.userId));

    const platformPreferences = userPlats.map((up) => ({
      platformId: up.platformId,
      enabled: up.isActive,
    }));

    res.json({
      globalEnabled: user?.notificationsEnabled ?? true,
      platformPreferences,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get notification preferences");
    res.status(500).json({ error: "Failed to get notification preferences" });
  }
});

router.patch("/notifications/preferences", requireAuth, async (req: any, res) => {
  try {
    const { globalEnabled, platformPreferences } = req.body;

    if (globalEnabled !== undefined) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.userId));
      if (user) {
        await db.update(usersTable).set({ notificationsEnabled: globalEnabled }).where(eq(usersTable.id, user.id));
      }
    }

    if (Array.isArray(platformPreferences)) {
      await Promise.all(
        platformPreferences.map(({ platformId, enabled }: { platformId: number; enabled: boolean }) =>
          db
            .update(userPlatformsTable)
            .set({ isActive: enabled })
            .where(eq(userPlatformsTable.platformId, platformId))
        )
      );
    }

    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.userId));
    const userPlats = await db
      .select()
      .from(userPlatformsTable)
      .where(eq(userPlatformsTable.userId, req.userId));

    const platformPrefs = userPlats.map((up) => ({
      platformId: up.platformId,
      enabled: up.isActive,
    }));

    res.json({
      globalEnabled: updatedUser?.notificationsEnabled ?? true,
      platformPreferences: platformPrefs,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update notification preferences");
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

export default router;
