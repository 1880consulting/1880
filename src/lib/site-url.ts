/**
 * Reads an address setting (SITE_URL, PORTAL_URL) the same way everywhere:
 * "1880.io", "https://1880.io" and "https://1880.io/" all mean https://1880.io.
 * Hosting panels make it easy to leave the https:// off, and without it
 * links, the sitemap and canonical addresses would come out wrong.
 */
export function normalizeOrigin(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return undefined;
  }
}

/** The main site's address (SITE_URL), or undefined if it isn't set. */
export const siteUrlSetting = () => normalizeOrigin(process.env.SITE_URL);
