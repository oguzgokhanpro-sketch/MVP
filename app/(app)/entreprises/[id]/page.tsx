import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveButton } from "@/components/ArchiveButton";
import { CompanyForm } from "@/components/CompanyForm";
import { ContactForm } from "@/components/ContactForm";
import { ContactRow } from "@/components/ContactRow";
import { companiesOf } from "@/lib/db/companies";
import { contactsOf } from "@/lib/db/contacts";
import { NotFoundError } from "@/lib/errors";
import { requireAuth } from "@/lib/permissions";
import { ContactListSchema, parseQuery } from "@/lib/validation/referentials";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const me = await requireAuth();
  const { id } = await params;
  const company = await companiesOf(me.organizationId)
    .get(id)
    .catch((e) => {
      if (e instanceof NotFoundError) notFound();
      throw e;
    });

  const raw = await searchParams;
  let query;
  try {
    query = parseQuery(ContactListSchema, {
      page: raw.page,
      status: raw.status,
    });
  } catch {
    query = parseQuery(ContactListSchema, {});
  }
  const { items, total, page, pageSize } = await contactsOf(
    me.organizationId,
  ).list({ ...query, companyId: company.id });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number, status = query.status) =>
    `/entreprises/${company.id}?status=${status}&page=${p}`;
  const archivedView = query.status === "archived";

  return (
    <>
      <p>
        <Link href="/entreprises">← Entreprises</Link>
      </p>
      <h1>
        {company.name}{" "}
        {!company.active && <span className="muted">(archivée)</span>}
      </h1>

      <section>
        <h2>Informations</h2>
        <div className="card">
          <CompanyForm
            company={{
              id: company.id,
              name: company.name,
              domain: company.domain,
              mrr: company.mrr?.toString() ?? null,
              arr: company.arr?.toString() ?? null,
            }}
          />
        </div>
        <ArchiveButton
          url={`/api/companies/${company.id}`}
          active={company.active}
        />
      </section>

      <section>
        <h2>Contacts</h2>
        <p>
          {archivedView ? (
            <Link href={href(1, "active")}>Voir les contacts actifs</Link>
          ) : (
            <Link href={href(1, "archived")}>Voir les contacts archivés</Link>
          )}
        </p>
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Fonction</th>
              <th>Email</th>
              <th>Téléphone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5}>Aucun contact.</td>
              </tr>
            )}
            {items.map((c) => (
              <ContactRow
                key={`${c.id}-${c.updatedAt.getTime()}`}
                companyId={company.id}
                contact={{
                  id: c.id,
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                  role: c.role,
                  active: c.active,
                }}
              />
            ))}
          </tbody>
        </table>
        <div className="pager">
          {page > 1 && <Link href={href(page - 1)}>← Précédent</Link>}
          <span className="muted">
            Page {page} / {pages}
          </span>
          {page < pages && <Link href={href(page + 1)}>Suivant →</Link>}
        </div>
        <details className="card">
          <summary>Nouveau contact</summary>
          <ContactForm companyId={company.id} />
        </details>
      </section>
    </>
  );
}
