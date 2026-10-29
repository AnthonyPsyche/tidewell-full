import { getCollection, type CollectionEntry } from "astro:content";
import site from "../data/site.json";

const now = () => new Date();

/** Published = not a draft and its date has arrived (future-dated posts appear on the first rebuild after their date). */
export async function getPosts() {
  const posts = await getCollection("blog", (p) => !p.data.draft && p.data.pubDate <= now());
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
export async function getCaseStudies() {
  const items = await getCollection("case-studies", (p) => !p.data.draft && p.data.date <= now());
  return items.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}
export async function getTeam() {
  const members = await getCollection("team", (m) => !m.data.draft);
  return members.sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
export const readingTime = (body = "") => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));
export const absUrl = (path: string) => new URL(path, site.url).toString();

/* ---- Events: start/end are wall-clock strings at the venue ("2026-11-14T10:00") ---- */
export type EventEntry = CollectionEntry<"events">;
const parts = (s: string) => { const [d, t = "00:00"] = s.split("T"); const [y, m, day] = d.split("-").map(Number); const [h, min] = t.split(":").map(Number); return { y, m, day, h, min }; };
export const wall = (s: string) => { const p = parts(s); return new Date(Date.UTC(p.y, p.m - 1, p.day, p.h, p.min)); }; // used for sorting/display only, never converted
export const fmtEventDate = (s: string) => wall(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
export const fmtEventTime = (s: string) => wall(s).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
export const ymd = (s: string) => s.split("T")[0];

export async function getEvents() {
  const events = await getCollection("events", (e) => !e.data.draft);
  return events.sort((a, b) => a.data.start.localeCompare(b.data.start));
}
export const todayInSiteTz = () => new Date().toLocaleDateString("en-CA", { timeZone: site.timezone }); // YYYY-MM-DD
export const isUpcoming = (e: EventEntry) => ymd(e.data.end ?? e.data.start) >= todayInSiteTz();

/** Month grid data: weeks of 7 cells (null for padding), each with day number, ISO date and that day's events. */
export function monthGrid(year: number, month: number, events: EventEntry[]) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = first.getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: ({ day: number; iso: string; events: EventEntry[] } | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, iso, events: events.filter((e) => ymd(e.data.start) === iso) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { label: first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }), weeks };
}

/* ---- iCalendar ---- */
const esc = (s = "") => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsStamp = (s: string) => s.replace(/[-:]/g, "").slice(0, 15).padEnd(15, "0");
export function icsEvent(e: EventEntry) {
  const end = e.data.end ?? e.data.start;
  return ["BEGIN:VEVENT", `UID:${e.id}@${new URL(site.url).hostname}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${icsStamp(e.data.start)}`, `DTEND:${icsStamp(end)}`, `SUMMARY:${esc(e.data.title)}`, `DESCRIPTION:${esc(e.data.description)}`,
    `LOCATION:${esc([e.data.location, e.data.address].filter(Boolean).join(", "))}`, `URL:${absUrl(`/events/${e.id}/`)}`, "END:VEVENT"].join("\r\n");
}
export const icsCalendar = (events: EventEntry[]) => ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${site.name}//Events//EN`, "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(site.name)} events`, ...events.map(icsEvent), "END:VCALENDAR"].join("\r\n");
