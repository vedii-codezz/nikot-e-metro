import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z
    .string({ message: "Search query 'q' is required" })
    .trim()
    .min(1, "Search query must be at least 1 character")
    .max(100, "Search query must be at most 100 characters"),
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
