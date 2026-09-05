import { pgTable, varchar, doublePrecision, integer, timestamp } from "drizzle-orm/pg-core";

export const busRoutes = pgTable("bus_routes", {
  id: varchar("id", { length: 50 }).primaryKey(),
  routeNumber: varchar("route_number", { length: 50 }).notNull(),
  originName: varchar("origin_name", { length: 150 }).notNull(),
  destinationName: varchar("destination_name", { length: 150 }).notNull(),
  operator: varchar("operator", { length: 100 }).notNull().default("WBTC"),
  dataConfidence: varchar("data_confidence", { length: 50 }).notNull().default("verified"),
  sourceName: varchar("source_name", { length: 150 }).default("West Bengal Transport Corporation (WBTC)"),
  sourceUrl: varchar("source_url", { length: 255 }).default("https://wbtc.co.in"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const busStops = pgTable("bus_stops", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  bengaliName: varchar("bengali_name", { length: 200 }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  dataConfidence: varchar("data_confidence", { length: 50 }).notNull().default("verified"),
  sourceName: varchar("source_name", { length: 150 }).default("WBTC Official Stoppages"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const busRouteStops = pgTable("bus_route_stops", {
  id: varchar("id", { length: 150 }).primaryKey(),
  routeId: varchar("route_id", { length: 50 })
    .notNull()
    .references(() => busRoutes.id, { onDelete: "cascade" }),
  stopId: varchar("stop_id", { length: 100 })
    .notNull()
    .references(() => busStops.id, { onDelete: "cascade" }),
  stopOrder: integer("stop_order").notNull(),
});

export type BusRouteRecord = typeof busRoutes.$inferSelect;
export type BusStopRecord = typeof busStops.$inferSelect;
export type BusRouteStopRecord = typeof busRouteStops.$inferSelect;
