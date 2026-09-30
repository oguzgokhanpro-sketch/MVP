import { ReferentialList } from "@/components/ReferentialList";
import { categoriesOf, themesOf } from "@/lib/db/referentials";
import { requireAuth } from "@/lib/permissions";

export default async function SettingsPage() {
  const me = await requireAuth();
  const canEdit = me.role === "ADMIN";
  const [categories, themes] = await Promise.all([
    categoriesOf(me.organizationId).list(),
    themesOf(me.organizationId).list(),
  ]);
  const pick = (rows: typeof categories) =>
    rows.map(({ id, name, active }) => ({ id, name, active }));

  return (
    <>
      <h1>Paramètres</h1>
      {!canEdit && (
        <p className="muted">
          Lecture seule : seuls les Admin peuvent modifier ces listes.
        </p>
      )}
      <section>
        <h2>Catégories</h2>
        <ReferentialList
          endpoint="categories"
          items={pick(categories)}
          canEdit={canEdit}
        />
      </section>
      <section>
        <h2>Thèmes</h2>
        <ReferentialList
          endpoint="themes"
          items={pick(themes)}
          canEdit={canEdit}
        />
      </section>
    </>
  );
}
