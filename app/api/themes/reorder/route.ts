import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { themesOf } from "@/lib/db/referentials";
import { requireAdmin } from "@/lib/permissions";
import { ReorderSchema } from "@/lib/validation/referentials";

export const POST = (req: Request) =>
  handle(async () => {
    const me = await requireAdmin();
    const { ids } = ReorderSchema.parse(await readJson(req));
    return NextResponse.json({
      themes: await themesOf(me.organizationId).reorder(ids),
    });
  });
