import type { APIRoute } from "astro";
import site from "../data/site.json";
export const GET: APIRoute = () => new Response(site.noindex ? "User-agent: *\nDisallow: /\n" : `User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap-index.xml", site.url)}\n`, { headers: { "Content-Type": "text/plain" } });
