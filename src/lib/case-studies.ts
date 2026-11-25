import { getCollection, type CollectionEntry } from "astro:content";

export type CaseStudy = CollectionEntry<"caseStudies">;

/** Published case studies only: drafts never reach a public page. Newest first. */
export async function getPublicCaseStudies(): Promise<CaseStudy[]> {
  const all = await getCollection("caseStudies", ({ data }) => data.draft !== true);
  for (const c of all) {
    if (c.data.client !== "anonymous" && !c.data.permission) {
      throw new Error(
        `Case study "${c.id}" names client "${c.data.client}" without permission: true. Use "anonymous" or record permission.`,
      );
    }
  }
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
