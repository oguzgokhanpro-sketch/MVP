import type { Role } from "@prisma/client";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
};

/** The user of the current session, read fresh from the DB; null if not signed in or deactivated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.user.findFirst({
    where: { id: userId, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationId: true,
    },
  });
  return user;
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export function assertAdmin(user: CurrentUser): void {
  if (user.role !== "ADMIN") throw new ForbiddenError();
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireAuth();
  assertAdmin(user);
  return user;
}

/** The organization of the authenticated user. This is the only source of tenant identity. */
export async function getCurrentOrganization() {
  const user = await requireAuth();
  return db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { id: true, name: true },
  });
}
