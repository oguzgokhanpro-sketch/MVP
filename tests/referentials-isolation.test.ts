import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import * as companies from "@/app/api/companies/route";
import * as company from "@/app/api/companies/[id]/route";
import * as contacts from "@/app/api/contacts/route";
import * as contact from "@/app/api/contacts/[id]/route";
import * as categories from "@/app/api/categories/route";
import * as category from "@/app/api/categories/[id]/route";
import * as categoriesReorder from "@/app/api/categories/reorder/route";
import * as themes from "@/app/api/themes/route";
import * as theme from "@/app/api/themes/[id]/route";
import * as themesReorder from "@/app/api/themes/reorder/route";
import {
  actAs,
  ctx,
  qreq,
  req,
  resetDb,
  signOutLocally,
  signUp,
} from "./helpers";

type Ids = {
  company: string;
  contact: string;
  category: string;
  theme: string;
};
const ids: Record<"A" | "B", Ids> = {} as never;

async function seedOrg(label: "A" | "B") {
  signOutLocally();
  await signUp(label);
  const c = await (
    await companies.POST(req("POST", { name: `Co ${label}` }))
  ).json();
  const k = await (
    await contacts.POST(
      req("POST", { name: `Ct ${label}`, companyId: c.company.id }),
    )
  ).json();
  const cat = await db.category.findFirstOrThrow({
    where: { organization: { name: `Org ${label}` } },
  });
  const th = await db.theme.findFirstOrThrow({
    where: { organization: { name: `Org ${label}` } },
  });
  ids[label] = {
    company: c.company.id,
    contact: k.contact.id,
    category: cat.id,
    theme: th.id,
  };
}

beforeEach(async () => {
  await resetDb();
  await seedOrg("A");
  await seedOrg("B");
});

describe.each([
  ["A", "B"],
  ["B", "A"],
] as const)("user of org %s vs data of org %s", (me, other) => {
  beforeEach(() => actAs(`${me.toLowerCase()}@example.test`));
  const o = () => ids[other];

  it("reads of another organization's rows return 404", async () => {
    expect((await company.GET(req("GET"), ctx(o().company))).status).toBe(404);
    expect((await contact.GET(req("GET"), ctx(o().contact))).status).toBe(404);
  });

  it("updates and archiving of another organization's rows return 404 and change nothing", async () => {
    for (const [route, id] of [
      [company, o().company],
      [contact, o().contact],
      [category, o().category],
      [theme, o().theme],
    ] as const) {
      const res = await route.PATCH(req("PATCH", { active: false }), ctx(id));
      expect(res.status).toBe(404);
      const res2 = await route.PATCH(req("PATCH", { name: "Hacked" }), ctx(id));
      expect(res2.status).toBe(404);
    }
    expect(
      (await db.company.findUniqueOrThrow({ where: { id: o().company } }))
        .active,
    ).toBe(true);
    expect(
      (await db.contact.findUniqueOrThrow({ where: { id: o().contact } })).name,
    ).toBe(`Ct ${other}`);
    expect(
      (await db.category.findUniqueOrThrow({ where: { id: o().category } }))
        .active,
    ).toBe(true);
    expect(
      (await db.theme.findUniqueOrThrow({ where: { id: o().theme } })).active,
    ).toBe(true);
  });

  it("lists never contain rows of another organization", async () => {
    const cs = await (
      await companies.GET(qreq("/api/companies?status=active"))
    ).json();
    expect(cs.items.map((c: { id: string }) => c.id)).toEqual([
      ids[me].company,
    ]);
    const ks = await (await contacts.GET(qreq("/api/contacts"))).json();
    expect(ks.items.map((c: { id: string }) => c.id)).toEqual([
      ids[me].contact,
    ]);
    const cats = await (await categories.GET()).json();
    expect(
      cats.categories.every(
        (c: { organizationId: string }) => c.organizationId !== undefined,
      ),
    ).toBe(true);
    expect(cats.categories.map((c: { id: string }) => c.id)).not.toContain(
      o().category,
    );
    const ths = await (await themes.GET()).json();
    expect(ths.themes.map((t: { id: string }) => t.id)).not.toContain(
      o().theme,
    );
  });

  it("searching by another organization's company name finds nothing", async () => {
    const res = await (
      await companies.GET(qreq(`/api/companies?q=Co%20${other}`))
    ).json();
    expect(res.items).toEqual([]);
  });

  it("creating a contact for another organization's company is refused like a missing company", async () => {
    const res = await contacts.POST(
      req("POST", { name: "X", companyId: o().company }),
    );
    expect(res.status).toBe(404);
    expect(await db.contact.count({ where: { companyId: o().company } })).toBe(
      1,
    );
  });

  it("moving a contact to another organization's company is refused", async () => {
    const res = await contact.PATCH(
      req("PATCH", { companyId: o().company }),
      ctx(ids[me].contact),
    );
    expect(res.status).toBe(404);
    expect(
      (await db.contact.findUniqueOrThrow({ where: { id: ids[me].contact } }))
        .companyId,
    ).toBe(ids[me].company);
  });

  it("filtering contacts by another organization's company is refused", async () => {
    const res = await contacts.GET(
      qreq(`/api/contacts?companyId=${o().company}`),
    );
    expect(res.status).toBe(404);
  });

  it("reordering with another organization's ids is refused", async () => {
    for (const [route, model] of [
      [categoriesReorder, "category"],
      [themesReorder, "theme"],
    ] as const) {
      const delegate = db[model] as unknown as {
        findMany(a: object): Promise<{ id: string }[]>;
      };
      const mine = (
        await delegate.findMany({
          where: { organization: { name: `Org ${me}` } },
        })
      ).map((r) => r.id);
      const foreign = (
        await delegate.findMany({
          where: { organization: { name: `Org ${other}` } },
        })
      ).map((r) => r.id);
      const res = await route.POST(
        req("POST", { ids: [...mine.slice(1), foreign[0]] }),
      );
      expect(res.status).toBe(404);
    }
  });
});
