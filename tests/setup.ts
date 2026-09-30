process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/mvp_test?schema=public";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

import { vi } from "vitest";
import { jar } from "./cookie-jar";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name)! } : undefined,
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));
