import { pgTable, varchar, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { metroStations } from "./metro-stations";

export const interchanges = pgTable("interchanges", {
  id: varchar("id", { length: 150 }).primaryKey(),
  fromStationId: varchar("from_station_id", { length: 100 })
    .notNull()
    .references(() => metroStations.id, { onDelete: "cascade" }),
  toStationId: varchar("to_station_id", { length: 100 })
    .notNull()
    .references(() => metroStations.id, { onDelete: "cascade" }),
  estimatedTransferSeconds: integer("estimated_transfer_seconds"),
  verified: boolean("verified").notNull().default(false),
  confidence: varchar("confidence", { length: 50 }).notNull().default("verified"),
  routingStatus: varchar("routing_status", { length: 50 }).notNull().default("operational"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InterchangeRecord = typeof interchanges.$inferSelect;
export type NewInterchangeRecord = typeof interchanges.$inferInsert;
