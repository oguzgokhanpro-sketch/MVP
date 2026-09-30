import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { usersOf } from "@/lib/db/users";
import { GET as listRoute } from "@/app/api/users/route";
import { DELETE, GET, PATCH } from "@/app/api/users/[id]/route";
import { getCurrentOrganization } from "@/lib/permissions";
import { ctx, req, resetDb, signOutLocally, signUp } from "./helpers";

// Users are the only tenant-owned data in Lot 1, so they serve as "data belonging to an organization".
let userA: string;
let userB: string;

beforeEach(async () => {
  await resetDb();
  userA = await signUp("A");
  signOutLocally();
  userB = await signUp("B"); // B is now the signed-in user
});

/** Switch the current session to the given user by registering nothing new: sign a cookie via login flow. */
async function actAs(label: "A" | "B") {
  const { login } = await import("@/lib/auth/service");
  signOutLocally();
  await login({
    email: `${label.toLowerCase()}@example.test`,
    password: "password123",
  });
}

describe.each([
  ["B", "A"],
  ["A", "B"],
] as const)("user %s vs data of organization %s", (me, other) => {
  const otherId = () => (other === "A" ? userA : userB);
  const myId = () => (me === "A" ? userA : userB);

  it("sees only its own organization's data", async () => {
    await actAs(me);
    const { users } = await (await listRoute()).json();
    expect(users.map((u: { id: string }) => u.id)).toEqual([myId()]);
    expect((await getCurrentOrganization()).name).toBe(`Org ${me}`);
    const own = await GET(req("GET"), ctx(myId()));
    expect(own.status).toBe(200);
  });

  it("cannot read the other organization's record by direct ID", async () => {
    await actAs(me);
    const res = await GET(req("GET"), ctx(otherId()));
    expect(res.status).toBe(404);
  });

  it("cannot modify the other organization's record", async () => {
    await actAs(me);
    const res = await PATCH(req("PATCH", { name: "Hacked" }), ctx(otherId()));
    expect(res.status).toBe(404);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: otherId() } })).name,
    ).toBe(`User ${other}`);
  });

  it("cannot delete the other organization's record", async () => {
    await actAs(me);
    const res = await DELETE(req("DELETE"), ctx(otherId()));
    expect(res.status).toBe(404);
    expect(await db.user.count({ where: { id: otherId() } })).toBe(1);
  });
});

describe("tenant scoping", () => {
  it("ignores an organizationId sent by the client", async () => {
    await actAs("B");
    const orgA = (await db.user.findUniqueOrThrow({ where: { id: userA } }))
      .organizationId;
    const res = await PATCH(
      req("PATCH", { organizationId: orgA, name: "x" }),
      ctx(userB),
    );
    expect(res.status).toBe(400); // unknown key rejected by strict schema
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: userB } }))
        .organizationId,
    ).not.toBe(orgA);
  });

  it("repository behaves the same for other-tenant and missing rows", async () => {
    const orgB = (await db.user.findUniqueOrThrow({ where: { id: userB } }))
      .organizationId;
    await expect(usersOf(orgB).get(userA)).rejects.toMatchObject({
      status: 404,
    });
    await expect(usersOf(orgB).get("not-a-uuid")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("rejects unauthenticated API access", async () => {
    signOutLocally();
    expect((await listRoute()).status).toBe(401);
    expect((await GET(req("GET"), ctx(userA))).status).toBe(401);
  });
});
