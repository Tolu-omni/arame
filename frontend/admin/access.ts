export async function fetchAdminStatus(accessToken?: string) {
  if (!accessToken) {
    return false;
  }

  try {
    const response = await fetch("/api/admin/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as { isAdmin?: boolean };
    return Boolean(result.isAdmin);
  } catch {
    return false;
  }
}
