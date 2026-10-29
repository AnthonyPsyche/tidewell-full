// POST /api/forms/:form  (Cloudflare Pages Function)
// Config comes from src/data/forms.json, which editors change in the CMS ("Forms" collection).
// Spam defence: honeypot, minimum fill time, Cloudflare Turnstile, field validation and length caps, optional per-IP rate limit (KV).
import formsConfig from "../../../src/data/forms.json";
import { runActions } from "../../lib/actions.js";

const MAX_FIELD = 5000;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const wantsJson = (req) => (req.headers.get("Accept") || "").includes("application/json");

export async function onRequestPost({ request, env, params }) {
  const form = formsConfig.forms.find((f) => f.id === params.form);
  if (!form) return json({ ok: false, error: "Unknown form." }, 404);
  const respond = (ok, payload, status = ok ? 200 : 400) => {
    if (wantsJson(request)) return json({ ok, ...payload }, status);
    // No-JavaScript fallback: redirect (303) to the configured confirmation page, or show a plain message
    if (ok && form.success.type === "redirect") return Response.redirect(new URL(form.success.redirect, request.url).toString(), 303);
    return new Response(`<!doctype html><meta charset="utf-8"><title>${ok ? "Thank you" : "Error"}</title><p>${ok ? form.success.message : payload.error}</p><p><a href="/">Back to the site</a></p>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
  };

  let data;
  try { data = await request.formData(); } catch { return respond(false, { error: "Invalid form submission." }); }

  // 1. Honeypot: bots fill every field. Pretend success so they learn nothing.
  if ((data.get(form.spam.honeypotField) || "").toString().trim() !== "") return respond(true, { message: form.success.message, redirect: form.success.type === "redirect" ? form.success.redirect : undefined });

  // 2. Fill-time trap (only enforced when the page's script stamped the form)
  const ts = Number(data.get("_ts"));
  if (ts && Date.now() - ts < form.spam.minSecondsToSubmit * 1000) return respond(false, { error: "That was quick! Please try again." });

  // 3. Optional per-IP rate limit: 5 posts per 10 minutes (needs a KV binding named RATE_LIMIT)
  if (env.RATE_LIMIT) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const key = `rl:${form.id}:${ip}`;
    const n = Number(await env.RATE_LIMIT.get(key)) || 0;
    if (n >= 5) return respond(false, { error: "Too many submissions. Please wait a few minutes." }, 429);
    await env.RATE_LIMIT.put(key, String(n + 1), { expirationTtl: 600 });
  }

  // 4. Turnstile. In local dev without a secret, Cloudflare's always-pass test secret is used.
  if (form.spam.requireTurnstile) {
    const token = data.get("cf-turnstile-response");
    const secret = env.TURNSTILE_SECRET || "1x0000000000000000000000000000000AA";
    if (!token) return respond(false, { error: "Please complete the spam check and try again." });
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: token.toString(), remoteip: request.headers.get("CF-Connecting-IP") || "" }) });
    const result = await verify.json().catch(() => ({ success: false }));
    if (!result.success) return respond(false, { error: "The spam check failed. Please try again." });
  }

  // 5. Validate against the configured fields (never trust the browser)
  const submission = {}; const errors = {};
  for (const f of form.fields) {
    const raw = (data.get(f.name) || "").toString().trim().slice(0, MAX_FIELD);
    if (f.required && !raw) errors[f.name] = "required";
    else if (f.type === "email" && raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) errors[f.name] = "invalid email";
    else if (f.type === "select" && raw && !f.options.includes(raw)) errors[f.name] = "invalid choice";
    submission[f.name] = raw;
  }
  if (Object.keys(errors).length) return respond(false, { error: "Please check the form and try again.", fields: errors }, 422);

  // 6. Actions: notification email, autoresponder, CRM, webhook (all dry-run until connected; see functions/lib)
  try { await runActions(form, submission, env, request); }
  catch (err) { console.error("form action failed", form.id, err); /* the visitor is never shown provider errors; the submission is logged */ }

  return respond(true, { message: form.success.message, redirect: form.success.type === "redirect" ? form.success.redirect : undefined });
}

export const onRequest = ({ request }) => request.method === "POST" ? undefined : new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
