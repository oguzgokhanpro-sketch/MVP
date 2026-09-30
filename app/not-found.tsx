import Link from "next/link";

export default function NotFound() {
  return (
    <main className="center">
      <div className="card">
        <h1>Page introuvable</h1>
        <p>La page demandée n&apos;existe pas.</p>
        <Link href="/dashboard">Retour au dashboard</Link>
      </div>
    </main>
  );
}
