import { Router } from "express";
import { db, platformsTable } from "@workspace/db";
import { and, eq, ilike } from "drizzle-orm";

const router = Router();

router.get("/platforms", async (req, res) => {
  try {
    const platforms = await db.select().from(platformsTable).orderBy(platformsTable.name);
    return res.json(platforms);
  } catch (err) {
    req.log.error({ err }, "Failed to list platforms");
    return res.status(500).json({ error: "Failed to list platforms" });
  }
});

router.get("/platforms/search", async (req, res) => {
  try {
    const q = (req.query.q as string) ?? "";
    const category = req.query.category as string | undefined;

    const conditions = [];
    if (q) conditions.push(ilike(platformsTable.name, `%${q}%`));
    if (category) conditions.push(eq(platformsTable.category, category));

    const platforms =
      conditions.length > 0
        ? await db
            .select()
            .from(platformsTable)
            .where(and(...conditions))
            .orderBy(platformsTable.name)
        : await db.select().from(platformsTable).orderBy(platformsTable.name);

    return res.json(platforms);
  } catch (err) {
    req.log.error({ err }, "Failed to search platforms");
    return res.status(500).json({ error: "Failed to search platforms" });
  }
});

router.get("/platforms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [platform] = await db.select().from(platformsTable).where(eq(platformsTable.id, id));
    if (!platform) return res.status(404).json({ error: "Not found" });

    return res.json(platform);
  } catch (err) {
    req.log.error({ err }, "Failed to get platform");
    return res.status(500).json({ error: "Failed to get platform" });
  }
});

export default router;
