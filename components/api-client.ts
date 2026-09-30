/** Sends a JSON request to our API; returns an error message, or null on success. */
export async function send(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    const err = (
      data as {
        error?: { message?: string; fields?: Record<string, string[]> };
      }
    )?.error;
    const field = err?.fields && Object.values(err.fields).flat()[0];
    return field ?? err?.message ?? "Une erreur est survenue.";
  } catch {
    return "Erreur réseau, veuillez réessayer.";
  }
}
