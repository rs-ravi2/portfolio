import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Case studies: one Markdown file per study in src/content/case-studies/.
 * Files with `draft: true` are excluded from every public page. Files whose
 * name starts with an underscore are ignored entirely.
 */
const caseStudies = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/case-studies" }),
  schema: z.object({
    title: z.string(),
    /** One sentence: the problem and the result, in plain language. */
    summary: z.string(),
    /** Which offer this maps to. */
    service: z.enum(["automate", "pipeline", "evaluate"]),
    /** Publication date, YYYY-MM-DD. */
    date: z.coerce.date(),
    /** How the client may be named. Use "anonymous" unless you have written permission. */
    client: z.string().default("anonymous"),
    /** Confirms written permission to publish. Must be true for non-anonymous clients. */
    permission: z.boolean().default(false),
    /** The verifiable handoff. */
    input: z.string(),
    output: z.string(),
    acceptance: z.string(),
    /** Only outcomes you can evidence. */
    outcomes: z.array(z.string()).default([]),
    draft: z.boolean().default(true),
  }),
});

export const collections = { caseStudies };
