import { Router } from "express";
import { db, userPlatformsTable, platformsTable } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import {
  AddUserPlatformBody,
  ReorderUserPlatformsBody,
  UpdateUserPlatformBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";

const router = Router();

async function getUserPlatformsWithDetails(userId: string) {
  const ups = await db
    .select()
    .from(userPlatformsTable)
    .where(eq(userPlatformsTable.userId, userId))
    .orderBy(userPlatformsTable.sortOrder);

  if (ups.length === 0) return [];

  const platformIds = Array.from(new Set(ups.map((u) => u.platformId)));
  const platforms = await db
    .select()
    .from(platformsTable)
    .where(inArray(platformsTable.id, platformIds));

  const platformMap = new Map(platforms.map((p) => [p.id, p]));
  return ups
    .map((up) => {
      const platform = platformMap.get(up.platformId);
      if (!platform) return null;
      return { ...up, platform };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
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

router.post("/user-platforms", requireAuth, validateBody(AddUserPlatformBody), async (req: any, res) => {
  try {
    const { platformId, displayName } = req.body;

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

router.patch("/user-platforms/:id", requireAuth, validateBody(UpdateUserPlatformBody), async (req: any, res) => {
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

    // Drizzle's .set() throws on an empty object — nothing to update, return as-is.
    if (Object.keys(updates).length === 0) {
      const [platform] = await db
        .select()
        .from(platformsTable)
        .where(eq(platformsTable.id, up.platformId));
      return res.json({ ...up, platform });
    }

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

router.post("/user-platforms/reorder", requireAuth, validateBody(ReorderUserPlatformsBody), async (req: any, res) => {
  try {
    const { orderedIds } = req.body;

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
