import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CoordinatesSchema, createErrorResponse } from "../../../server/validation/common";
import { pedestrianService } from "../../../server/pedestrian/pedestrianService";

export const dynamic = "force-dynamic";

const WalkingRoutePayloadSchema = z.object({
  origin: CoordinatesSchema,
  destination: CoordinatesSchema,
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return createErrorResponse("INVALID_JSON", "Request body must be a valid JSON object.", 400);
    }

    const parsed = WalkingRoutePayloadSchema.safeParse(json);
    if (!parsed.success) {
      return createErrorResponse(
        "INVALID_WALKING_ROUTE_PAYLOAD",
        "Invalid coordinates provided for origin or destination.",
        400,
        parsed.error.flatten()
      );
    }

    const { origin, destination } = parsed.data;
    const route = await pedestrianService.getWalkingRoute(origin, destination);

    return NextResponse.json({
      data: {
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        geometry: route.geometry,
        source: route.source,
        quality: route.quality,
      },
    });
  } catch (error) {
    console.error("POST /api/walking-route error:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to compute pedestrian walking route.", 500);
  }
}
