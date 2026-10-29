import type { APIRoute } from "astro";
import { getEvents, icsCalendar } from "../../lib/content";
export async function getStaticPaths() { return (await getEvents()).map((e) => ({ params: { slug: e.id }, props: { event: e } })); }
export const GET: APIRoute = ({ props }) => new Response(icsCalendar([props.event]), { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
