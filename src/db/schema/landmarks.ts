import { pgTable, varchar, doublePrecision, text, timestamp } from "drizzle-orm/pg-core";

export const landmarks = pgTable("landmarks", {
  id: varchar("id", { length: 150 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  bengaliName: varchar("bengali_name", { length: 200 }),
  category: varchar("category", { length: 50 }).notNull().default("landmark"), // "landmark", "college", "hospital", "transport_hub", "neighbourhood", "tourist_place"
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  aliases: text("aliases"), // Comma-separated or JSON string of alternative names
  description: text("description"),
  dataConfidence: varchar("data_confidence", { length: 50 }).notNull().default("verified"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LandmarkRecord = typeof landmarks.$inferSelect;
export type NewLandmarkRecord = typeof landmarks.$inferInsert;
