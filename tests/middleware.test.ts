import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "@/middleware";
import { createSession } from "@/lib/auth/session";
import { jar } from "./cookie-jar";

const url = (path: string) => `http://localhost:3000${path}`;

/** Mirrors Next.js matcher semantics for the simple prefix patterns used in config. */
const isMatched = (path: string) =>
  config.matcher.some((m) =>
    new RegExp(`^${m.replace("/:path*", "(/.*)?")}$`).test(path),
  );

describe("route protection", () => {
  it("redirects protected pages to /connexion without a session", async () => {
    for (const path of ["/tableau-de-bord", "/parametres"]) {
      expect(isMatched(path)).toBe(true);
      const res = await middleware(new NextRequest(url(path)));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(url("/connexion"));
    }
  });

  it("does not intercept public pages, API routes or unknown URLs (so /nope reaches the 404 page)", () => {
    for (const path of [
      "/connexion",
      "/inscription",
      "/nope",
      "/api/users",
      "/does/not/exist",
    ]) {
      expect(isMatched(path)).toBe(false);
    }
  });

  it("lets a request with a valid session cookie through", async () => {
    jar.clear();
    await createSession("00000000-0000-0000-0000-000000000000");
    const cookie = `session=${jar.get("session")}`;
    const res = await middleware(
      new NextRequest(url("/tableau-de-bord"), { headers: { cookie } }),
    );
    expect(res.headers.get("location")).toBeNull();
  });

  it("rejects a forged cookie", async () => {
    const res = await middleware(
      new NextRequest(url("/tableau-de-bord"), {
        headers: { cookie: "session=forged" },
      }),
    );
    expect(res.status).toBe(307);
  });
});
