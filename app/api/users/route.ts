import { NextResponse } from "next/server";
import { handle } from "@/lib/api";
import { usersOf } from "@/lib/db/users";
import { requireAuth } from "@/lib/permissions";

export const GET = () =>
  handle(async () => {
    const user = await requireAuth();
    return NextResponse.json({
      users: await usersOf(user.organizationId).list(),
    });
  });
