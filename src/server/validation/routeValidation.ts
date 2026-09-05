import { z } from "zod";
import { CoordinatesSchema } from "./common";

const LocationInputSchema = z.object({
  name: z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
  stationId: z.string().optional(),
}).refine(
  (data) => !!data.coordinates || !!data.stationId,
  "Either coordinates or stationId must be provided"
);

export const RouteRequestSchema = z.object({
  origin: LocationInputSchema,
  destination: LocationInputSchema,
  mode: z.enum(["recommended", "fastest"]).default("recommended"),
});

export type RouteRequest = z.infer<typeof RouteRequestSchema>;
