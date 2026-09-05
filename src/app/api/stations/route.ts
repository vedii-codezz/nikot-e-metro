import { NextResponse } from "next/server";
import { stationRepository } from "../../../server/repositories/stationRepository";
import { lineRepository } from "../../../server/repositories/lineRepository";
import { createErrorResponse } from "../../../server/validation/common";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stations, lines] = await Promise.all([
      stationRepository.getAllStations(),
      lineRepository.getAllLines(),
    ]);

    return NextResponse.json({
      data: {
        stations,
        lines,
      },
    });
  } catch (error) {
    console.error("GET /api/stations error:", error);
    return createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to retrieve metro stations.", 500);
  }
}
