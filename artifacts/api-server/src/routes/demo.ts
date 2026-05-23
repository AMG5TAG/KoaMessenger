import { Router } from "express";
import { db, usersTable, userPlatformsTable, platformsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { DEMO_USER_ID } from "../middlewares/auth";

const DEMO_CLERK_ID = "demo_user";
// Mix of embed-friendly (Telegram, Mastodon, Element, Jitsi) and blocked
// (WhatsApp, Discord) so demo users see both the in-app and new-tab flows.
const DEMO_PLATFORM_SLUGS = ["telegram", "whatsapp", "discord", "element", "mastodon", "jitsi", "signal"];

async function resolveDemoPlatformIds(): Promise<number[]> {
  const rows = await db
    .select({ id: platformsTable.id, slug: platformsTable.slug })
    .from(platformsTable)
    .where(inArray(platformsTable.slug, DEMO_PLATFORM_SLUGS));
  const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const missing = DEMO_PLATFORM_SLUGS.filter((s) => !bySlug.has(s));
  if (missing.length > 0) {
    throw new Error(`Missing demo platforms in DB: ${missing.join(", ")}`);
  }
  return DEMO_PLATFORM_SLUGS.map((s) => bySlug.get(s)!);
}

async function seedDemoPlatforms() {
  const ids = await resolveDemoPlatformIds();
  await db.delete(userPlatformsTable).where(eq(userPlatformsTable.userId, DEMO_USER_ID));
  for (let i = 0; i < ids.length; i++) {
    await db.insert(userPlatformsTable).values({
      userId: DEMO_USER_ID,
      platformId: ids[i],
      sortOrder: i,
      isActive: true,
    });
  }
}

const router = Router();

// POST /demo/setup — initialize demo user and add platforms
router.post("/demo/setup", async (req, res) => {
  try {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, DEMO_CLERK_ID));
    if (!user) {
      [user] = await db
        .insert(usersTable)
        .values({
          clerkId: DEMO_CLERK_ID,
          displayName: "Demo User",
          notificationsEnabled: true,
          theme: "dark",
        })
        .returning();
    }

    await seedDemoPlatforms();
    return res.json({ success: true, userId: DEMO_USER_ID });
  } catch (err: any) {
    req.log?.error?.({ err }, "Failed to setup demo");
    return res.status(500).json({ error: "Failed to setup demo" });
  }
});

// POST /demo/reset — reset demo platforms
router.post("/demo/reset", async (req, res) => {
  try {
    await seedDemoPlatforms();
    return res.json({ success: true });
  } catch (err: any) {
    req.log?.error?.({ err }, "Failed to reset demo");
    return res.status(500).json({ error: "Failed to reset demo" });
  }
});

export default router;
