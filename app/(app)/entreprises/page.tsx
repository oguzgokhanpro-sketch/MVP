import Link from "next/link";
import { CompanyForm } from "@/components/CompanyForm";
import { companiesOf } from "@/lib/db/companies";
import { requireAuth } from "@/lib/permissions";
import { CompanyListSchema, parseQuery } from "@/lib/validation/referentials";

type SearchParams = Record<string, string | string[] | undefined>;

const formatAmount = (v: { toString(): string } | null) =>
  v === null
    ? "—"
    : Number(v.toString()).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const me = await requireAuth();
  const raw = await searchParams;
  // Invalid URL parameters fall back to the defaults instead of failing the page.
  let query;
  try {
    query = parseQuery(CompanyListSchema, raw);
  } catch {
    query = parseQuery(CompanyListSchema, {});
  }
  const { items, total, page, pageSize } = await companiesOf(
    me.organizationId,
  ).list(query);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const href = (p: number) => {
    const params = new URLSearchParams({
      status: query.status,
      sort: query.sort,
      order: query.order,
      page: String(p),
    });
    if (query.q) params.set("q", query.q);
    return `/entreprises?${params}`;
  };

  return (
    <>
      <h1>Entreprises</h1>
      <form className="toolbar" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder="Rechercher (nom, domaine)"
          aria-label="Rechercher"
        />
        <select name="status" defaultValue={query.status} aria-label="Statut">
          <option value="active">Actives</option>
          <option value="archived">Archivées</option>
        </select>
        <select name="sort" defaultValue={query.sort} aria-label="Tri">
          <option value="name">Nom</option>
          <option value="mrr">MRR</option>
          <option value="arr">ARR</option>
          <option value="createdAt">Date de création</option>
        </select>
        <select name="order" defaultValue={query.order} aria-label="Ordre">
          <option value="asc">Croissant</option>
          <option value="desc">Décroissant</option>
        </select>
        <button type="submit">Filtrer</button>
      </form>

      <table>
        <thead>
          <tr>
            <th>Entreprise</th>
            <th>Domaine</th>
            <th className="num">MRR</th>
            <th className="num">ARR</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={4}>Aucune entreprise.</td>
            </tr>
          )}
          {items.map((c) => (
            <tr key={c.id}>
              <td>
                <Link href={`/entreprises/${c.id}`}>{c.name}</Link>
              </td>
              <td>{c.domain ?? "—"}</td>
              <td className="num">{formatAmount(c.mrr)}</td>
              <td className="num">{formatAmount(c.arr)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pager">
        {page > 1 && <Link href={href(page - 1)}>← Précédent</Link>}
        <span className="muted">
          Page {page} / {pages} — {total} résultat{total > 1 ? "s" : ""}
        </span>
        {page < pages && <Link href={href(page + 1)}>Suivant →</Link>}
      </div>

      <details className="card">
        <summary>Nouvelle entreprise</summary>
        <CompanyForm />
      </details>
    </>
  );
}
