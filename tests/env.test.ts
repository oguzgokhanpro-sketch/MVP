import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.resetModules());

describe("environment validation", () => {
  it("throws when a required variable is missing, without leaking values", async () => {
    const saved = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = saved;
  });
});

describe("development secret", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("is accepted over http (local Docker)", async () => {
    process.env.AUTH_SECRET = "dev-only-insecure-secret-change-me-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).not.toThrow();
  });

  it("is refused on an https deployment", async () => {
    process.env.AUTH_SECRET = "dev-only-insecure-secret-change-me-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    const { getEnv } = await import("@/lib/env");
    expect(() => getEnv()).toThrow(/development secret/);
  });
});
