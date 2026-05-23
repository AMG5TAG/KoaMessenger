import { Router } from "express";
import { db, userPlatformsTable, platformsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function getUserPlatformsWithDetails(userId: string) {
  const userPlats = await db
    .select()
    .from(userPlatformsTable)
    .where(eq(userPlatformsTable.userId, userId))
    .orderBy(userPlatformsTable.sortOrder);

  const result = await Promise.all(
    userPlats.map(async (up) => {
      const [platform] = await db
        .select()
        .from(platformsTable)
        .where(eq(platformsTable.id, up.platformId));
      return { ...up, platform };
    })
  );

  return result.filter((r) => r.platform);
}

router.get("/user-platforms", requireAuth, async (req: any, res) => {
  try {
    const result = await getUserPlatformsWithDetails(req.userId);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list user platforms");
    return res.status(500).json({ error: "Failed to list user platforms" });
  }
});

router.post("/user-platforms", requireAuth, async (req: any, res) => {
  try {
    const { platformId, displayName } = req.body;
    if (!platformId) return res.status(400).json({ error: "platformId required" });

    const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, platformId));
    if (!platform) return res.status(404).json({ error: "Platform not found" });

    const existing = await db
      .select()
      .from(userPlatformsTable)
      .where(and(eq(userPlatformsTable.userId, req.userId), eq(userPlatformsTable.platformId, platformId)));

    if (existing.length > 0) return res.status(409).json({ error: "Platform already added" });

    const currentPlatforms = await db
      .select()
      .from(userPlatformsTable)
      .where(eq(userPlatformsTable.userId, req.userId));

    const sortOrder = currentPlatforms.length;

    const [up] = await db
      .insert(userPlatformsTable)
      .values({ userId: req.userId, platformId, sortOrder, displayName: displayName ?? null })
      .returning();

    return res.status(201).json({ ...up, platform });
  } catch (err) {
    req.log.error({ err }, "Failed to add user platform");
    return res.status(500).json({ error: "Failed to add user platform" });
  }
});

router.delete("/user-platforms/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [up] = await db
      .select()
      .from(userPlatformsTable)
      .where(and(eq(userPlatformsTable.id, id), eq(userPlatformsTable.userId, req.userId)));

    if (!up) return res.status(404).json({ error: "Not found" });

    await db.delete(userPlatformsTable).where(eq(userPlatformsTable.id, id));
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to remove user platform");
    return res.status(500).json({ error: "Failed to remove user platform" });
  }
});

router.patch("/user-platforms/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [up] = await db
      .select()
      .from(userPlatformsTable)
      .where(and(eq(userPlatformsTable.id, id), eq(userPlatformsTable.userId, req.userId)));

    if (!up) return res.status(404).json({ error: "Not found" });

    const { isActive, displayName, sortOrder } = req.body;
    const updates: Partial<typeof userPlatformsTable.$inferInsert> = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (displayName !== undefined) updates.displayName = displayName;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [updated] = await db
      .update(userPlatformsTable)
      .set(updates)
      .where(eq(userPlatformsTable.id, id))
      .returning();

    const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, updated.platformId));
    return res.json({ ...updated, platform });
  } catch (err) {
    req.log.error({ err }, "Failed to update user platform");
    return res.status(500).json({ error: "Failed to update user platform" });
  }
});

router.post("/user-platforms/reorder", requireAuth, async (req: any, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds required" });

    await Promise.all(
      orderedIds.map((id: number, index: number) =>
        db
          .update(userPlatformsTable)
          .set({ sortOrder: index })
          .where(and(eq(userPlatformsTable.id, id), eq(userPlatformsTable.userId, req.userId)))
      )
    );

    const result = await getUserPlatformsWithDetails(req.userId);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to reorder platforms");
    return res.status(500).json({ error: "Failed to reorder platforms" });
  }
});

export default router;
