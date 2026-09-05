import { z } from "zod";
import { NextResponse } from "next/server";

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const PaginationLimitSchema = z.coerce.number().int().min(1).max(50).default(5);

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function createErrorResponse(code: string, message: string, status: number = 400, details?: any) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status });
}
