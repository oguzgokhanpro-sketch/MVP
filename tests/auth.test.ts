import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { getCurrentUser, requireAuth } from "@/lib/permissions";
import { UnauthorizedError } from "@/lib/errors";
import { jar, req, resetDb } from "./helpers";

const valid = {
  name: "Alice",
  email: "Alice@Example.test",
  password: "password123",
  organizationName: "Acme",
};

beforeEach(resetDb);

describe("register", () => {
  it("creates the organization and an ADMIN user, and signs them in", async () => {
    const res = await registerRoute(req("POST", valid));
    expect(res.status).toBe(201);

    const user = await db.user.findUniqueOrThrow({
      where: { email: "alice@example.test" },
      include: { organization: true },
    });
    expect(user.role).toBe("ADMIN");
    expect(user.active).toBe(true);
    expect(user.organization.name).toBe("Acme");
    expect(user.passwordHash).not.toContain("password123");
    expect((await getCurrentUser())?.id).toBe(user.id);
  });

  it.each([
    ["bad email", { ...valid, email: "nope" }],
    ["short password", { ...valid, password: "short" }],
    ["empty organization", { ...valid, organizationName: " " }],
    ["missing name", { ...valid, name: undefined }],
  ])("rejects invalid input: %s", async (_label, body) => {
    const res = await registerRoute(req("POST", body));
    expect(res.status).toBe(400);
    expect(await db.user.count()).toBe(0);
    expect(await db.organization.count()).toBe(0);
  });

  it("rejects a duplicate email without creating an organization", async () => {
    await registerRoute(req("POST", valid));
    const res = await registerRoute(req("POST", valid));
    expect(res.status).toBe(409);
    expect(await db.organization.count()).toBe(1);
  });
});

describe("login / logout", () => {
  beforeEach(async () => {
    await registerRoute(req("POST", valid));
    jar.clear();
  });

  it("logs in with valid credentials", async () => {
    const res = await loginRoute(
      req("POST", { email: "alice@example.test", password: "password123" }),
    );
    expect(res.status).toBe(200);
    expect(await getCurrentUser()).not.toBeNull();
  });

  it("rejects a wrong password with a generic message", async () => {
    const res = await loginRoute(
      req("POST", { email: "alice@example.test", password: "wrong-password" }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe("Invalid email or password");
    expect(await getCurrentUser()).toBeNull();
  });

  it("rejects an unknown email the same way", async () => {
    const res = await loginRoute(
      req("POST", { email: "ghost@example.test", password: "password123" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a deactivated user, including an existing session", async () => {
    await loginRoute(
      req("POST", { email: "alice@example.test", password: "password123" }),
    );
    await db.user.updateMany({ data: { active: false } });
    expect(await getCurrentUser()).toBeNull();
    const res = await loginRoute(
      req("POST", { email: "alice@example.test", password: "password123" }),
    );
    expect(res.status).toBe(401);
  });

  it("logs out: session removed and redirect to /connexion", async () => {
    await loginRoute(
      req("POST", { email: "alice@example.test", password: "password123" }),
    );
    const res = await logoutRoute();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/connexion");
    expect(await getCurrentUser()).toBeNull();
  });

  it("ignores a forged session cookie", async () => {
    jar.set("session", "not-a-jwt");
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("protected access", () => {
  it("requireAuth (used by /tableau-de-bord) rejects without a session", async () => {
    await expect(requireAuth()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
