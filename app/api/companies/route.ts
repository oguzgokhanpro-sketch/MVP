import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { companiesOf } from "@/lib/db/companies";
import { requireAuth } from "@/lib/permissions";
import {
  CompanyListSchema,
  CreateCompanySchema,
  parseQuery,
} from "@/lib/validation/referentials";

export const GET = (req: Request) =>
  handle(async () => {
    const me = await requireAuth();
    const query = parseQuery(CompanyListSchema, new URL(req.url).searchParams);
    return NextResponse.json(await companiesOf(me.organizationId).list(query));
  });

export const POST = (req: Request) =>
  handle(async () => {
    const me = await requireAuth();
    const data = CreateCompanySchema.parse(await readJson(req));
    const company = await companiesOf(me.organizationId).create(data);
    return NextResponse.json({ company }, { status: 201 });
  });
