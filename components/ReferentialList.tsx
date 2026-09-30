"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { send } from "./api-client";

type Item = { id: string; name: string; active: boolean };

/** Categories / themes list. `canEdit` only hides controls; the API enforces Admin-only writes. */
export function ReferentialList({
  endpoint,
  items,
  canEdit,
}: {
  endpoint: "categories" | "themes";
  items: Item[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<string | null>) {
    setPending(true);
    setError(null);
    const err = await action();
    setPending(false);
    if (err) return setError(err);
    setEditingId(null);
    router.refresh();
  }

  const move = (index: number, delta: number) => {
    const ids = items.map((i) => i.id);
    const moved = ids[index]!;
    ids[index] = ids[index + delta]!;
    ids[index + delta] = moved;
    return run(() => send(`/api/${endpoint}/reorder`, "POST", { ids }));
  };

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") ?? "");
    return run(async () => {
      const err = await send(`/api/${endpoint}`, "POST", { name });
      if (!err) form.reset();
      return err;
    });
  }

  function onRename(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    return run(() => send(`/api/${endpoint}/${id}`, "PATCH", { name }));
  }

  return (
    <div>
      <ol className="ref-list">
        {items.map((item, i) => (
          <li key={item.id} className={item.active ? "" : "inactive"}>
            {editingId === item.id ? (
              <form onSubmit={(e) => onRename(e, item.id)} className="row">
                <input
                  name="name"
                  defaultValue={item.name}
                  required
                  maxLength={200}
                />
                <button type="submit" disabled={pending}>
                  OK
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setEditingId(null)}
                >
                  Annuler
                </button>
              </form>
            ) : (
              <span className="row">
                <span>{item.name}</span>
                <span className="muted">
                  {item.active ? "Actif" : "Inactif"}
                </span>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      className="secondary"
                      disabled={pending || i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={`Monter ${item.name}`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={pending || i === items.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={`Descendre ${item.name}`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={pending}
                      onClick={() => setEditingId(item.id)}
                    >
                      Renommer
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          send(`/api/${endpoint}/${item.id}`, "PATCH", {
                            active: !item.active,
                          }),
                        )
                      }
                    >
                      {item.active ? "Désactiver" : "Réactiver"}
                    </button>
                  </>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>
      {canEdit && (
        <form onSubmit={onAdd} className="row">
          <input
            name="name"
            placeholder="Nouvel élément"
            required
            maxLength={200}
          />
          <button type="submit" disabled={pending}>
            Ajouter
          </button>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
