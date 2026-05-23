import { Router } from "express";
import { db, feedbackTable, feedbackVotesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserId } from "../middlewares/auth";

const router = Router();

router.get("/feedback", async (req, res) => {
  try {
    const userId = getUserId(req);

    const items = await db.select().from(feedbackTable).orderBy(feedbackTable.votes);

    const result = await Promise.all(
      items.map(async (item) => {
        let hasVoted = false;
        if (userId) {
          const [vote] = await db
            .select()
            .from(feedbackVotesTable)
            .where(and(eq(feedbackVotesTable.feedbackId, item.id), eq(feedbackVotesTable.userId, userId)));
          hasVoted = !!vote;
        }
        return { ...item, hasVoted };
      })
    );

    return res.json(result.reverse());
  } catch (err) {
    req.log.error({ err }, "Failed to list feedback");
    return res.status(500).json({ error: "Failed to list feedback" });
  }
});

router.post("/feedback", requireAuth, async (req: any, res) => {
  try {
    const { type, title, description, platformName } = req.body;
    if (!type || !title || !description) {
      return res.status(400).json({ error: "type, title, description required" });
    }
    if (!["feature_request", "platform_suggestion"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const [item] = await db
      .insert(feedbackTable)
      .values({ userId: req.userId, type, title, description, platformName: platformName ?? null })
      .returning();

    return res.status(201).json({ ...item, hasVoted: false });
  } catch (err) {
    req.log.error({ err }, "Failed to create feedback");
    return res.status(500).json({ error: "Failed to create feedback" });
  }
});

router.post("/feedback/:id/vote", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [item] = await db.select().from(feedbackTable).where(eq(feedbackTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });

    const [existing] = await db
      .select()
      .from(feedbackVotesTable)
      .where(and(eq(feedbackVotesTable.feedbackId, id), eq(feedbackVotesTable.userId, req.userId)));

    if (existing) {
      await db.delete(feedbackVotesTable).where(eq(feedbackVotesTable.id, existing.id));
      const [updated] = await db
        .update(feedbackTable)
        .set({ votes: Math.max(0, item.votes - 1) })
        .where(eq(feedbackTable.id, id))
        .returning();
      return res.json({ ...updated, hasVoted: false });
    } else {
      await db.insert(feedbackVotesTable).values({ feedbackId: id, userId: req.userId });
      const [updated] = await db
        .update(feedbackTable)
        .set({ votes: item.votes + 1 })
        .where(eq(feedbackTable.id, id))
        .returning();
      return res.json({ ...updated, hasVoted: true });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to vote on feedback");
    return res.status(500).json({ error: "Failed to vote on feedback" });
  }
});

export default router;
