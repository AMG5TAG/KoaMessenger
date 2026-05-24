import { Router } from "express";
import { db, userPlatformsTable, platformsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function getUserPlatformsWithDetails(userId: string) {
  const rows = await db
    .select()
    .from(userPlatformsTable)
    .innerJoin(platformsTable, eq(userPlatformsTable.platformId, platformsTable.id))
    .where(eq(userPlatformsTable.userId, userId))
    .orderBy(userPlatformsTable.sortOrder);

  return rows.map((r) => ({ ...r.user_platforms, platform: r.platforms }));
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

    await db
      .delete(userPlatformsTable)
      .where(and(eq(userPlatformsTable.id, id), eq(userPlatformsTable.userId, req.userId)));
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
      .where(and(eq(userPlatformsTable.id, id), eq(userPlatformsTable.userId, req.userId)))
      .returning();

    const [platform] = await db
      .select()
      .from(platformsTable)
      .where(eq(platformsTable.id, updated.platformId));
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
          .where(and(eq(userPlatformsTable.id, id), eq(userPlatformsTable.userId, req.userId))),
      ),
    );

    const result = await getUserPlatformsWithDetails(req.userId);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to reorder platforms");
    return res.status(500).json({ error: "Failed to reorder platforms" });
  }
});

export default router;
