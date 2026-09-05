import { pgTable, varchar, integer, primaryKey } from "drizzle-orm/pg-core";
import { metroStations } from "./metro-stations";
import { metroLines } from "./metro-lines";

export const stationLines = pgTable(
  "station_lines",
  {
    stationId: varchar("station_id", { length: 100 })
      .notNull()
      .references(() => metroStations.id, { onDelete: "cascade" }),
    lineId: varchar("line_id", { length: 50 })
      .notNull()
      .references(() => metroLines.id, { onDelete: "cascade" }),
    stationOrder: integer("station_order").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.stationId, table.lineId] }),
  })
);

export type StationLineRecord = typeof stationLines.$inferSelect;
export type NewStationLineRecord = typeof stationLines.$inferInsert;
