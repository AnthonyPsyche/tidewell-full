// GET /api/auth : starts GitHub OAuth for the CMS login. Needs env GITHUB_CLIENT_ID (a GitHub OAuth App; callback URL: https://<site>/api/callback).
export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) return new Response("GITHUB_CLIENT_ID is not set", { status: 500 });
  const state = crypto.randomUUID();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", new URL("/api/callback", request.url).toString());
  url.searchParams.set("scope", "repo,user");
  url.searchParams.set("state", state);
  return new Response(null, { status: 302, headers: { Location: url.toString(), "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=600` } });
}
