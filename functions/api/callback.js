// GET /api/callback : finishes GitHub OAuth and hands the token to the CMS window (Decap's expected postMessage protocol).
// Needs env GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = (request.headers.get("Cookie") || "").match(/oauth_state=([^;]+)/)?.[1];
  const finish = (status, payload) => new Response(`<!doctype html><meta charset="utf-8"><script>
(function () {
  function receive(e) { window.opener.postMessage("authorization:github:${status}:" + ${JSON.stringify(JSON.stringify(payload))}, e.origin); }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": "oauth_state=; Path=/api; Max-Age=0" } });
  if (!code || !state || state !== cookie) return finish("error", { message: "Invalid OAuth state. Please try signing in again." });
  const res = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }) });
  const data = await res.json();
  if (!data.access_token) return finish("error", { message: data.error_description || "GitHub did not return a token." });
  return finish("success", { token: data.access_token, provider: "github" });
}
