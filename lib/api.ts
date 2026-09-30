import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { AppError } from "@/lib/errors";

/** Wraps a route handler and maps errors to safe JSON responses (no stack traces, no internals). */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION",
            message: "Invalid input",
            fields: z.flattenError(e).fieldErrors,
          },
        },
        { status: 400 },
      );
    }
    if (e instanceof AppError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.message } },
        { status: e.status },
      );
    }
    console.error(
      "Unhandled server error:",
      e instanceof Error ? e.message : "unknown",
    );
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Something went wrong" } },
      { status: 500 },
    );
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
