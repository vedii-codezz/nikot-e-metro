import { NextRequest, NextResponse } from "next/server";
import { SearchQuerySchema } from "../../../server/validation/searchValidation";
import { serverGeocodingService } from "../../../server/geocoding/geocodingService";
import { createErrorResponse } from "../../../server/validation/common";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = SearchQuerySchema.safeParse({
      q: searchParams.get("q"),
      limit: searchParams.get("limit") || 6,
    });

    if (!parsed.success) {
      return createErrorResponse(
        "INVALID_SEARCH_QUERY",
        "Search query 'q' parameter is required.",
        400,
        parsed.error.flatten()
      );
    }

    const { q, limit } = parsed.data;
    const results = await serverGeocodingService.search(q, limit);

    return NextResponse.json({
      data: {
        query: q,
        count: results.length,
        results,
      },
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "Search service encountered an error.", 500);
  }
}
