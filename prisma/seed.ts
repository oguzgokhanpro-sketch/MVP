// DEVELOPMENT ONLY. These credentials are public and must never be used in production.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES, DEFAULT_THEMES } from "../lib/db/defaults";

const db = new PrismaClient();
const DEV_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  const organization =
    (await db.organization.findFirst({
      where: { name: "Organisation Demo" },
    })) ??
    (await db.organization.create({ data: { name: "Organisation Demo" } }));

  const users = [
    { name: "Admin Demo", email: "admin@example.test", role: "ADMIN" as const },
    {
      name: "Member Demo",
      email: "member@example.test",
      role: "MEMBER" as const,
    },
  ];
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash, organizationId: organization.id },
    });
  }
  await seedReferentials(organization.id);
  console.log(
    `Seeded "Organisation Demo": admin@example.test / member@example.test (password: ${DEV_PASSWORD})`,
  );
}

// Fictitious development data (*.example.test); only created when the organization has none.
async function seedReferentials(organizationId: string) {
  const seedNames = async (
    model: "category" | "theme",
    names: readonly string[],
  ) => {
    const delegate = db[model] as unknown as {
      count(a: object): Promise<number>;
      createMany(a: object): Promise<unknown>;
    };
    if ((await delegate.count({ where: { organizationId } })) > 0) return;
    await delegate.createMany({
      data: names.map((name, sortOrder) => ({
        organizationId,
        name,
        isDefault: true,
        sortOrder,
      })),
    });
  };
  await seedNames("category", DEFAULT_CATEGORIES);
  await seedNames("theme", DEFAULT_THEMES);

  if ((await db.company.count({ where: { organizationId } })) > 0) return;
  const companies = [
    {
      name: "Acme Demo",
      domain: "acme.example.test",
      mrr: 8333.33,
      arr: 100000,
    },
    {
      name: "Beta Demo",
      domain: "beta.example.test",
      mrr: 4166.67,
      arr: 50000,
    },
    { name: "Gamma Demo", domain: "gamma.example.test", mrr: 1200, arr: null },
    { name: "Delta Demo", domain: "delta.example.test", mrr: null, arr: 24000 },
    {
      name: "Epsilon Demo (archivée)",
      domain: "epsilon.example.test",
      mrr: null,
      arr: null,
      active: false,
    },
  ];
  const created = [];
  for (const c of companies)
    created.push(await db.company.create({ data: { ...c, organizationId } }));
  const contacts = [
    { name: "Alice Demo", email: "alice@acme.example.test", role: "CTO" },
    {
      name: "Bob Demo",
      email: "bob@acme.example.test",
      role: "Product Manager",
    },
    {
      name: "Chloé Demo",
      email: "chloe@beta.example.test",
      phone: "+33 1 00 00 00 01",
    },
    { name: "David Demo", email: "david@gamma.example.test", role: "CEO" },
    { name: "Eva Demo", email: "eva@delta.example.test", active: false },
  ];
  const companyIndex = [0, 0, 1, 2, 3];
  for (const [i, c] of contacts.entries())
    await db.contact.create({
      data: { ...c, organizationId, companyId: created[companyIndex[i]!]!.id },
    });
}

main().finally(() => db.$disconnect());
