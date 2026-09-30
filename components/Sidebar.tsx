import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function Sidebar() {
  return (
    <nav className="sidebar">
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/settings">Paramètres</Link>
      <LogoutButton />
    </nav>
  );
}
