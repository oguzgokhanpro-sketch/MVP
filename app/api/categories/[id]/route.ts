import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { categoriesOf } from "@/lib/db/referentials";
import { requireAdmin } from "@/lib/permissions";
import { UpdateReferentialSchema } from "@/lib/validation/referentials";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAdmin();
    const { id } = await params;
    const data = UpdateReferentialSchema.parse(await readJson(req));
    return NextResponse.json({
      category: await categoriesOf(me.organizationId).update(id, data),
    });
  });
