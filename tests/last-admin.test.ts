import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { usersOf } from "@/lib/db/users";
import { hashPassword } from "@/lib/auth/password";
import { DELETE, PATCH } from "@/app/api/users/[id]/route";
import { ctx, req, resetDb, signUp } from "./helpers";

let orgId: string;
let adminId: string; // the signed-in admin, initially the only one

async function addUser(
  email: string,
  role: "ADMIN" | "MEMBER",
  orgOverride?: string,
) {
  return (
    await db.user.create({
      data: {
        organizationId: orgOverride ?? orgId,
        name: email,
        email,
        role,
        passwordHash: await hashPassword("password123"),
      },
    })
  ).id;
}

beforeEach(async () => {
  await resetDb();
  adminId = await signUp("Admin");
  orgId = (await db.user.findUniqueOrThrow({ where: { id: adminId } }))
    .organizationId;
});

async function expectLastAdminError(res: Response) {
  expect(res.status).toBe(409);
  expect((await res.json()).error.code).toBe("LAST_ADMIN");
}

describe("the last admin is protected", () => {
  it("cannot be deleted", async () => {
    await expectLastAdminError(await DELETE(req("DELETE"), ctx(adminId)));
    expect(await db.user.count({ where: { id: adminId } })).toBe(1);
  });

  it("cannot be deactivated", async () => {
    await expectLastAdminError(
      await PATCH(req("PATCH", { active: false }), ctx(adminId)),
    );
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: adminId } })).active,
    ).toBe(true);
  });

  it("cannot be demoted to MEMBER", async () => {
    await expectLastAdminError(
      await PATCH(req("PATCH", { role: "MEMBER" }), ctx(adminId)),
    );
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: adminId } })).role,
    ).toBe("ADMIN");
  });

  it("is still protected when the only other admin is deactivated", async () => {
    const other = await addUser("other@example.test", "ADMIN");
    await db.user.update({ where: { id: other }, data: { active: false } });
    await expectLastAdminError(await DELETE(req("DELETE"), ctx(adminId)));
  });

  it("can still update harmless fields (name, or re-affirming ADMIN)", async () => {
    const res = await PATCH(
      req("PATCH", { name: "New", role: "ADMIN", active: true }),
      ctx(adminId),
    );
    expect(res.status).toBe(200);
  });
});

describe("with another active admin", () => {
  let otherAdmin: string;
  beforeEach(async () => {
    otherAdmin = await addUser("other@example.test", "ADMIN");
  });

  it("an admin can be deleted", async () => {
    expect((await DELETE(req("DELETE"), ctx(otherAdmin))).status).toBe(204);
  });

  it("an admin can be deactivated", async () => {
    expect(
      (await PATCH(req("PATCH", { active: false }), ctx(otherAdmin))).status,
    ).toBe(200);
  });

  it("an admin can be demoted", async () => {
    expect(
      (await PATCH(req("PATCH", { role: "MEMBER" }), ctx(otherAdmin))).status,
    ).toBe(200);
  });

  it("members can be deleted or deactivated freely", async () => {
    const member = await addUser("m@example.test", "MEMBER");
    expect(
      (await PATCH(req("PATCH", { active: false }), ctx(member))).status,
    ).toBe(200);
    expect((await DELETE(req("DELETE"), ctx(member))).status).toBe(204);
  });

  it("two admins cannot demote each other concurrently", async () => {
    const results = await Promise.allSettled([
      usersOf(orgId).update(adminId, { role: "MEMBER" }),
      usersOf(orgId).update(otherAdmin, { role: "MEMBER" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.user.count({ where: { organizationId: orgId, role: "ADMIN" } }),
    ).toBe(1);
  });
});

describe("per-organization", () => {
  it("an admin in another organization does not count", async () => {
    await signUp("Other"); // separate organization with its own admin
    await expect(usersOf(orgId).remove(adminId)).rejects.toMatchObject({
      code: "LAST_ADMIN",
    });
  });
});
