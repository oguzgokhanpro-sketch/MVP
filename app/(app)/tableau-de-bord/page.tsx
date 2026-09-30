import { getCurrentOrganization, requireAuth } from "@/lib/permissions";

export default async function DashboardPage() {
  const user = await requireAuth();
  const organization = await getCurrentOrganization();

  return (
    <>
      <h1>Bienvenue, {user.name}</h1>
      <dl>
        <dt>Organisation</dt>
        <dd>{organization.name}</dd>
        <dt>Rôle</dt>
        <dd>{user.role === "ADMIN" ? "Admin" : "Member"}</dd>
      </dl>
    </>
  );
}
