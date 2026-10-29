// Copies the self-hosted Decap CMS bundle into public/admin/decap so the admin never loads code from a CDN.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const from = path.join(root, "node_modules/decap-cms/dist");
const to = path.join(root, "public/admin/decap");
if (!fs.existsSync(from)) { console.error("decap-cms is not installed: run npm install"); process.exit(1); }
fs.rmSync(to, { recursive: true, force: true });
fs.mkdirSync(to, { recursive: true });
// The package ships two copies of every chunk (cms.js and decap-cms.js); only the decap-cms.js set is needed
for (const f of fs.readdirSync(from)) if (!f.endsWith(".map") && !/(^|\.)cms\.js(\.LICENSE\.txt)?$/.test(f) && f !== "cms.css") fs.copyFileSync(path.join(from, f), path.join(to, f));
console.log("decap-cms -> public/admin/decap");
