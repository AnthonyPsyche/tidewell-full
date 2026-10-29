# Tidewell Coffee: full-site prototype

A complete static site (Astro) with the functionality a WordPress site usually needs: journal with categories and FAQs, case studies, team, events calendar, contact form with spam protection, and a Git-based CMS that clients log into with GitHub. Fictional brand, built to prove out the stack for future client sites. No CRM, email provider or live hosting is connected.

## What is where

| Need | Built with | Where |
|---|---|---|
| Journal (blog) with categories, FAQs, RSS | Astro content collection (markdown) | `src/content/blog`, `src/pages/journal` |
| Case studies (a "custom post type") | A second collection | `src/content/case-studies`, `src/pages/case-studies` |
| Team page | Collection with an `order` field | `src/content/team`, `src/pages/team.astro` |
| Events: list, month grid, per-event and full iCal feeds | Collection + build-time calendar | `src/content/events`, `src/pages/events`, `src/lib/content.ts` |
| Contact form + spam protection | Cloudflare Pages Function, Turnstile, honeypot, fill-time trap, optional KV rate limit | `functions/api/forms/[form].js`, `public/js/forms.js` |
| Form "dashboard" (fields, confirmation page, notification emails, CRM mapping, webhook) | A JSON file edited in the CMS | `src/data/forms.json` |
| Editor dashboard (WordPress-like) | Decap CMS (self-hosted bundle), editorial workflow | `public/admin/` |
| CMS login | GitHub OAuth via two Pages Functions | `functions/api/auth.js`, `callback.js` |
| SEO | Per-page title/description/canonical/OG, JSON-LD (BlogPosting, FAQPage, BreadcrumbList, Event), sitemap on launch | `src/layouts/Base.astro`, `src/pages/journal/[slug].astro` |
| Client how-to | Written guide with screenshots | `docs/publishing-guide.md` |

Posts are published when `pubDate` has passed and `draft` is false; future-dated posts appear on the first rebuild after their date, and events move to "past" the same way. Set up a nightly rebuild (below) so this happens without anyone touching the site.

## Run it locally

```bash
npm install
npm run dev        # site at http://localhost:4321 (no form backend in this mode)
npm run cms        # second terminal: local CMS backend; then open http://localhost:4321/admin/ and click Login
```

To test the form function as it runs on Cloudflare:

```bash
npm run build && npm run preview     # http://127.0.0.1:8788 (Pages Functions, Turnstile test keys)
```

Quality gates: `npm run verify` builds, runs the structural check (links, headings, titles, images, third-party scripts) and a WCAG 2.2 AA audit with axe-core in Chrome on every page.

## Deploy on Cloudflare Pages (free plan)

1. Push this repo to GitHub. In Cloudflare: **Workers & Pages > Create > Pages > Connect to Git**, build command `npm run build`, output directory `dist`.
2. **Turnstile**: create a widget in Cloudflare; add `PUBLIC_TURNSTILE_SITEKEY` (build variable) and `TURNSTILE_SECRET` (secret). Without them the always-pass test keys are used, which gives no spam protection.
3. **CMS login**: create a GitHub OAuth App (callback `https://<site>/api/callback`); add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as secrets. Set `repo` and `base_url` in `public/admin/config.yml`. Invite the client's GitHub account to the repo.
4. **Nightly rebuild** (scheduled posts, past events): create a Deploy Hook in Pages and call it daily from a scheduler (a GitHub Actions schedule, or any cron service).
5. **Draft previews**: Pages builds every branch; the CMS's editorial workflow opens a pull request per draft, so each draft gets a preview URL.
6. **At launch**: set `noindex` to false in `src/data/site.json` (or in the CMS under Settings), set the real `url`, and replace the placeholder emails.

## Connecting a CRM or email provider later

Edit the form in the CMS (Settings > Contact forms) and implement the matching adapter in `functions/lib/crm.js`; add the provider's API key as a Cloudflare secret. The five adapters (Mailchimp, HubSpot, ActiveCampaign, Constant Contact, Klaviyo) are stubs with the endpoint noted in a comment; confirm each against the provider's current docs when implementing. Notification and auto-reply emails are logged only until a sender (Resend, Postmark, etc.) is wired into `functions/lib/actions.js`.

## Status: what was verified and what was not

Verified here: the site builds (25 pages); structural check and axe WCAG 2.2 AA audit pass on every page at desktop, mobile and mobile-menu-open; the form works through the real browser UI (client validation, Turnstile test token, redirect to `/thank-you/`) and by direct requests (valid, honeypot, too fast, no token, bad fields, bad choice, oversize input, non-JS fallback, unknown form, wrong method); the CMS loads this config in local mode and reads/edits all collections, the forms settings and site settings.

Not verified: GitHub OAuth login (needs a real OAuth app); Decap's editorial workflow screens and draft preview links (the local backend does not support them); real Turnstile keys; KV rate limiting; any CRM or email provider; deployment on Cloudflare; the CMS on a phone.
