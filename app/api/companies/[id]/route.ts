import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { companiesOf } from "@/lib/db/companies";
import { requireAuth } from "@/lib/permissions";
import { UpdateCompanySchema } from "@/lib/validation/referentials";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAuth();
    const { id } = await params;
    return NextResponse.json({
      company: await companiesOf(me.organizationId).get(id),
    });
  });

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAuth();
    const { id } = await params;
    const data = UpdateCompanySchema.parse(await readJson(req));
    return NextResponse.json({
      company: await companiesOf(me.organizationId).update(id, data),
    });
  });
