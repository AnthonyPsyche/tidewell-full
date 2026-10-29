import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import site from "./src/data/site.json" with { type: "json" };

export default defineConfig({
  site: site.url,
  trailingSlash: "always",
  build: { format: "directory" },
  // A noindexed preview should not advertise a sitemap; it switches on when site.json "noindex" is false at launch.
  integrations: site.noindex ? [] : [sitemap({ filter: (page) => !page.includes("/thank-you/") })],
});
