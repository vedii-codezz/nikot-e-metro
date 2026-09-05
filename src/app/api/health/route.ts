import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "../../../db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await checkDatabaseHealth();

    if (health.isConnected) {
      return NextResponse.json(
        {
          status: "ok",
          database: "connected",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: "degraded",
        database: "unavailable",
      },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unavailable",
      },
      { status: 503 }
    );
  }
}
