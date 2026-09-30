import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="center">
      <div className="card">
        <h1>Connexion</h1>
        <AuthForm
          endpoint="/api/auth/login"
          submitLabel="Se connecter"
          fields={[
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
              autoComplete: "current-password",
            },
          ]}
        />
        <p>
          Pas de compte ? <Link href="/inscription">Créer un compte</Link>
        </p>
      </div>
    </main>
  );
}
