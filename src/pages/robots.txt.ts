import type { APIRoute } from "astro";
import { profile } from "../data/profile";

export const GET: APIRoute = () => {
  const base = profile.siteUrl?.replace(/\/$/, "");
  const lines = ["User-agent: *", "Allow: /", ...(base ? [`Sitemap: ${base}/sitemap.xml`] : [])];
  return new Response(lines.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
