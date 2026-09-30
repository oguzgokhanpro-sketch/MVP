import { NextResponse } from "next/server";
import { handle, readJson } from "@/lib/api";
import { usersOf } from "@/lib/db/users";
import { requireAdmin, requireAuth } from "@/lib/permissions";
import { UpdateUserSchema } from "@/lib/validation/auth";

type Ctx = { params: Promise<{ id: string }> };

export const GET = (_req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAuth();
    const { id } = await params;
    return NextResponse.json({
      user: await usersOf(me.organizationId).get(id),
    });
  });

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAdmin();
    const { id } = await params;
    const data = UpdateUserSchema.parse(await readJson(req));
    return NextResponse.json({
      user: await usersOf(me.organizationId).update(id, data),
    });
  });

export const DELETE = (_req: Request, { params }: Ctx) =>
  handle(async () => {
    const me = await requireAdmin();
    const { id } = await params;
    await usersOf(me.organizationId).remove(id);
    return new Response(null, { status: 204 });
  });
