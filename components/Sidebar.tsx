import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function Sidebar() {
  return (
    <nav className="sidebar">
      <Link href="/tableau-de-bord">Tableau de bord</Link>
      <Link href="/entreprises">Entreprises</Link>
      <Link href="/parametres">Paramètres</Link>
      <LogoutButton />
    </nav>
  );
}
