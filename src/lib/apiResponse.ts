import { NextResponse } from 'next/server';

/**
 * Standard API error response helper.
 *
 * Returns a JSON response with shape:
 *   { success: false, error: "<code>", message: "<human-readable>" }
 *
 * @param code   Machine-readable error code (e.g. "UNAUTHORIZED", "NOT_FOUND")
 * @param message  Human-readable description of the error
 * @param status   HTTP status code (default 400)
 */
export function apiErrorResponse(
  code: string,
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    { success: false, error: code, message },
    { status }
  );
}

/**
 * Standard API success response helper.
 *
 * Returns a JSON response with shape:
 *   { success: true, ...data }
 *
 * @param data    Object whose fields are spread into the response body
 * @param status  HTTP status code (default 200)
 */
export function apiSuccessResponse(
  data: Record<string, unknown>,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}
