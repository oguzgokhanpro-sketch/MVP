import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { login } from "@/lib/auth/service";
import { hashPassword } from "@/lib/auth/password";
import { PATCH } from "@/app/api/users/[id]/route";
import { assertAdmin, requireAdmin } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/errors";
import { ctx, req, resetDb, signOutLocally, signUp } from "./helpers";

let adminId: string;
let memberId: string;

beforeEach(async () => {
  await resetDb();
  adminId = await signUp("Admin");
  const { organizationId } = await db.user.findUniqueOrThrow({
    where: { id: adminId },
  });
  memberId = (
    await db.user.create({
      data: {
        organizationId,
        name: "Member",
        email: "member@example.test",
        passwordHash: await hashPassword("password123"),
        role: "MEMBER",
      },
    })
  ).id;
});

describe("admin-only routes", () => {
  it("allows an Admin", async () => {
    await expect(requireAdmin()).resolves.toMatchObject({ role: "ADMIN" });
    const res = await PATCH(req("PATCH", { name: "Renamed" }), ctx(memberId));
    expect(res.status).toBe(200);
  });

  it("forbids a Member", async () => {
    signOutLocally();
    await login({ email: "member@example.test", password: "password123" });
    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
    const res = await PATCH(req("PATCH", { name: "Nope" }), ctx(adminId));
    expect(res.status).toBe(403);
  });

  it("assertAdmin is a pure role check", () => {
    const base = { id: "1", name: "n", email: "e", organizationId: "o" };
    expect(() => assertAdmin({ ...base, role: "ADMIN" })).not.toThrow();
    expect(() => assertAdmin({ ...base, role: "MEMBER" })).toThrow(
      ForbiddenError,
    );
  });
});
