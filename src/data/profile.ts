/**
 * ─────────────────────────────────────────────────────────────────────────
 *  THE ONE FILE TO EDIT for profile, links, availability and contact.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Rules the page follows:
 * - Anything set to `null` (or a link with `approved: false`) is not rendered.
 *   No empty sections, no placeholder buttons.
 * - `contact` controls the whole “Send a project” block. While it is null the
 *   page shows availability only.
 * - Keep every claim here true and current. The page does not add any.
 */

export interface ProfileLink {
  label: string;
  href: string;
  /** Flip to true once you are happy for this link to be public. */
  approved: boolean;
}

export interface ContactChannel {
  /** Button text, e.g. "Email me a project" or "Send a project brief". */
  label: string;
  /** mailto:, https://cal.com/…, a form URL, etc. */
  href: string;
  /** Shown under the button, e.g. "I reply within two working days." */
  responseNote?: string;
  /** Plain-text address shown under the button, for visitors whose mailto: link opens nothing. */
  address?: string;
}

export interface Profile {
  name: string;
  role: string;
  location: string;
  timezone: string;
  yearsExperience: number;
  headline: string;
  summary: string;
  bio: string[];
  /** Tools listed in the bio. Only list what you use and can discuss in depth. */
  tools: string[];
  availability: {
    hoursPerWeek: string;
    mode: string;
    calls: string;
    engagement: string;
  };
  /** Optional: shown in the bio only when `show` is true. */
  employer: { name: string; show: boolean } | null;
  contact: ContactChannel | null;
  resume: { label: string; href: string } | null;
  links: ProfileLink[];
  /** Absolute production URL, used for canonical and share-preview tags. Set before publishing. */
  siteUrl: string | null;
}

export const profile: Profile = {
  name: "Ravi Singh",
  role: "AI/ML Engineer",
  location: "India",
  timezone: "IST, UTC+05:30",
  yearsExperience: 4,

  headline: "Python automation, reliable data pipelines, and AI workflows you can test.",
  summary:
    "I take on fixed-scope remote work: one workflow automated, one data pipeline built or repaired, or one LLM/RAG workflow evaluated. Each starts with written scope and acceptance criteria and ships in milestones.",

  bio: [
    "I’m an AI/ML engineer with four years of professional experience in data science and machine learning, based in India.",
    "My recent work is in financial-crime compliance: matching messy personal names against large reference lists, building the ETL that prepares those lists, and serving the matching through Python APIs. Work like that is judged on misses, so I agree on the acceptance check before I write the code.",
  ],

  tools: ["Python", "SQL", "pandas", "PyArrow and Parquet", "FastAPI", "Redis", "Docker"],

  availability: {
    hoursPerWeek: "5–10 hours a week",
    mode: "Asynchronous, from India",
    calls: "Occasional calls for scoping or handoff",
    engagement: "Fixed scope, written acceptance criteria, milestone delivery",
  },

  // Not named on the site or in this source (decided 2026-11-25).
  employer: null,

  // Approved in chat on 2026-11-24.
  contact: {
    label: "Email a project brief",
    href: "mailto:rawv.rs@gmail.com?subject=Project%20brief",
    address: "rawv.rs@gmail.com",
    responseNote: "I reply within two working days.",
  },

  // resume: { label: "Résumé (PDF)", href: "/ravi-singh-resume.pdf" },
  resume: null,

  links: [
    { label: "GitHub", href: "https://github.com/rs-ravi2", approved: false },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/rs-ravi/", approved: true },
  ],

  // Free Cloudflare Pages address. Swap for the custom domain once it is bought.
  siteUrl: "https://ravisingh.pages.dev",
};

export const publicLinks = profile.links.filter((l) => l.approved);
