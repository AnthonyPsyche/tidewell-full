// Tiny static file server (node built-ins only) used by shots and a11y so pages are tested over http, as a real host serves them.
// Directory URLs resolve to index.html; unknown URLs return dist/404.html with a 404 status.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain", ".ics": "text/calendar" };

export function serve(dir) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join(dir, p);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    let status = 200;
    if (!fs.existsSync(file)) { file = path.join(dir, "404.html"); status = 404; }
    if (!fs.existsSync(file)) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(status, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ port: server.address().port, close: () => server.close() })));
}

/** URL path for a built page file ("about/index.html" -> "/about/", "404.html" -> "/404.html") */
export const urlPath = (rel) => (rel.endsWith("/index.html") ? "/" + rel.slice(0, -"index.html".length) : rel === "index.html" ? "/" : "/" + rel);
