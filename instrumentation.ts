// Runs once when the Next.js server starts: refuse to boot with a bad environment.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getEnv } = await import("@/lib/env");
  try {
    getEnv();
  } catch (e) {
    console.error(e instanceof Error ? e.message : "Invalid environment");
    process.exit(1);
  }
}
