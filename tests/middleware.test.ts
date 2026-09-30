import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { createSession } from "@/lib/auth/session";
import { jar } from "./cookie-jar";

describe("route protection", () => {
  it("redirects /dashboard to /login without a session", async () => {
    const res = await middleware(
      new NextRequest("http://localhost:3000/dashboard"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets /login and /register through", async () => {
    for (const path of ["/login", "/register"]) {
      const res = await middleware(
        new NextRequest(`http://localhost:3000${path}`),
      );
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("lets a request with a valid session cookie through", async () => {
    jar.clear();
    await createSession("00000000-0000-0000-0000-000000000000");
    const cookie = `session=${jar.get("session")}`;
    const res = await middleware(
      new NextRequest("http://localhost:3000/dashboard", {
        headers: { cookie },
      }),
    );
    expect(res.headers.get("location")).toBeNull();
  });
});
