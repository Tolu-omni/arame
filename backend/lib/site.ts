export function getRequestSiteUrl(request?: Request) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL;

  if (configuredUrl) {
    const normalizedUrl = configuredUrl.replace(/\/$/, "");
    return normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://")
      ? normalizedUrl
      : `https://${normalizedUrl}`;
  }

  const origin = request?.headers.get("origin");

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  if (request?.url) {
    return new URL(request.url).origin;
  }

  return "http://localhost:3000";
}

export function getSiteUrl(path = "/", request?: Request) {
  const siteUrl = getRequestSiteUrl(request);
  return new URL(path, `${siteUrl}/`).toString();
}
