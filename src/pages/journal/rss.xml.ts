import type { APIRoute } from "astro";
import site from "../../data/site.json";
import { getPosts, absUrl } from "../../lib/content";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const items = posts.map((p) => `<item><title>${esc(p.data.title)}</title><link>${absUrl(`/journal/${p.id}/`)}</link><guid>${absUrl(`/journal/${p.id}/`)}</guid><pubDate>${p.data.pubDate.toUTCString()}</pubDate><category>${esc(p.data.category)}</category><description>${esc(p.data.description)}</description></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.name)} Journal</title><link>${absUrl("/journal/")}</link><description>${esc(site.tagline)}</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
