import type { APIRoute } from "astro";
import { getEvents, icsCalendar } from "../../lib/content";
export const GET: APIRoute = async () => new Response(icsCalendar(await getEvents()), { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
