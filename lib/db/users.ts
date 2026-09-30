import { Prisma, type Role } from "@prisma/client";
import { z } from "zod";
import { db } from "./client";
import { LastAdminError, NotFoundError } from "@/lib/errors";

const isUuid = (id: string) => z.uuid().safeParse(id).success;

// Never expose passwordHash outside the auth module.
export const publicUserSelect = {
  id: true,
  organizationId: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UserUpdate = { name?: string; role?: Role; active?: boolean };

/**
 * Runs `fn` with the organization row locked, so concurrent admin changes in the same
 * organization are serialized (two admins demoting each other cannot both succeed).
 */
function withOrganizationLock<T>(
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
    return fn(tx);
  });
}

/** Throws if `target` is the only active admin of the organization. */
async function assertNotLastAdmin(
  tx: Prisma.TransactionClient,
  organizationId: string,
  target: { id: string; role: Role; active: boolean },
) {
  if (target.role !== "ADMIN" || !target.active) return;
  const otherAdmins = await tx.user.count({
    where: {
      organizationId,
      role: "ADMIN",
      active: true,
      id: { not: target.id },
    },
  });
  if (otherAdmins === 0) throw new LastAdminError();
}

/**
 * All user access for a tenant goes through here. The organizationId comes from the
 * authenticated session (see lib/permissions), never from the request.
 * Rows of another organization behave exactly like missing rows (NotFoundError).
 * An organization can never be left without an active admin (LastAdminError).
 */
export function usersOf(organizationId: string) {
  return {
    list: () =>
      db.user.findMany({
        where: { organizationId },
        select: publicUserSelect,
        orderBy: { createdAt: "asc" },
      }),

    async get(id: string) {
      if (!isUuid(id)) throw new NotFoundError("User not found");
      const user = await db.user.findFirst({
        where: { id, organizationId },
        select: publicUserSelect,
      });
      if (!user) throw new NotFoundError("User not found");
      return user;
    },

    async update(id: string, data: UserUpdate) {
      if (!isUuid(id)) throw new NotFoundError("User not found");
      return withOrganizationLock(organizationId, async (tx) => {
        const target = await tx.user.findFirst({
          where: { id, organizationId },
          select: { id: true, role: true, active: true },
        });
        if (!target) throw new NotFoundError("User not found");

        const stopsBeingAdmin = data.role === "MEMBER" || data.active === false;
        if (stopsBeingAdmin)
          await assertNotLastAdmin(tx, organizationId, target);

        return tx.user.update({
          where: { id },
          data,
          select: publicUserSelect,
        });
      });
    },

    async remove(id: string) {
      if (!isUuid(id)) throw new NotFoundError("User not found");
      await withOrganizationLock(organizationId, async (tx) => {
        const target = await tx.user.findFirst({
          where: { id, organizationId },
          select: { id: true, role: true, active: true },
        });
        if (!target) throw new NotFoundError("User not found");
        await assertNotLastAdmin(tx, organizationId, target);
        await tx.user.delete({ where: { id } });
      });
    },
  };
}
