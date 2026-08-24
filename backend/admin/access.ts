const fallbackAdminEmails = [
  "toluomoniyi9@gmail.com",
  "toluomoniyi@gmail.com",
  "tolu@arame.com",
];

export function getAdminEmails() {
  const configuredEmails = [
    process.env.ADMIN_EMAILS,
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...configuredEmails, ...fallbackAdminEmails]));
}

export function isAdminEmail(email?: string | null) {
  return Boolean(email && getAdminEmails().includes(email.toLowerCase().trim()));
}
