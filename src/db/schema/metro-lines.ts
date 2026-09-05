import { pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const metroLines = pgTable("metro_lines", {
  id: varchar("id", { length: 50 }).primaryKey(), // e.g. "blue", "green", "purple", "orange"
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  lineCode: varchar("line_code", { length: 50 }).notNull(), // e.g. "Line 1"
  bengaliName: varchar("bengali_name", { length: 150 }).notNull(),
  displayColor: varchar("display_color", { length: 20 }).notNull(), // Hex color e.g. "#0072CE"
  textColor: varchar("text_color", { length: 20 }).notNull().default("#FFFFFF"),
  status: varchar("status", { length: 50 }).notNull(), // "operational", "partial", "planned", "under_construction", "inactive"
  confidence: varchar("confidence", { length: 50 }).notNull().default("verified"), // "verified", "development", "planned"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MetroLineRecord = typeof metroLines.$inferSelect;
export type NewMetroLineRecord = typeof metroLines.$inferInsert;
