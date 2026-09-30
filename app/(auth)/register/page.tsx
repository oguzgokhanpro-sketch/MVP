import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="center">
      <div className="card">
        <h1>Créer un compte</h1>
        <AuthForm
          endpoint="/api/auth/register"
          submitLabel="Créer mon compte"
          fields={[
            { name: "name", label: "Nom", autoComplete: "name" },
            {
              name: "email",
              label: "Email",
              type: "email",
              autoComplete: "email",
            },
            {
              name: "password",
              label: "Mot de passe",
              type: "password",
              autoComplete: "new-password",
            },
            {
              name: "organizationName",
              label: "Nom de l'organisation",
              autoComplete: "organization",
            },
          ]}
        />
        <p>
          Déjà inscrit ? <Link href="/login">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
