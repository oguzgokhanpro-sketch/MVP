import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { login } from "@/lib/auth/service";
import { LoginSchema } from "@/lib/validation/auth";

export const POST = (req: Request) =>
  handle(async () => {
    const input = LoginSchema.parse(await readJson(req));
    return NextResponse.json({ user: await login(input) });
  });
