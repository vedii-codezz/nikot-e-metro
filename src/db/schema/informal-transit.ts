import { pgTable, varchar, doublePrecision, text, timestamp } from "drizzle-orm/pg-core";

export const informalTransitStands = pgTable("informal_transit_stands", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // "auto" | "toto"
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  nearbyMetroStationId: varchar("nearby_metro_station_id", { length: 100 }),
  routesServed: text("routes_served"), // e.g. "Kalighat - Gariahat, Kalighat - Rashbehari"
  fareMin: doublePrecision("fare_min"),
  fareMax: doublePrecision("fare_max"),
  dataConfidence: varchar("data_confidence", { length: 50 }).notNull().default("development"),
  sourceName: varchar("source_name", { length: 150 }).default("Kolkata Auto-Rickshaw Operators Union / Community Documented"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InformalTransitStandRecord = typeof informalTransitStands.$inferSelect;
export type NewInformalTransitStandRecord = typeof informalTransitStands.$inferInsert;
