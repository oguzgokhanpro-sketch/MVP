import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { themesOf } from "@/lib/db/referentials";
import { requireAdmin, requireAuth } from "@/lib/permissions";
import { NameSchema } from "@/lib/validation/referentials";

export const GET = () =>
  handle(async () => {
    const me = await requireAuth();
    return NextResponse.json({
      themes: await themesOf(me.organizationId).list(),
    });
  });

export const POST = (req: Request) =>
  handle(async () => {
    const me = await requireAdmin();
    const { name } = NameSchema.parse(await readJson(req));
    const theme = await themesOf(me.organizationId).create(name);
    return NextResponse.json({ theme }, { status: 201 });
  });
