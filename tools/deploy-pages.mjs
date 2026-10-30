#!/usr/bin/env node
// Publishes a static-only preview to GitHub Pages (gh-pages branch). Pages can only serve files, so:
//  - the form, CMS login and /admin are not part of this output (the contact page says so)
//  - root-absolute URLs are rewritten to relative ones, because Pages serves the site from /<repo>/
// Requires site.json "noindex": true. The full site (functions + CMS) belongs on Cloudflare Pages.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: ["ignore", "pipe", "inherit"], ...opts }).toString().trim();
const site = JSON.parse(fs.readFileSync(path.join(root, "src/data/site.json"), "utf8"));
if (!site.noindex) { console.error('Refusing to deploy: src/data/site.json "noindex" is not true.'); process.exit(1); }

const remote = run("git", ["remote", "get-url", "origin"]);
const [, owner, repo] = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
const pagesUrl = `https://${owner.toLowerCase()}.github.io/${repo}`;

// 1. Build for preview hosting
run("npx", ["astro", "build"], { env: { ...process.env, PUBLIC_PREVIEW: "1", PUBLIC_SITE_URL: pagesUrl } });

// 2. Copy dist without admin, then make URLs relative
const out = fs.mkdtempSync(path.join(os.tmpdir(), "pages-"));
fs.cpSync(path.join(root, "dist"), out, { recursive: true, filter: (src) => !src.includes(`${path.sep}dist${path.sep}admin`) });
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const relUrl = (fromFile, url) => {
  const m = url.match(/^\/(?!\/)([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!m) return url;
  const dir = path.posix.dirname(fromFile);
  let r = path.posix.relative(dir === "." ? "" : dir, m[1].replace(/\/$/, "")) || ".";
  if (m[1].endsWith("/") || m[1] === "") r = (r === "." ? "./" : r + "/");
  return r + (m[2] || "") + (m[3] || "");
};
for (const f of walk(out)) {
  const rel = path.relative(out, f).split(path.sep).join("/");
  if (!/\.(html|css)$/.test(f)) continue;
  let text = fs.readFileSync(f, "utf8");
  text = text.replace(/\b(href|src|poster|action)="(\/[^"]*)"/g, (_, a, u) => `${a}="${relUrl(rel, u)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (_, s) => `srcset="${s.split(",").map((p) => { const [u, ...r] = p.trim().split(/\s+/); return [relUrl(rel, u), ...r].join(" "); }).join(", ")}"`)
    .replace(/url\((['"]?)(\/[^'")]+)\1\)/g, (_, q, u) => `url(${q}${relUrl(rel, u)}${q})`);
  fs.writeFileSync(f, text);
}
fs.writeFileSync(path.join(out, ".nojekyll"), "");

// 3. Strict check on the output: no root-absolute paths, every link resolves
run("node", ["tools/check.mjs"], { env: { ...process.env, DIST: out, ALLOW_ROOT_ABSOLUTE: "0" } });

// 4. Publish
run("git", ["init", "-q", "-b", "gh-pages"], { cwd: out });
run("git", ["add", "-A"], { cwd: out });
run("git", ["-c", "user.name=deploy", "-c", "user.email=deploy@localhost", "commit", "-q", "-m", "Deploy static preview"], { cwd: out });
run("git", ["push", "-q", "--force", remote, "gh-pages"], { cwd: out });
fs.rmSync(out, { recursive: true, force: true });
console.log(`deployed to gh-pages -> ${pagesUrl}/`);
