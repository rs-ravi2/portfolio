import { describe, expect, it } from "vitest";
import {
  buildIndex,
  buildQuery,
  compareResults,
  evaluate,
  explain,
  firstRelevantRank,
  highlight,
  idf,
  mean,
  rank,
  recallAtK,
  reciprocalRankAtK,
  stem,
  tokenize,
  SYNONYM_WEIGHT,
} from "../src/lab/engine";
import { corpus, questions, synonymRules } from "../src/lab/corpus";
import type { Doc } from "../src/lab/corpus";

describe("tokenize and stem", () => {
  it("lowercases, drops stop words and apostrophes, and stems plurals", () => {
    expect(tokenize("Who fixes the kids' Permits?")).toEqual(["fix", "kid", "permit"]);
  });
  it("keeps the stemmer predictable", () => {
    expect(stem("parking")).toBe("park");
    expect(stem("libraries")).toBe("library");
    expect(stem("emptied")).toBe("empty");
    expect(stem("address")).toBe("address");
    expect(stem("bus")).toBe("bus");
    expect(stem("van")).toBe("van");
  });
});

describe("metrics on known fixtures", () => {
  const ranking = ["A", "B", "C", "D", "E"];
  it("Recall@k counts the share of relevant ids in the top k", () => {
    expect(recallAtK(ranking, ["B", "E"], 1)).toBe(0);
    expect(recallAtK(ranking, ["B", "E"], 3)).toBe(0.5);
    expect(recallAtK(ranking, ["B", "E"], 5)).toBe(1);
    expect(recallAtK(ranking, ["Z"], 5)).toBe(0);
    expect(recallAtK([], ["A"], 3)).toBe(0);
  });
  it("RR@k is 1/rank of the first relevant id inside k, else 0", () => {
    expect(reciprocalRankAtK(ranking, ["C", "D"], 5)).toBeCloseTo(1 / 3);
    expect(reciprocalRankAtK(ranking, ["A"], 1)).toBe(1);
    expect(reciprocalRankAtK(ranking, ["C"], 2)).toBe(0);
    expect(reciprocalRankAtK(ranking, ["Z"], 5)).toBe(0);
  });
  it("first relevant rank looks past k and returns null when absent", () => {
    expect(firstRelevantRank(ranking, ["E"])).toBe(5);
    expect(firstRelevantRank(ranking, ["Z"])).toBeNull();
  });
  it("MRR is the mean of reciprocal ranks", () => {
    // ranks 1, 2, miss → (1 + 0.5 + 0) / 3
    expect(mean([1, 0.5, 0])).toBeCloseTo(0.5);
    expect(mean([])).toBe(0);
  });
});

describe("ranking", () => {
  const docs: Doc[] = [
    { id: "X2", title: "Alpha", text: "river bridge" },
    { id: "X1", title: "Alpha", text: "river bridge" },
    { id: "X3", title: "Beta", text: "river river river delta" },
    { id: "X4", title: "Gamma", text: "unrelated words only" },
  ];
  const index = buildIndex(docs);

  it("computes BM25 IDF from document frequency", () => {
    // "river" in 3 of 4 docs: ln(1 + (4 - 3 + 0.5) / (3 + 0.5))
    expect(idf(index, "river")).toBeCloseTo(Math.log(1 + 1.5 / 3.5));
  });

  it("breaks exact score ties by ascending document id and flags them", () => {
    const results = rank(index, buildQuery("bridge"));
    expect(results.map((r) => r.doc.id)).toEqual(["X1", "X2"]);
    expect(results.every((r) => r.tied)).toBe(true);
    expect(results.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("is independent of input order", () => {
    const reversed = buildIndex([...docs].reverse());
    const a = rank(index, buildQuery("river bridge")).map((r) => r.doc.id);
    const b = rank(reversed, buildQuery("river bridge")).map((r) => r.doc.id);
    expect(a).toEqual(b);
  });

  it("does not retrieve documents with no matching word", () => {
    expect(rank(index, buildQuery("bridge")).some((r) => r.doc.id === "X4")).toBe(false);
    expect(rank(index, buildQuery("zebra"))).toEqual([]);
  });

  it("compareResults orders by score first", () => {
    const hi = { score: 2, doc: docs[1] };
    const lo = { score: 1, doc: docs[0] };
    expect(compareResults(hi, lo)).toBeLessThan(0);
    expect(compareResults({ score: 1, doc: docs[0] }, { score: 1 + 1e-12, doc: docs[1] })).toBeGreaterThan(0);
  });
});

describe("synonym expansion", () => {
  it("adds targets at reduced weight only when the trigger word is typed", () => {
    const q = buildQuery("Where is my bin?", [{ id: "bin", from: "bin", to: ["waste"] }]);
    expect(q).toEqual([
      { term: "bin", weight: 1 },
      { term: "waste", weight: SYNONYM_WEIGHT, via: "bin" },
    ]);
    expect(buildQuery("Where is my car?", [{ id: "bin", from: "bin", to: ["waste"] }])).toEqual([
      { term: "car", weight: 1 },
    ]);
  });
  it("never downgrades a word the visitor typed", () => {
    const q = buildQuery("bin waste", [{ id: "bin", from: "bin", to: ["waste"] }]);
    expect(q.find((t) => t.term === "waste")?.weight).toBe(1);
  });
});

describe("lab corpus behaviour", () => {
  const index = buildIndex(corpus);
  const at3 = evaluate(index, questions, synonymRules, 3);
  const byId = Object.fromEntries(at3.perQuestion.map((p) => [p.question.id, p]));

  it("labels every question with sources that exist", () => {
    const ids = new Set(corpus.map((d) => d.id));
    for (const q of questions) for (const r of q.relevant) expect(ids.has(r)).toBe(true);
  });

  it("matches the hand-checked summary at k = 3", () => {
    expect(at3.queryCount).toBe(10);
    expect(at3.summary.keyword.recall).toBeCloseTo(0.65);
    expect(at3.summary.synonyms.recall).toBeCloseTo(0.9);
    expect(at3.summary.keyword.mrr).toBeCloseTo(0.6);
    expect(at3.summary.synonyms.mrr).toBeCloseTo(0.8);
  });

  it("summary equals the mean of per-question values", () => {
    expect(at3.summary.synonyms.recall).toBeCloseTo(mean(at3.perQuestion.map((p) => p.synonyms.recall)));
    expect(at3.summary.keyword.mrr).toBeCloseTo(mean(at3.perQuestion.map((p) => p.keyword.rr)));
  });

  it("the default question shows a real improvement", () => {
    expect(byId.sofa.keyword.firstRelevant).toBeNull();
    expect(byId.sofa.synonyms.firstRelevant).toBe(1);
  });

  it("includes a case the synonym map makes worse", () => {
    expect(byId["van-permit"].keyword.firstRelevant).toBe(1);
    expect(byId["van-permit"].synonyms.firstRelevant).toBe(2);
    expect(explain(byId["van-permit"], 3)).toMatch(/worse/);
  });

  it("includes a vocabulary gap neither approach recovers", () => {
    expect(byId.lamp.keyword.firstRelevant).toBeNull();
    expect(byId.lamp.synonyms.firstRelevant).toBeNull();
  });

  it("disabling a rule changes the computed results", () => {
    const withoutPermit = evaluate(index, questions, synonymRules.filter((r) => r.id !== "permit"), 3);
    const van = withoutPermit.perQuestion.find((p) => p.question.id === "van-permit")!;
    expect(van.synonyms.firstRelevant).toBe(1);
    expect(withoutPermit.summary.synonyms.mrr).not.toBeCloseTo(at3.summary.synonyms.mrr);
  });

  it("is deterministic across runs", () => {
    const again = evaluate(buildIndex(corpus), questions, synonymRules, 3);
    expect(JSON.stringify(again)).toBe(JSON.stringify(at3));
  });
});

describe("highlight", () => {
  it("marks typed and synonym matches and preserves the original text", () => {
    const q = buildQuery("bin", [{ id: "bin", from: "bin", to: ["waste"] }]);
    const segs = highlight("Put the bin and waste out.", q);
    expect(segs.map((s) => s.text).join("")).toBe("Put the bin and waste out.");
    expect(segs.filter((s) => s.kind !== "plain")).toEqual([
      { text: "bin", kind: "typed" },
      { text: "waste", kind: "synonym" },
    ]);
  });
});
