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
