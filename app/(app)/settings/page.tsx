import { requireAuth } from "@/lib/permissions";

export default async function SettingsPage() {
  await requireAuth();
  return <h1>Paramètres</h1>;
}
