import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./client";
import { ConflictError, NotFoundError } from "@/lib/errors";

const isUuid = (id: string) => z.uuid().safeParse(id).success;

type Row = {
  id: string;
  organizationId: string;
  name: string;
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
};

// Categories and themes share the same shape; this is the minimal delegate surface we use.
type Delegate = {
  findMany(args: object): Promise<Row[]>;
  findFirst(args: object): Promise<Row | null>;
  aggregate(args: object): Promise<{ _max: { sortOrder: number | null } }>;
  create(args: object): Promise<Row>;
  updateMany(args: object): Promise<{ count: number }>;
  update(args: object): Promise<Row>;
};

function makeReferentialOf(
  label: string,
  pick: (tx: Prisma.TransactionClient) => Delegate,
) {
  const notFound = () => new NotFoundError(`${label} not found`);
  const duplicate = () => new ConflictError(`${label} name already exists`);
  const isDuplicate = (e: unknown) =>
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

  return (organizationId: string) => ({
    list: (): Promise<Row[]> =>
      pick(db).findMany({
        where: { organizationId },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      }),

    async get(id: string) {
      if (!isUuid(id)) throw notFound();
      const row = await pick(db).findFirst({ where: { id, organizationId } });
      if (!row) throw notFound();
      return row;
    },

    async create(name: string) {
      try {
        return await db.$transaction(async (tx) => {
          // Serialize concurrent creations in the organization so sort_order stays unique.
          await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
          const { _max } = await pick(tx).aggregate({
            where: { organizationId },
            _max: { sortOrder: true },
          });
          return pick(tx).create({
            data: {
              organizationId,
              name,
              sortOrder: (_max.sortOrder ?? -1) + 1,
            },
          });
        });
      } catch (e) {
        if (isDuplicate(e)) throw duplicate();
        throw e;
      }
    },

    async update(id: string, data: { name?: string; active?: boolean }) {
      if (!isUuid(id)) throw notFound();
      try {
        const { count } = await pick(db).updateMany({
          where: { id, organizationId },
          data,
        });
        if (count === 0) throw notFound();
      } catch (e) {
        if (isDuplicate(e)) throw duplicate();
        throw e;
      }
      return this.get(id);
    },

    /** `ids` must list every row of the organization exactly once, in the new display order. */
    async reorder(ids: string[]) {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
        const current = await pick(tx).findMany({ where: { organizationId } });
        const known = new Set(current.map((r) => r.id));
        const valid =
          ids.length === known.size &&
          new Set(ids).size === ids.length &&
          ids.every((id) => known.has(id));
        // Foreign or unknown ids behave like missing rows.
        if (!valid) throw notFound();
        for (const [sortOrder, id] of ids.entries()) {
          await pick(tx).updateMany({
            where: { id, organizationId },
            data: { sortOrder },
          });
        }
      });
      return this.list();
    },
  });
}

export const categoriesOf = makeReferentialOf(
  "Category",
  (tx) => tx.category as unknown as Delegate,
);
export const themesOf = makeReferentialOf(
  "Theme",
  (tx) => tx.theme as unknown as Delegate,
);
