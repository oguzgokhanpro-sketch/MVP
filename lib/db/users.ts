import type { Role } from "@prisma/client";
import { db } from "./client";
import { z } from "zod";
import { NotFoundError } from "@/lib/errors";

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
 * All user access for a tenant goes through here. The organizationId comes from the
 * authenticated session (see lib/permissions), never from the request.
 * Rows of another organization behave exactly like missing rows (NotFoundError).
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
      const { count } = await db.user.updateMany({
        where: { id, organizationId },
        data,
      });
      if (count === 0) throw new NotFoundError("User not found");
      return this.get(id);
    },

    async remove(id: string) {
      if (!isUuid(id)) throw new NotFoundError("User not found");
      const { count } = await db.user.deleteMany({
        where: { id, organizationId },
      });
      if (count === 0) throw new NotFoundError("User not found");
    },
  };
}
