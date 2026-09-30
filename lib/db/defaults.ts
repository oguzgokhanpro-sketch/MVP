import type { Prisma } from "@prisma/client";

// Keep in sync with the backfill SQL in prisma/migrations/*_lot2_referentiels.
export const DEFAULT_CATEGORIES = [
  "Feature",
  "Bug",
  "Amélioration",
  "Question",
  "Autre",
] as const;

export const DEFAULT_THEMES = [
  "Reporting",
  "API",
  "Authentification",
  "Interface",
  "Performance",
  "Intégration",
] as const;

/** Creates the default categories and themes of a new organization (call inside its creation transaction). */
export async function createDefaultReferentials(
  tx: Prisma.TransactionClient,
  organizationId: string,
) {
  const rows = (names: readonly string[]) =>
    names.map((name, sortOrder) => ({
      organizationId,
      name,
      isDefault: true,
      sortOrder,
    }));
  await tx.category.createMany({ data: rows(DEFAULT_CATEGORIES) });
  await tx.theme.createMany({ data: rows(DEFAULT_THEMES) });
}
