// What happens after a valid submission. Everything is a dry run (logged to the Pages Functions log) until a provider is connected.
// Connect by adding secrets in Cloudflare (Settings > Variables and Secrets) and filling in the adapter in functions/lib/crm.js.
import { sendCrm } from "./crm.js";

// Placeholders insert visitor input into the subject, so strip line breaks to prevent email header injection
const fill = (tpl = "", data = {}) => tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(data[k] ?? "").replace(/[\r\n]+/g, " "));

export async function runActions(form, submission, env, request) {
  const log = (action, detail) => console.log(JSON.stringify({ form: form.id, action, dryRun: !env.EMAIL_PROVIDER, ...detail }));

  // 1. Notification email to staff
  if (form.notify?.enabled && form.notify.to?.length) {
    log("notify", { to: form.notify.to, subject: fill(form.notify.subject, submission), replyTo: submission[form.notify.replyToField], body: submission });
    // TODO(provider): send with Resend / Postmark / MailChannels using env.EMAIL_API_KEY
  }
  // 2. Autoresponder to the visitor
  if (form.autoresponder?.enabled && submission.email) {
    log("autoresponder", { to: submission.email, subject: form.autoresponder.subject });
  }
  // 3. CRM (mailchimp | hubspot | activecampaign | constantcontact | klaviyo | none)
  await sendCrm(form.crm, submission, env, log);
  // 4. Generic webhook (Zapier, Make, Slack)
  if (form.webhook?.url) {
    await fetch(form.webhook.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ form: form.id, submittedAt: new Date().toISOString(), data: submission }) });
  }
}
