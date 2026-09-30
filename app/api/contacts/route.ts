import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { contactsOf } from "@/lib/db/contacts";
import { requireAuth } from "@/lib/permissions";
import {
  ContactListSchema,
  CreateContactSchema,
  parseQuery,
} from "@/lib/validation/referentials";

export const GET = (req: Request) =>
  handle(async () => {
    const me = await requireAuth();
    const query = parseQuery(ContactListSchema, new URL(req.url).searchParams);
    return NextResponse.json(await contactsOf(me.organizationId).list(query));
  });

export const POST = (req: Request) =>
  handle(async () => {
    const me = await requireAuth();
    const data = CreateContactSchema.parse(await readJson(req));
    const contact = await contactsOf(me.organizationId).create(data);
    return NextResponse.json({ contact }, { status: 201 });
  });
