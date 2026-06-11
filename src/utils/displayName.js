/**
 * Resolves the public display name for marketplace surfaces (reviews, etc.)
 *
 * Priority:
 *   1. user.username  — user-chosen handle (e.g. "PatrickTech")
 *   2. First Name + Last Initial from user.name (e.g. "Patrick M.")
 *   3. "Anonymous" if no name provided
 */
export function getPublicDisplayName(user) {
  if (user?.username?.trim()) return user.username.trim();
  return firstNameLastInitial(user?.name);
}

function firstNameLastInitial(name) {
  if (!name?.trim()) return "Anonymous";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1][0].toUpperCase()}.` : "";
  return `${first}${lastInitial}`;
}
