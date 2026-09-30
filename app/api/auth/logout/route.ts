import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST() {
  await destroySession();
  // Relative redirect: behind Docker/proxies the request URL host (e.g. 0.0.0.0) is not the public one.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/connexion" },
  });
}
