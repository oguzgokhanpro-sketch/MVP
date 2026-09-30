"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { send } from "./api-client";

/** Archives (active=false) or reactivates an entity through its PATCH endpoint. */
export function ArchiveButton({
  url,
  active,
}: {
  url: string;
  active: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    setError(null);
    const err = await send(url, "PATCH", { active: !active });
    setPending(false);
    if (err) return setError(err);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="secondary"
        disabled={pending}
        onClick={toggle}
      >
        {active ? "Archiver" : "Réactiver"}
      </button>
      {error && (
        <span className="error" role="alert">
          {" "}
          {error}
        </span>
      )}
    </>
  );
}
