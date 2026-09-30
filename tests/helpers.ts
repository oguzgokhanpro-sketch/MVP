import { db } from "@/lib/db/client";
import { register } from "@/lib/auth/service";

export { jar } from "./cookie-jar";
import { jar } from "./cookie-jar";

export async function resetDb() {
  jar.clear();
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
