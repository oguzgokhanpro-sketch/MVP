import { z } from "zod";

// Public secret shipped in docker-compose.yml for local development only.
export const DEV_AUTH_SECRET_PREFIX = "dev-only-insecure-";

const EnvSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    NEXT_PUBLIC_APP_URL: z.url(),
  })
  .refine(
    (env) =>
      !(
        env.AUTH_SECRET.startsWith(DEV_AUTH_SECRET_PREFIX) &&
        env.NEXT_PUBLIC_APP_URL.startsWith("https://")
      ),
    {
      path: ["AUTH_SECRET"],
      message: "the development secret must not be used on an https deployment",
    },
  );

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

/** Validates required environment variables. Throws (naming variables only, never values) if invalid. */
export function getEnv(): Env {
  if (cached) return cached;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid or missing environment variables: ${problems}`);
  }
  cached = result.data;
  return cached;
}
