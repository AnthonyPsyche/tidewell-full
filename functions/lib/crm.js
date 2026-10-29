// CRM adapters. Each one maps the submission to the provider's "create or update contact" call using form.crm.fieldMap.
// None are connected in this prototype: provider "none" (the default) only logs. Implement one per client when needed.
// Endpoints below are the provider APIs as I understand them today; confirm against current docs before implementing.

const mapFields = (crm, submission) => Object.fromEntries((crm.fieldMap || []).map((m) => [m.crmField, submission[m.formField]]));

const adapters = {
  // PUT https://<dc>.api.mailchimp.com/3.0/lists/{listId}/members/{md5(lowercase email)}  (Basic auth, env.MAILCHIMP_API_KEY)
  mailchimp: async () => { throw new Error("mailchimp adapter not implemented"); },
  // POST https://api.hubapi.com/crm/v3/objects/contacts  (Bearer env.HUBSPOT_TOKEN; upsert by email)
  hubspot: async () => { throw new Error("hubspot adapter not implemented"); },
  // POST {account}.api-us1.com/api/3/contact/sync  (Api-Token env.ACTIVECAMPAIGN_KEY), then add to list/tags
  activecampaign: async () => { throw new Error("activecampaign adapter not implemented"); },
  // POST https://api.cc.email/v3/contacts/sign_up_form  (OAuth2 access token)
  constantcontact: async () => { throw new Error("constantcontact adapter not implemented"); },
  // POST https://a.klaviyo.com/api/profile-import/ then subscribe to a list  (Klaviyo-API-Key env.KLAVIYO_KEY)
  klaviyo: async () => { throw new Error("klaviyo adapter not implemented"); },
};

export async function sendCrm(crm, submission, env, log) {
  if (!crm || crm.provider === "none") { log("crm", { provider: "none", note: "no CRM connected", mapped: crm ? mapFields(crm, submission) : {} }); return; }
  const adapter = adapters[crm.provider];
  if (!adapter) throw new Error(`Unknown CRM provider: ${crm.provider}`);
  log("crm", { provider: crm.provider, listId: crm.listId, tags: crm.tags, mapped: mapFields(crm, submission) });
  await adapter(crm, submission, env);
}
