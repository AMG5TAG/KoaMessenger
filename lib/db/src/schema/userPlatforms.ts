import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPlatformsTable = pgTable("user_platforms", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platformId: integer("platform_id").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserPlatformSchema = createInsertSchema(userPlatformsTable).omit({ id: true, createdAt: true });
export type InsertUserPlatform = z.infer<typeof insertUserPlatformSchema>;
export type UserPlatform = typeof userPlatformsTable.$inferSelect;
