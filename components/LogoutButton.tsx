export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button type="submit">Se déconnecter</button>
    </form>
  );
}
