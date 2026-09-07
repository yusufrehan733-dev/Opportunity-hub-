export function getUserRole(email?: string | null) {
  const ADMIN_EMAIL = "logicguild733@gmail.com";

  if (!email) return "user";

  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ? "admin"
    : "user";
}
