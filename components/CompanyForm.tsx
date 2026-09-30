"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { send } from "./api-client";

type Company = {
  id: string;
  name: string;
  domain: string | null;
  mrr: string | null;
  arr: string | null;
};

const amount = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".");
  return s === "" ? null : Number(s);
};

/** Creates a company (no `company`) or edits one. Validation is enforced server-side. */
export function CompanyForm({ company }: { company?: Company }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setPending(true);
    setError(null);
    setSaved(false);
    const body = {
      name: String(f.get("name") ?? ""),
      domain: String(f.get("domain") ?? ""),
      mrr: amount(f.get("mrr")),
      arr: amount(f.get("arr")),
    };
    const err = company
      ? await send(`/api/companies/${company.id}`, "PATCH", body)
      : await send("/api/companies", "POST", body);
    setPending(false);
    if (err) return setError(err);
    if (company) setSaved(true);
    else form.reset();
    router.refresh();
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        Nom
        <input
          name="name"
          defaultValue={company?.name}
          required
          maxLength={200}
        />
      </label>
      <label>
        Domaine
        <input
          name="domain"
          defaultValue={company?.domain ?? ""}
          placeholder="exemple.com"
        />
      </label>
      <label>
        MRR
        <input
          name="mrr"
          inputMode="decimal"
          defaultValue={company?.mrr ?? ""}
        />
      </label>
      <label>
        ARR
        <input
          name="arr"
          inputMode="decimal"
          defaultValue={company?.arr ?? ""}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {saved && <p role="status">Enregistré.</p>}
      <button type="submit" disabled={pending}>
        {company ? "Enregistrer" : "Créer l’entreprise"}
      </button>
    </form>
  );
}
