import { Router } from "express";
import { db, feedbackTable, feedbackVotesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { CreateFeedbackBody } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";

const router = Router();

/**
 * Strip the author's Clerk user ID (PII) from a feedback row before it leaves
 * the server. feedbackTable.userId must never be serialized to any client —
 * not on the public list, and not to a user voting on someone else's item.
 */
function toPublicFeedback(
  row: typeof feedbackTable.$inferSelect,
  hasVoted: boolean,
) {
  const { userId: _userId, ...rest } = row;
  return { ...rest, hasVoted };
}

router.get("/feedback", async (req, res) => {
  try {
    const userId = getUserId(req);

    // Explicit column list — never select/return feedbackTable.userId, which
    // holds the author's Clerk user ID (PII). This endpoint is public, so a
    // SELECT * + row spread would leak every author's identity to anonymous
    // callers. Keep this in sync with ListFeedbackResponseItem in the spec.
    const items = await db
      .select({
        id: feedbackTable.id,
        type: feedbackTable.type,
        title: feedbackTable.title,
        description: feedbackTable.description,
        platformName: feedbackTable.platformName,
        votes: feedbackTable.votes,
        status: feedbackTable.status,
        createdAt: feedbackTable.createdAt,
      })
      .from(feedbackTable)
      .orderBy(desc(feedbackTable.votes));

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
      }),
    );

    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list feedback");
    return res.status(500).json({ error: "Failed to list feedback" });
  }
});

router.post("/feedback", requireAuth, validateBody(CreateFeedbackBody), async (req: any, res) => {
  try {
    const { type, title, description, platformName } = req.body;
    // Schema enforces types and the type enum; still reject blank strings.
    if (!title.trim() || !description.trim()) {
      return res.status(400).json({ error: "title and description must not be empty" });
    }

    const [item] = await db
      .insert(feedbackTable)
      .values({ userId: req.userId, type, title, description, platformName: platformName ?? null })
      .returning();

    return res.status(201).json(toPublicFeedback(item, false));
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
      return res.json(toPublicFeedback(updated, false));
    } else {
      await db.insert(feedbackVotesTable).values({ feedbackId: id, userId: req.userId });
      const [updated] = await db
        .update(feedbackTable)
        .set({ votes: item.votes + 1 })
        .where(eq(feedbackTable.id, id))
        .returning();
      return res.json(toPublicFeedback(updated, true));
    }
  } catch (err) {
    req.log.error({ err }, "Failed to vote on feedback");
    return res.status(500).json({ error: "Failed to vote on feedback" });
  }
});

export default router;
