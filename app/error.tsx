"use client";

// Generic error page: never shows the error message, stack or digest details.
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="center">
      <div className="card">
        <h1>Une erreur est survenue</h1>
        <p>Veuillez réessayer dans un instant.</p>
        <button onClick={reset}>Réessayer</button>
      </div>
    </main>
  );
}
