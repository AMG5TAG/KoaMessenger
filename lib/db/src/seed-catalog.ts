/**
 * Idempotent platform-catalog seed logic, separated from the CLI runner
 * (seed.ts) so it can be imported and invoked in-process — e.g. at API-server
 * startup — WITHOUT the script's side effects (pool.end()/process.exit()).
 *
 * Upserts every platform in `seed-data.ts` by its unique `slug`, so running it
 * repeatedly converges the `platforms` table to the canonical catalog without
 * creating duplicates or disturbing user data (users/userPlatforms reference
 * platforms by id, which is preserved on conflict).
 *
 * It does NOT delete platforms that exist in the DB but not in the seed — that
 * would orphan users' selections. Removals are handled explicitly via
 * REMOVED_SLUGS, pruned only when no user still references the platform.
 */
import { sql } from "drizzle-orm";
import { db, platformsTable, userPlatformsTable } from "./index";
import { platformSeed } from "./seed-data";

// Platforms intentionally retired from the catalog. Pruned only when safe
// (no user still has them added), so we never orphan a user's sidebar entry.
const REMOVED_SLUGS = ["skype"];

export interface SeedCatalogResult {
  upserted: number;
  removed: string[];
}

export async function seedCatalog(): Promise<SeedCatalogResult> {
  // Upsert the canonical catalog by slug.
  for (const p of platformSeed) {
    await db
      .insert(platformsTable)
      .values(p)
      .onConflictDoUpdate({
        target: platformsTable.slug,
        set: {
          name: p.name,
          url: p.url,
          category: p.category,
          color: p.color,
          description: p.description,
          iconUrl: p.iconUrl ?? null,
          isPopular: p.isPopular ?? false,
          embedsInIframe: p.embedsInIframe ?? true,
          iframeNotes: p.iframeNotes ?? null,
        },
      });
  }

  // Safely prune retired platforms.
  const removed: string[] = [];
  for (const slug of REMOVED_SLUGS) {
    const [platform] = await db
      .select({ id: platformsTable.id })
      .from(platformsTable)
      .where(sql`${platformsTable.slug} = ${slug}`);
    if (!platform) continue;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userPlatformsTable)
      .where(sql`${userPlatformsTable.platformId} = ${platform.id}`);

    if (count > 0) continue; // still referenced — leave it in place
    await db.delete(platformsTable).where(sql`${platformsTable.id} = ${platform.id}`);
    removed.push(slug);
  }

  return { upserted: platformSeed.length, removed };
}
