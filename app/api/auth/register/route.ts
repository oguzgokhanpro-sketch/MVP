import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { register } from "@/lib/auth/service";
import { RegisterSchema } from "@/lib/validation/auth";

export const POST = (req: Request) =>
  handle(async () => {
    const input = RegisterSchema.parse(await readJson(req));
    const user = await register(input);
    return NextResponse.json({ user }, { status: 201 });
  });
