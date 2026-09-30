import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// First line of defence: redirect unauthenticated visitors away from private pages.
// Real authorization (user still active, role, organization) happens in lib/permissions.
// Only private areas are matched (see `config`), so unknown URLs fall through to the 404 page.
export async function middleware(req: NextRequest) {
  if (await hasValidSession(req)) return NextResponse.next();
  return NextResponse.redirect(new URL("/connexion", req.url));
}

async function hasValidSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

// Add every new private section here (e.g. "/entreprises/:path*").
export const config = {
  matcher: [
    "/tableau-de-bord/:path*",
    "/entreprises/:path*",
    "/parametres/:path*",
  ],
};
