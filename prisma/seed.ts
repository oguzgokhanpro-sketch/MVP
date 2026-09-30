// DEVELOPMENT ONLY. These credentials are public and must never be used in production.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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
  console.log(
    `Seeded "Organisation Demo": admin@example.test / member@example.test (password: ${DEV_PASSWORD})`,
  );
}

main().finally(() => db.$disconnect());
