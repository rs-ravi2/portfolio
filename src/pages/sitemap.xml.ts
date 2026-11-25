import type { APIRoute } from "astro";
import { profile } from "../data/profile";
import { getPublicCaseStudies } from "../lib/case-studies";

// Lists the public pages. Empty until profile.siteUrl is set, since sitemaps need absolute URLs.
export const GET: APIRoute = async () => {
  const base = profile.siteUrl?.replace(/\/$/, "");
  const paths = ["/", ...(await getPublicCaseStudies()).map((c) => `/work/${c.id}/`)];
  const urls = base ? paths.map((p) => `  <url><loc>${base}${p}</loc></url>\n`).join("") : "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
