import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const faq = z.object({ question: z.string(), answer: z.string() });

// YAML may hand back a Date for timestamp-like values; keep the venue wall-clock string either way
const wallTime = z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v.toISOString().slice(0, 16) : v));

// Categories are content too: add one in the CMS (Categories) and it appears in the post dropdown and on the site.
const categories = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/categories" }),
  schema: z.object({
    name: z.string().max(40),
    description: z.string().min(20).max(170),
    order: z.number().default(100),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(50).max(170),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: reference("categories"),
    author: reference("team"),
    cover: z.string(),
    coverAlt: z.string(),
    draft: z.boolean().default(false),
    faqs: z.array(faq).default([]),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/case-studies" }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(50).max(170),
    client: z.string(),
    location: z.string(),
    date: z.coerce.date(),
    cover: z.string(),
    coverAlt: z.string(),
    results: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/team" }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string(),
    photoAlt: z.string(),
    order: z.number().default(100),
    // Switch off for guest authors who should be credited on their posts but not listed on the Team page
    showOnTeamPage: z.boolean().default(true),
    draft: z.boolean().default(false),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(30).max(200),
    // Wall-clock time at the venue, e.g. 2026-11-14T10:00 (the site timezone is set in src/data/site.json)
    start: wallTime,
    end: wallTime.optional(),
    location: z.string(),
    address: z.string().optional(),
    cost: z.string().default("Free"),
    registerUrl: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, categories, "case-studies": caseStudies, team, events };
