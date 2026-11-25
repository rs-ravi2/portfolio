# Ravi Singh: portfolio

A static Astro site with one working instrument: a retrieval lab that compares keyword search with keyword + synonym search on a synthetic corpus, and reports Recall@k and MRR@k computed from the actual rankings.

## Commands

| Command | What it does |
| :-- | :-- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Prerender everything to `dist/` |
| `npm run preview` | Serve the built site at http://localhost:4321 |
| `npm test` | Unit tests for tokenising, ranking, ties and metrics |
| `npm run check` | Astro and TypeScript type check |
| `npm run test:e2e` | Browser checks against a running preview (needs Playwright + Chromium; optional axe path as 2nd arg) |

## Where to edit

| To change… | Edit |
| :-- | :-- |
| Name, role, headline, bio, tools, availability | `src/data/profile.ts` |
| **Contact channel** (turns on the “Send a project” block) | `profile.contact` in `src/data/profile.ts` |
| **Résumé link** | Put the PDF in `public/`, then set `profile.resume` |
| GitHub / LinkedIn links | `profile.links`: set `approved: true` |
| Employer line in the bio | `profile.employer.show` |
| Canonical URL, absolute share-image URL, `robots.txt` and `sitemap.xml` | `profile.siteUrl` |
| The three offers and the engagement steps | `src/data/services.ts` |
| **Case studies** | Copy `src/content/case-studies/example.md` to a new file, fill it in, set `draft: false` |
| Lab corpus, questions, synonym rules | `src/lab/corpus.ts` (then run `npm test`: some tests pin the current numbers) |
| Share image | Edit and run `scripts/og-image.mjs` → `public/og.png` |

Anything empty, `null` or unapproved is not rendered: no placeholder cards or dead buttons. Case-study frontmatter is validated by `src/content.config.ts`. Drafts never reach a public page. A study naming a client without `permission: true` fails the build.

## Deploy (Cloudflare Pages, free plan)

Workers & Pages → Create → Pages → Connect to Git → `rs-ravi2/portfolio`.

| Setting | Value |
| :-- | :-- |
| Project name | `ravisingh` (gives `ravisingh.pages.dev`; if you pick another, update `profile.siteUrl`) |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | read from `.nvmrc` (22) |

Leave Cloudflare Web Analytics off: the site promises no analytics. A custom domain can be added later under the project's Custom domains tab; then update `profile.siteUrl`.

## Structure

```text
src/
  data/profile.ts         single source for profile, links, availability, contact
  data/services.ts        the three offers
  lab/corpus.ts           synthetic documents, labeled questions, synonym rules
  lab/engine.ts           tokeniser, BM25 ranking, tie-break, Recall@k, MRR@k
  lab/render.ts           HTML renderer shared by build time and the browser
  components/Lab.astro    the lab; prerendered default + small client script
  content/case-studies/   Markdown case studies (example.md is a draft template)
  pages/index.astro       the page
  pages/work/[slug].astro published case studies
tests/
  engine.test.ts          fixtures for ranking, ties and metrics
  e2e.mjs                 browser checks: layout, keyboard, no-JS, reduced motion, axe
```

The site sets no cookies, loads no third-party resources and runs no analytics. Fonts (Newsreader, IBM Plex Mono) are self-hosted via Fontsource.
