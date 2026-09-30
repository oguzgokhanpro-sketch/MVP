"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type Field = {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
};

type Props = { endpoint: string; fields: Field[]; submitLabel: string };

/** Posts the form as JSON to an auth endpoint. Validation is enforced server-side (Zod). */
export function AuthForm({ endpoint, fields, submitLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      setError(errorMessage(data));
    } catch {
      setError("Erreur réseau, veuillez réessayer.");
    }
    setPending(false);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          <input
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            required
          />
        </label>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {submitLabel}
      </button>
    </form>
  );
}

function errorMessage(data: unknown): string {
  const err = (
    data as { error?: { message?: string; fields?: Record<string, string[]> } }
  )?.error;
  const firstField = err?.fields && Object.values(err.fields).flat()[0];
  return firstField ?? err?.message ?? "Une erreur est survenue.";
}
