import { Router } from "express";
import { db, usersTable, userPlatformsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { UpdateNotificationPreferencesBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";

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

    return res.json({
      globalEnabled: user?.notificationsEnabled ?? true,
      platformPreferences,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get notification preferences");
    return res.status(500).json({ error: "Failed to get notification preferences" });
  }
});

router.patch("/notifications/preferences", requireAuth, validateBody(UpdateNotificationPreferencesBody), async (req: any, res) => {
  try {
    const { globalEnabled, platformPreferences } = req.body;

    if (globalEnabled !== undefined) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.userId));
      if (user) {
        await db
          .update(usersTable)
          .set({ notificationsEnabled: globalEnabled })
          .where(eq(usersTable.id, user.id));
      }
    }

    if (Array.isArray(platformPreferences)) {
      await Promise.all(
        platformPreferences.map(({ platformId, enabled }: { platformId: number; enabled: boolean }) =>
          db
            .update(userPlatformsTable)
            .set({ isActive: enabled })
            .where(
              and(
                eq(userPlatformsTable.platformId, platformId),
                eq(userPlatformsTable.userId, req.userId),
              ),
            ),
        ),
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

    return res.json({
      globalEnabled: updatedUser?.notificationsEnabled ?? true,
      platformPreferences: platformPrefs,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update notification preferences");
    return res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

export default router;
