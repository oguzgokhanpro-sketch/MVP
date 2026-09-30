import { db } from "@/lib/db/client";
import { register } from "@/lib/auth/service";

export { jar } from "./cookie-jar";
import { jar } from "./cookie-jar";

export async function resetDb() {
  jar.clear();
  await db.contact.deleteMany();
  await db.company.deleteMany();
  await db.category.deleteMany();
  await db.theme.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();
}

/** Registers a user + org and leaves that user signed in. Returns the new user's id. */
export async function signUp(label: string) {
  const { id } = await register({
    name: `User ${label}`,
    email: `${label.toLowerCase()}@example.test`,
    password: "password123",
    organizationName: `Org ${label}`,
  });
  return id;
}

export const signOutLocally = () => jar.clear();

export function req(method: string, body?: unknown) {
  return new Request("http://localhost:3000/api/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

/** Signs in an existing user of the test orgs ("A", "B"...) — or a member added by addMember. */
export async function actAs(email: string) {
  const { login } = await import("@/lib/auth/service");
  jar.clear();
  await login({ email, password: "password123" });
}

/** Adds an active MEMBER to the org of the currently signed-in user; returns their email. */
export async function addMember(label: string) {
  const { getCurrentUser } = await import("@/lib/permissions");
  const me = (await getCurrentUser())!;
  const { hashPassword } = await import("@/lib/auth/password");
  const email = `${label.toLowerCase()}@example.test`;
  await db.user.create({
    data: {
      name: `Member ${label}`,
      email,
      role: "MEMBER",
      passwordHash: await hashPassword("password123"),
      organizationId: me.organizationId,
    },
  });
  return email;
}

export const qreq = (path: string) =>
  new Request(`http://localhost:3000${path}`);
