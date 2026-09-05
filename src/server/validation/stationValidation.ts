import { z } from "zod";

export const NearbyStationsQuerySchema = z.object({
  lat: z.coerce.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
  lng: z.coerce.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export type NearbyStationsQuery = z.infer<typeof NearbyStationsQuerySchema>;
