"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { send } from "./api-client";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
};

/** Creates a contact for `companyId`, or edits `contact`. */
export function ContactForm({
  companyId,
  contact,
  onDone,
}: {
  companyId: string;
  contact?: Contact;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const text = (k: string) => String(f.get(k) ?? "");
    setPending(true);
    setError(null);
    const body = {
      name: text("name"),
      email: text("email"),
      phone: text("phone"),
      role: text("role"),
    };
    const err = contact
      ? await send(`/api/contacts/${contact.id}`, "PATCH", body)
      : await send("/api/contacts", "POST", { ...body, companyId });
    setPending(false);
    if (err) return setError(err);
    if (!contact) form.reset();
    onDone?.();
    router.refresh();
  }

  return (
    <form className="form inline-form" onSubmit={onSubmit}>
      <label>
        Nom
        <input
          name="name"
          defaultValue={contact?.name}
          required
          maxLength={200}
        />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={contact?.email ?? ""} />
      </label>
      <label>
        Téléphone
        <input name="phone" defaultValue={contact?.phone ?? ""} />
      </label>
      <label>
        Fonction
        <input
          name="role"
          defaultValue={contact?.role ?? ""}
          placeholder="CTO"
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div>
        <button type="submit" disabled={pending}>
          {contact ? "Enregistrer" : "Ajouter le contact"}
        </button>{" "}
        {contact && (
          <button type="button" className="secondary" onClick={onDone}>
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
