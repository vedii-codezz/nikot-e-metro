import { NextRequest, NextResponse } from "next/server";
import { NearbyStationsQuerySchema } from "../../../../server/validation/stationValidation";
import { stationRepository } from "../../../../server/repositories/stationRepository";
import { createErrorResponse } from "../../../../server/validation/common";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = NearbyStationsQuerySchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      limit: searchParams.get("limit") || 5,
    });

    if (!parsed.success) {
      return createErrorResponse(
        "INVALID_QUERY_PARAMETERS",
        "Latitude and Longitude query parameters are required and must be valid coordinates.",
        400,
        parsed.error.flatten()
      );
    }

    const { lat, lng, limit } = parsed.data;
    const nearby = await stationRepository.findNearby({ latitude: lat, longitude: lng }, limit);

    return NextResponse.json({
      data: {
        origin: { latitude: lat, longitude: lng },
        count: nearby.length,
        results: nearby,
      },
    });
  } catch (error) {
    console.error("GET /api/stations/nearby error:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to calculate nearby stations.", 500);
  }
}
