import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { contactsOf } from "@/lib/db/contacts";
import { requireAuth } from "@/lib/permissions";
import { UpdateContactSchema } from "@/lib/validation/referentials";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAuth();
    const { id } = await params;
    return NextResponse.json({
      contact: await contactsOf(me.organizationId).get(id),
    });
  });

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAuth();
    const { id } = await params;
    const data = UpdateContactSchema.parse(await readJson(req));
    return NextResponse.json({
      contact: await contactsOf(me.organizationId).update(id, data),
    });
  });
