import { NextRequest, NextResponse } from "next/server";
import { RouteRequestSchema } from "../../../server/validation/routeValidation";
import { routingService } from "../../../server/services/routingService";
import { createErrorResponse } from "../../../server/validation/common";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const json = await request.json().catch(() => null);
    if (!json) {
      return createErrorResponse("INVALID_JSON", "Request body must be a valid JSON object.", 400);
    }

    const parsed = RouteRequestSchema.safeParse(json);
    if (!parsed.success) {
      return createErrorResponse(
        "INVALID_ROUTE_PAYLOAD",
        "Invalid route request parameters.",
        400,
        parsed.error.flatten()
      );
    }

    const route = await routingService.planRoute(parsed.data);

    if (!route) {
      return createErrorResponse(
        "ROUTE_NOT_FOUND",
        "No suitable metro route could be computed between the specified locations on the current operational network.",
        404
      );
    }

    return NextResponse.json({
      data: {
        mode: parsed.data.mode,
        route,
      },
    });
  } catch (error) {
    console.error("POST /api/routes error:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to compute journey route.", 500);
  }
}
