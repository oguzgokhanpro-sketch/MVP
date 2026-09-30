import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./client";
import { NotFoundError } from "@/lib/errors";
import type {
  ContactListQuery,
  CreateContactInput,
  UpdateContactInput,
} from "@/lib/validation/referentials";

const isUuid = (id: string) => z.uuid().safeParse(id).success;
const notFound = () => new NotFoundError("Contact not found");
const companyNotFound = () => new NotFoundError("Company not found");

/**
 * All contact access for a tenant goes through here. A companyId from another organization
 * behaves like a missing company (NotFoundError), on read filters, creation and update.
 * No physical delete: contacts are archived with `active: false`.
 */
export function contactsOf(organizationId: string) {
  async function assertCompany(
    tx: Prisma.TransactionClient | typeof db,
    companyId: string,
  ) {
    const company = await tx.company.findFirst({
      where: { id: companyId, organizationId },
      select: { id: true },
    });
    if (!company) throw companyNotFound();
  }

  return {
    async list(query: ContactListQuery) {
      if (query.companyId) await assertCompany(db, query.companyId);
      const where: Prisma.ContactWhereInput = {
        organizationId,
        active: query.status === "active",
        ...(query.companyId && { companyId: query.companyId }),
      };
      const [items, total] = await db.$transaction([
        db.contact.findMany({
          where,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        db.contact.count({ where }),
      ]);
      return { items, total, page: query.page, pageSize: query.pageSize };
    },

    async get(id: string) {
      if (!isUuid(id)) throw notFound();
      const contact = await db.contact.findFirst({
        where: { id, organizationId },
      });
      if (!contact) throw notFound();
      return contact;
    },

    async create(data: CreateContactInput) {
      await assertCompany(db, data.companyId);
      return db.contact.create({ data: { ...data, organizationId } });
    },

    async update(id: string, data: UpdateContactInput) {
      if (!isUuid(id)) throw notFound();
      return db.$transaction(async (tx) => {
        if (data.companyId) await assertCompany(tx, data.companyId);
        const { count } = await tx.contact.updateMany({
          where: { id, organizationId },
          data,
        });
        if (count === 0) throw notFound();
        return tx.contact.findUniqueOrThrow({ where: { id } });
      });
    },
  };
}
