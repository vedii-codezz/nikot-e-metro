import { pgTable, varchar, doublePrecision, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { metroStations } from "./metro-stations";
import { metroLines } from "./metro-lines";

export const stationConnections = pgTable("station_connections", {
  id: varchar("id", { length: 150 }).primaryKey(),
  fromStationId: varchar("from_station_id", { length: 100 })
    .notNull()
    .references(() => metroStations.id, { onDelete: "cascade" }),
  toStationId: varchar("to_station_id", { length: 100 })
    .notNull()
    .references(() => metroStations.id, { onDelete: "cascade" }),
  lineId: varchar("line_id", { length: 50 })
    .notNull()
    .references(() => metroLines.id, { onDelete: "cascade" }),
  distanceMeters: integer("distance_meters").notNull(),
  estimatedTravelSeconds: integer("estimated_travel_seconds"),
  verified: boolean("verified").notNull().default(false),
  confidence: varchar("confidence", { length: 50 }).notNull().default("verified"),
  routingStatus: varchar("routing_status", { length: 50 }).notNull().default("operational"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StationConnectionRecord = typeof stationConnections.$inferSelect;
export type NewStationConnectionRecord = typeof stationConnections.$inferInsert;
