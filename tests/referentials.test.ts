import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { DEFAULT_CATEGORIES, DEFAULT_THEMES } from "@/lib/db/defaults";
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
  addMember,
  ctx,
  qreq,
  req,
  resetDb,
  signOutLocally,
  signUp,
} from "./helpers";

beforeEach(async () => {
  await resetDb();
  await signUp("A");
});

const json = async (p: Promise<Response>) => (await p).json();

describe("registration", () => {
  it("creates the default categories and themes for the new organization", async () => {
    const { categories: cats } = await json(categories.GET());
    expect(cats.map((c: { name: string }) => c.name)).toEqual([
      ...DEFAULT_CATEGORIES,
    ]);
    const { themes: ths } = await json(themes.GET());
    expect(ths.map((t: { name: string }) => t.name)).toEqual([
      ...DEFAULT_THEMES,
    ]);
    expect(
      cats.every(
        (c: { isDefault: boolean; active: boolean }) => c.isDefault && c.active,
      ),
    ).toBe(true);
  });
});

describe("authentication", () => {
  it("rejects every endpoint without a session with 401", async () => {
    signOutLocally();
    const id = "00000000-0000-4000-8000-000000000000";
    const calls = [
      companies.GET(qreq("/api/companies")),
      companies.POST(req("POST", { name: "x" })),
      company.GET(req("GET"), ctx(id)),
      company.PATCH(req("PATCH", {}), ctx(id)),
      contacts.GET(qreq("/api/contacts")),
      contacts.POST(req("POST", {})),
      contact.GET(req("GET"), ctx(id)),
      contact.PATCH(req("PATCH", {}), ctx(id)),
      categories.GET(),
      categories.POST(req("POST", { name: "x" })),
      category.PATCH(req("PATCH", {}), ctx(id)),
      categoriesReorder.POST(req("POST", { ids: [] })),
      themes.GET(),
      themes.POST(req("POST", { name: "x" })),
      theme.PATCH(req("PATCH", {}), ctx(id)),
      themesReorder.POST(req("POST", { ids: [] })),
    ];
    for (const res of await Promise.all(calls)) expect(res.status).toBe(401);
  });
});

describe("permissions", () => {
  it("Member: read-only on categories and themes (403), full access on companies and contacts", async () => {
    const email = await addMember("M");
    await actAs(email);

    const cat = (await json(categories.GET())).categories[0];
    const th = (await json(themes.GET())).themes[0];
    expect((await categories.GET()).status).toBe(200);
    expect(
      (await categories.POST(req("POST", { name: "Nouveau" }))).status,
    ).toBe(403);
    expect(
      (await category.PATCH(req("PATCH", { name: "Z" }), ctx(cat.id))).status,
    ).toBe(403);
    expect(
      (await categoriesReorder.POST(req("POST", { ids: [cat.id] }))).status,
    ).toBe(403);
    expect((await themes.POST(req("POST", { name: "Nouveau" }))).status).toBe(
      403,
    );
    expect(
      (await theme.PATCH(req("PATCH", { active: false }), ctx(th.id))).status,
    ).toBe(403);
    expect(
      (await themesReorder.POST(req("POST", { ids: [th.id] }))).status,
    ).toBe(403);

    const created = await companies.POST(req("POST", { name: "Member Co" }));
    expect(created.status).toBe(201);
    const { company: co } = await created.json();
    expect(
      (await company.PATCH(req("PATCH", { name: "Renamed" }), ctx(co.id)))
        .status,
    ).toBe(200);
    const k = await contacts.POST(
      req("POST", { name: "Ct", companyId: co.id }),
    );
    expect(k.status).toBe(201);
    const { contact: ct } = await k.json();
    expect(
      (await contact.PATCH(req("PATCH", { active: false }), ctx(ct.id))).status,
    ).toBe(200);
    expect(
      (await company.PATCH(req("PATCH", { active: false }), ctx(co.id))).status,
    ).toBe(200);
  });
});

describe("companies", () => {
  it("archives and reactivates; archived companies leave the default list", async () => {
    const { company: c } = await json(
      companies.POST(req("POST", { name: "Acme" })),
    );
    await company.PATCH(req("PATCH", { active: false }), ctx(c.id));
    expect(
      (await json(companies.GET(qreq("/api/companies")))).items,
    ).toHaveLength(0);
    const archived = await json(
      companies.GET(qreq("/api/companies?status=archived")),
    );
    expect(archived.items.map((x: { id: string }) => x.id)).toEqual([c.id]);
    await company.PATCH(req("PATCH", { active: true }), ctx(c.id));
    expect(
      (await json(companies.GET(qreq("/api/companies")))).items,
    ).toHaveLength(1);
  });

  it("archiving a company does not cascade to its contacts", async () => {
    const { company: c } = await json(
      companies.POST(req("POST", { name: "Acme" })),
    );
    const { contact: k } = await json(
      contacts.POST(req("POST", { name: "Al", companyId: c.id })),
    );
    await company.PATCH(req("PATCH", { active: false }), ctx(c.id));
    expect(
      (await db.contact.findUniqueOrThrow({ where: { id: k.id } })).active,
    ).toBe(true);
  });

  it("validates input: required name, domain format, non-negative amounts", async () => {
    const bad = [
      {},
      { name: "  " },
      { name: "A", domain: "not a domain" },
      { name: "A", domain: "localhost" },
      { name: "A", mrr: -1 },
      { name: "A", arr: -0.01 },
      { name: "A", mrr: "12" },
      { name: "A", unknown: 1 },
    ];
    for (const body of bad) {
      expect((await companies.POST(req("POST", body))).status).toBe(400);
    }
    const { company: c } = await json(
      companies.POST(req("POST", { name: "A" })),
    );
    expect(
      (await company.PATCH(req("PATCH", { mrr: -5 }), ctx(c.id))).status,
    ).toBe(400);
  });

  it("normalizes the domain (lowercase, no scheme, no path)", async () => {
    const { company: c } = await json(
      companies.POST(
        req("POST", { name: "A", domain: "HTTPS://WWW.Acme.COM/pricing?x=1" }),
      ),
    );
    expect(c.domain).toBe("www.acme.com");
  });

  it("MRR and ARR are independent", async () => {
    const { company: c } = await json(
      companies.POST(req("POST", { name: "A", mrr: 100, arr: 5000 })),
    );
    const r1 = await json(
      company.PATCH(req("PATCH", { mrr: 250.5 }), ctx(c.id)),
    );
    expect(Number(r1.company.mrr)).toBe(250.5);
    expect(Number(r1.company.arr)).toBe(5000);
    const r2 = await json(company.PATCH(req("PATCH", { arr: 1 }), ctx(c.id)));
    expect(Number(r2.company.mrr)).toBe(250.5);
    expect(Number(r2.company.arr)).toBe(1);
    const r3 = await json(
      company.PATCH(req("PATCH", { mrr: null }), ctx(c.id)),
    );
    expect(r3.company.mrr).toBeNull();
    expect(Number(r3.company.arr)).toBe(1);
  });

  it("paginates, searches (name and domain) and sorts on the server", async () => {
    for (const [name, domain, mrr, arr] of [
      ["Charlie", "charlie.example.test", 30, 300],
      ["alpha", "zulu.example.test", 10, null],
      ["Bravo", "bravo.example.test", null, 100],
    ] as const)
      await companies.POST(req("POST", { name, domain, mrr, arr }));

    const names = async (qs: string) =>
      (await json(companies.GET(qreq(`/api/companies?${qs}`)))).items.map(
        (c: { name: string }) => c.name,
      );

    expect(await names("sort=name")).toEqual(["alpha", "Bravo", "Charlie"]);
    expect(await names("sort=name&order=desc")).toEqual([
      "Charlie",
      "Bravo",
      "alpha",
    ]);
    expect(await names("sort=mrr&order=asc")).toEqual([
      "alpha",
      "Charlie",
      "Bravo",
    ]);
    expect(await names("sort=mrr&order=desc")).toEqual([
      "Charlie",
      "alpha",
      "Bravo",
    ]);
    expect(await names("sort=arr&order=desc")).toEqual([
      "Charlie",
      "Bravo",
      "alpha",
    ]);
    expect(await names("sort=createdAt&order=desc")).toEqual([
      "Bravo",
      "alpha",
      "Charlie",
    ]);
    expect(await names("q=ZULU")).toEqual(["alpha"]);
    expect(await names("q=brav")).toEqual(["Bravo"]);

    const p2 = await json(
      companies.GET(qreq("/api/companies?pageSize=2&page=2")),
    );
    expect(p2.total).toBe(3);
    expect(p2.items).toHaveLength(1);
    expect(
      (await companies.GET(qreq("/api/companies?pageSize=1000"))).status,
    ).toBe(400);
    expect((await companies.GET(qreq("/api/companies?sort=drop"))).status).toBe(
      400,
    );
  });
});

describe("contacts", () => {
  it("creates, edits, archives and reactivates a contact; archived leave the default list", async () => {
    const { company: c } = await json(
      companies.POST(req("POST", { name: "Acme" })),
    );
    const { contact: k } = await json(
      contacts.POST(
        req("POST", {
          name: "Al",
          email: "AL@Acme.test",
          role: "CTO",
          companyId: c.id,
        }),
      ),
    );
    expect(k.email).toBe("al@acme.test");
    const upd = await json(
      contact.PATCH(req("PATCH", { phone: "0102", role: null }), ctx(k.id)),
    );
    expect(upd.contact.phone).toBe("0102");
    expect(upd.contact.role).toBeNull();

    const list = (qs = "") =>
      json(contacts.GET(qreq(`/api/contacts?companyId=${c.id}${qs}`)));
    await contact.PATCH(req("PATCH", { active: false }), ctx(k.id));
    expect((await list()).items).toHaveLength(0);
    expect((await list("&status=archived")).items).toHaveLength(1);
    await contact.PATCH(req("PATCH", { active: true }), ctx(k.id));
    expect((await list()).items).toHaveLength(1);
  });

  it("requires a company and validates email", async () => {
    const { company: c } = await json(
      companies.POST(req("POST", { name: "Acme" })),
    );
    expect((await contacts.POST(req("POST", { name: "Al" }))).status).toBe(400);
    expect(
      (await contacts.POST(req("POST", { name: "", companyId: c.id }))).status,
    ).toBe(400);
    expect(
      (
        await contacts.POST(
          req("POST", { name: "Al", companyId: c.id, email: "nope" }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await contacts.POST(
          req("POST", { name: "Al", companyId: "not-a-uuid" }),
        )
      ).status,
    ).toBe(400);
  });
});

describe("categories and themes", () => {
  it.each([
    [
      "categories",
      categories,
      category,
      categoriesReorder,
      "categories",
      "category",
    ],
    ["themes", themes, theme, themesReorder, "themes", "theme"],
  ] as const)(
    "%s: create, rename, deactivate, reactivate, reorder, unique names",
    async (_n, list, item, reorder, plural, singular) => {
      const items = async () =>
        (await json(list.GET()))[plural] as {
          id: string;
          name: string;
          active: boolean;
          sortOrder: number;
        }[];
      const before = await items();

      const created = await list.POST(req("POST", { name: "Custom" }));
      expect(created.status).toBe(201);
      const c = (await created.json())[singular];
      expect(c.isDefault).toBe(false);
      expect(c.sortOrder).toBe(before.length);

      // Unique within the organization, ignoring case.
      expect((await list.POST(req("POST", { name: "custom" }))).status).toBe(
        409,
      );
      expect(
        (await list.POST(req("POST", { name: before[0]!.name.toUpperCase() })))
          .status,
      ).toBe(409);
      expect((await list.POST(req("POST", { name: "  " }))).status).toBe(400);

      const renamed = await item.PATCH(
        req("PATCH", { name: "Renamed" }),
        ctx(c.id),
      );
      expect((await renamed.json())[singular].name).toBe("Renamed");
      expect(
        (await item.PATCH(req("PATCH", { name: before[0]!.name }), ctx(c.id)))
          .status,
      ).toBe(409);

      await item.PATCH(req("PATCH", { active: false }), ctx(c.id));
      expect((await items()).find((i) => i.id === c.id)!.active).toBe(false);
      await item.PATCH(req("PATCH", { active: true }), ctx(c.id));
      expect((await items()).find((i) => i.id === c.id)!.active).toBe(true);

      // Reorder: reverse everything.
      const ids = (await items()).map((i) => i.id).reverse();
      const res = await reorder.POST(req("POST", { ids }));
      expect(res.status).toBe(200);
      expect((await items()).map((i) => i.id)).toEqual(ids);

      // Partial, duplicated or unknown id lists are refused.
      expect(
        (await reorder.POST(req("POST", { ids: ids.slice(1) }))).status,
      ).toBe(404);
      expect(
        (await reorder.POST(req("POST", { ids: [...ids.slice(1), ids[1]] })))
          .status,
      ).toBe(404);
      expect((await reorder.POST(req("POST", { ids: ["nope"] }))).status).toBe(
        400,
      );
    },
  );

  it("the same name may exist in two organizations", async () => {
    signOutLocally();
    await signUp("B");
    expect(
      (await categories.POST(req("POST", { name: "Custom" }))).status,
    ).toBe(201);
    await actAs("a@example.test");
    expect(
      (await categories.POST(req("POST", { name: "Custom" }))).status,
    ).toBe(201);
  });
});

describe("no physical deletion", () => {
  it("exposes no DELETE handler on Lot 2 routes", () => {
    for (const mod of [
      companies,
      company,
      contacts,
      contact,
      categories,
      category,
      themes,
      theme,
      categoriesReorder,
      themesReorder,
    ])
      expect("DELETE" in mod).toBe(false);
  });
});
