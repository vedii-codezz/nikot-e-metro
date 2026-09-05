import { pgTable, varchar, doublePrecision, integer, timestamp } from "drizzle-orm/pg-core";

export const metroStations = pgTable("metro_stations", {
  id: varchar("id", { length: 100 }).primaryKey(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  bengaliName: varchar("bengali_name", { length: 200 }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("operational"), // "operational", "partial", "under_construction", "planned"
  dataConfidence: varchar("data_confidence", { length: 50 }).notNull().default("verified"), // "verified", "development", "planned"
  openedYear: integer("opened_year"),
  sourceName: varchar("source_name", { length: 150 }),
  sourceUrl: varchar("source_url", { length: 255 }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MetroStationRecord = typeof metroStations.$inferSelect;
export type NewMetroStationRecord = typeof metroStations.$inferInsert;
