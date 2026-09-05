import { NextRequest, NextResponse } from "next/server";
import { NearbyStationsQuerySchema } from "../../../../server/validation/stationValidation";
import { stationRepository } from "../../../../server/repositories/stationRepository";
import { pedestrianService } from "../../../../server/pedestrian/pedestrianService";
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
    const originCoords = { latitude: lat, longitude: lng };

    // 1. Shortlist top 3-5 candidates via fast Haversine proximity
    const shortlistLimit = Math.min(5, Math.max(3, limit));
    const initialCandidates = await stationRepository.findNearby(originCoords, shortlistLimit);

    // 2. Fetch real pedestrian routes with bounded concurrency & rate-limiting
    const routesMap = await pedestrianService.getBatchWalkingRoutes(
      originCoords,
      initialCandidates.map((c) => ({ id: c.station.id, coordinates: c.station.coordinates }))
    );

    // 3. Attach pedestrian metrics to candidates
    const enhancedResults = initialCandidates.map((c) => {
      const walk = routesMap.get(c.station.id);
      const walkingDistanceMeters = walk?.distanceMeters ?? Math.round(c.distanceKm * 1000);
      const walkingDurationSeconds = walk?.durationSeconds ?? (c.estimatedWalkMinutes * 60);
      const walkingRouteQuality = walk?.quality ?? "estimated";

      return {
        station: c.station,
        distanceKm: c.distanceKm,
        straightLineDistanceMeters: Math.round(c.distanceKm * 1000),
        walkingDistanceMeters,
        walkingDurationSeconds,
        walkingRouteQuality,
        walkingGeometry: walk?.geometry,
        walkingSource: walk?.source ?? "haversine",
        estimatedWalkMinutes: Math.max(1, Math.round(walkingDurationSeconds / 60)),
        confidence: c.confidence,
      };
    });

    // 4. Rerank candidates by actual pedestrian accessibility (walking duration, then distance)
    enhancedResults.sort((a, b) => {
      if (a.walkingDurationSeconds !== b.walkingDurationSeconds) {
        return a.walkingDurationSeconds - b.walkingDurationSeconds;
      }
      return a.walkingDistanceMeters - b.walkingDistanceMeters;
    });

    const finalResults = enhancedResults.slice(0, limit);

    return NextResponse.json({
      data: {
        origin: originCoords,
        count: finalResults.length,
        results: finalResults,
      },
    });
  } catch (error) {
    console.error("GET /api/stations/nearby error:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to calculate nearby stations.", 500);
  }
}
