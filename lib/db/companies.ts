import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./client";
import { NotFoundError } from "@/lib/errors";
import type {
  CompanyListQuery,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "@/lib/validation/referentials";

const isUuid = (id: string) => z.uuid().safeParse(id).success;
const notFound = () => new NotFoundError("Company not found");

/**
 * All company access for a tenant goes through here (organizationId comes from the session).
 * Rows of another organization behave like missing rows (NotFoundError). No physical delete:
 * companies are archived with `active: false`.
 */
export function companiesOf(organizationId: string) {
  return {
    async list(query: CompanyListQuery) {
      const where: Prisma.CompanyWhereInput = {
        organizationId,
        active: query.status === "active",
        ...(query.q && {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { domain: { contains: query.q, mode: "insensitive" } },
          ],
        }),
      };
      const skip = (query.page - 1) * query.pageSize;
      const total = await db.company.count({ where });
      if (query.sort === "name") {
        // Prisma cannot sort case-insensitively, so page the ids in SQL, then load the rows.
        const pattern = query.q
          ? `%${query.q.replace(/[\\%_]/g, "\\$&")}%`
          : null;
        const direction =
          query.order === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;
        const rows = await db.$queryRaw<{ id: string }[]>`
          SELECT id FROM companies
          WHERE organization_id = ${organizationId}::uuid
            AND active = ${query.status === "active"}
            AND (${pattern}::text IS NULL OR name ILIKE ${pattern} OR domain ILIKE ${pattern})
          ORDER BY lower(name) ${direction}, id ASC
          LIMIT ${query.pageSize} OFFSET ${skip}`;
        const found = await db.company.findMany({
          where: { organizationId, id: { in: rows.map((r) => r.id) } },
        });
        const byId = new Map(found.map((c) => [c.id, c]));
        const items = rows.map((r) => byId.get(r.id)!);
        return { items, total, page: query.page, pageSize: query.pageSize };
      }
      const orderBy: Prisma.CompanyOrderByWithRelationInput[] = [
        query.sort === "createdAt"
          ? { createdAt: query.order }
          : { [query.sort]: { sort: query.order, nulls: "last" } },
        { id: "asc" },
      ];
      const items = await db.company.findMany({
        where,
        orderBy,
        skip,
        take: query.pageSize,
      });
      return { items, total, page: query.page, pageSize: query.pageSize };
    },

    async get(id: string) {
      if (!isUuid(id)) throw notFound();
      const company = await db.company.findFirst({
        where: { id, organizationId },
      });
      if (!company) throw notFound();
      return company;
    },

    create(data: CreateCompanyInput) {
      return db.company.create({ data: { ...data, organizationId } });
    },

    async update(id: string, data: UpdateCompanyInput) {
      if (!isUuid(id)) throw notFound();
      const { count } = await db.company.updateMany({
        where: { id, organizationId },
        data,
      });
      if (count === 0) throw notFound();
      return this.get(id);
    },
  };
}
