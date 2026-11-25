/**
 * Deterministic keyword retrieval for the lab.
 *
 * - Tokenise: lowercase, drop apostrophes, split on anything that is not a
 *   letter or digit, remove common stop words, then apply a small suffix
 *   stemmer so "permits" and "permit" count as the same word.
 * - Score: BM25 (k1 = 1.2, b = 0.75), a standard keyword-ranking formula that
 *   rewards rarer words and repeated matches while discounting long documents.
 * - Synonyms: each enabled rule adds its replacement words to the query at
 *   half weight. Words the visitor typed always keep full weight.
 * - Ties: documents with equal scores (within 1e-9) are ordered by id, so the
 *   same input always produces the same ranking.
 *
 * No network, no model, no randomness.
 */

import type { Doc, LabQuestion, SynonymRule } from "./corpus";

export const BM25_K1 = 1.2;
export const BM25_B = 0.75;
export const SYNONYM_WEIGHT = 0.5;
export const TIE_EPSILON = 1e-9;

const STOP_WORDS = new Set(
  (
    "a an the and or but of to in on for at by with from into onto about " +
    "is are was were be been being am do does did doing done have has had " +
    "i me my mine you your yours we us our they them their he she it its " +
    "this that these those there here what which who whom whose when where " +
    "why how if then than so as not no yes can could will would should may " +
    "might must shall need get got just also any all each per up out over " +
    "under very too much many more most some such only own same other off " +
    "again further once tell"
  ).split(" "),
);

/** Small, predictable suffix stemmer. Not linguistically complete by design. */
export function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ied")) return w.slice(0, -3) + "y";
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && /(sses|xes|ches|shes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) {
    return w.slice(0, -1);
  }
  return w;
}

export interface Token {
  /** Original surface text, e.g. "Permits". */
  raw: string;
  /** Normalised term, e.g. "permit". Empty for stop words. */
  term: string;
  start: number;
  end: number;
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu;

/** Tokenise text while keeping character offsets for highlighting. */
export function tokenizeWithSpans(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const raw = m[0];
    const cleaned = raw.toLowerCase().replace(/['’]s?$/u, "").replace(/['’]/gu, "");
    const term = !cleaned || STOP_WORDS.has(cleaned) ? "" : stem(cleaned);
    out.push({ raw, term, start: m.index!, end: m.index! + raw.length });
  }
  return out;
}

export function tokenize(text: string): string[] {
  return tokenizeWithSpans(text)
    .map((t) => t.term)
    .filter(Boolean);
}

export interface IndexedDoc {
  doc: Doc;
  tf: Map<string, number>;
  length: number;
}

export interface Index {
  docs: IndexedDoc[];
  df: Map<string, number>;
  avgLength: number;
}

export function buildIndex(docs: Doc[]): Index {
  const indexed: IndexedDoc[] = docs.map((doc) => {
    const terms = tokenize(`${doc.title} ${doc.text}`);
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { doc, tf, length: terms.length };
  });
  const df = new Map<string, number>();
  for (const d of indexed) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLength = indexed.reduce((s, d) => s + d.length, 0) / Math.max(indexed.length, 1);
  return { docs: indexed, df, avgLength };
}

export function idf(index: Index, term: string): number {
  const n = index.docs.length;
  const df = index.df.get(term) ?? 0;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

export interface QueryTerm {
  term: string;
  weight: number;
  /** For synonym terms: the visitor's word that triggered the rule. */
  via?: string;
}

/**
 * Turn a question into weighted terms. Typed words get weight 1; enabled
 * synonym rules add their targets at SYNONYM_WEIGHT unless the visitor already
 * typed that word.
 */
export function buildQuery(text: string, rules: SynonymRule[] = []): QueryTerm[] {
  const typed = [...new Set(tokenize(text))];
  const terms = new Map<string, QueryTerm>();
  for (const t of typed) terms.set(t, { term: t, weight: 1 });
  for (const rule of rules) {
    const from = stem(rule.from.toLowerCase());
    if (!typed.includes(from)) continue;
    for (const target of rule.to) {
      const term = stem(target.toLowerCase());
      if (!terms.has(term)) terms.set(term, { term, weight: SYNONYM_WEIGHT, via: rule.from });
    }
  }
  return [...terms.values()];
}

export interface Match {
  term: string;
  via?: string;
  contribution: number;
}

export interface Ranked {
  doc: Doc;
  rank: number;
  score: number;
  matches: Match[];
  /** True when this result's score equals a neighbour's and id broke the tie. */
  tied: boolean;
}

export function scoreDoc(index: Index, d: IndexedDoc, query: QueryTerm[]): { score: number; matches: Match[] } {
  let score = 0;
  const matches: Match[] = [];
  for (const q of query) {
    const tf = d.tf.get(q.term) ?? 0;
    if (!tf) continue;
    const norm = tf + BM25_K1 * (1 - BM25_B + (BM25_B * d.length) / index.avgLength);
    const contribution = q.weight * idf(index, q.term) * ((tf * (BM25_K1 + 1)) / norm);
    score += contribution;
    matches.push({ term: q.term, via: q.via, contribution });
  }
  return { score, matches };
}

/** Compare two scored docs: higher score first, then ascending id. */
export function compareResults(a: { score: number; doc: Doc }, b: { score: number; doc: Doc }): number {
  if (Math.abs(a.score - b.score) > TIE_EPSILON) return b.score - a.score;
  return a.doc.id < b.doc.id ? -1 : a.doc.id > b.doc.id ? 1 : 0;
}

/** Rank every document with a positive score. Documents with no match are not retrieved. */
export function rank(index: Index, query: QueryTerm[]): Ranked[] {
  const scored = index.docs
    .map((d) => ({ doc: d.doc, ...scoreDoc(index, d, query) }))
    .filter((r) => r.score > 0)
    .sort(compareResults);
  return scored.map((r, i) => {
    const prev = scored[i - 1];
    const next = scored[i + 1];
    const tied =
      (prev !== undefined && Math.abs(prev.score - r.score) <= TIE_EPSILON) ||
      (next !== undefined && Math.abs(next.score - r.score) <= TIE_EPSILON);
    return { ...r, rank: i + 1, tied };
  });
}

/* ───────────────────────────── metrics ───────────────────────────── */

/** Share of relevant ids found in the top k. */
export function recallAtK(rankedIds: string[], relevant: string[], k: number): number {
  if (relevant.length === 0) return 0;
  const top = new Set(rankedIds.slice(0, k));
  return relevant.filter((id) => top.has(id)).length / relevant.length;
}

/** 1 / rank of the first relevant id within the top k, or 0. */
export function reciprocalRankAtK(rankedIds: string[], relevant: string[], k: number): number {
  const r = firstRelevantRank(rankedIds, relevant);
  return r !== null && r <= k ? 1 / r : 0;
}

/** 1-based rank of the first relevant id anywhere in the ranking, or null. */
export function firstRelevantRank(rankedIds: string[], relevant: string[]): number | null {
  const i = rankedIds.findIndex((id) => relevant.includes(id));
  return i === -1 ? null : i + 1;
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
}

/* ─────────────────────────── lab evaluation ─────────────────────────── */

export type ApproachId = "keyword" | "synonyms";

export interface ApproachResult {
  ranking: Ranked[];
  query: QueryTerm[];
  firstRelevant: number | null;
  recall: number;
  rr: number;
}

export interface QuestionResult {
  question: LabQuestion;
  keyword: ApproachResult;
  synonyms: ApproachResult;
}

export interface Evaluation {
  k: number;
  perQuestion: QuestionResult[];
  summary: Record<ApproachId, { recall: number; mrr: number }>;
  queryCount: number;
}

function runApproach(index: Index, q: LabQuestion, rules: SynonymRule[], k: number): ApproachResult {
  const query = buildQuery(q.text, rules);
  const ranking = rank(index, query);
  const ids = ranking.map((r) => r.doc.id);
  return {
    ranking,
    query,
    firstRelevant: firstRelevantRank(ids, q.relevant),
    recall: recallAtK(ids, q.relevant, k),
    rr: reciprocalRankAtK(ids, q.relevant, k),
  };
}

export function evaluate(
  index: Index,
  questions: LabQuestion[],
  enabledRules: SynonymRule[],
  k: number,
): Evaluation {
  const perQuestion = questions.map((q) => ({
    question: q,
    keyword: runApproach(index, q, [], k),
    synonyms: runApproach(index, q, enabledRules, k),
  }));
  const summarise = (a: ApproachId) => ({
    recall: mean(perQuestion.map((p) => p[a].recall)),
    mrr: mean(perQuestion.map((p) => p[a].rr)),
  });
  return {
    k,
    perQuestion,
    summary: { keyword: summarise("keyword"), synonyms: summarise("synonyms") },
    queryCount: questions.length,
  };
}

/* ─────────────────────────── explanation ─────────────────────────── */

function rankPhrase(r: number | null, k: number): string {
  if (r === null) return "not retrieved at all";
  if (r > k) return `rank ${r}, outside the top ${k}`;
  return `rank ${r}`;
}

/**
 * Plain-language account of what the synonym map changed for one question.
 * Built only from the computed rankings.
 */
export function explain(result: QuestionResult, k: number): string {
  const { keyword: a, synonyms: b, question } = result;
  const fired = b.query.filter((t) => t.via);
  const firedRules = [...new Set(fired.map((t) => t.via!))].map((from) => {
    const targets = fired.filter((t) => t.via === from).map((t) => `“${t.term}”`);
    return `“${from}” → ${targets.join(", ")}`;
  });
  const used = firedRules.length
    ? `The synonym map added ${firedRules.join("; ")}.`
    : "No synonym rule matched a word in this question, so both rankings are identical.";

  const aHit = a.firstRelevant !== null && a.firstRelevant <= k;
  const bHit = b.firstRelevant !== null && b.firstRelevant <= k;
  const expected = question.relevant.length > 1 ? "the first expected source" : "the expected source";

  if (!firedRules.length) {
    return aHit
      ? `${used} Both put ${expected} at ${rankPhrase(a.firstRelevant, k)}.`
      : `${used} Both miss: ${expected} is ${rankPhrase(a.firstRelevant, k)}.`;
  }

  const ar = a.firstRelevant ?? Infinity;
  const br = b.firstRelevant ?? Infinity;
  if (br < ar) {
    return `${used} That moved ${expected} from ${rankPhrase(a.firstRelevant, k)} to ${rankPhrase(b.firstRelevant, k)}.`;
  }
  if (br > ar) {
    const intruder = b.ranking.find((r) => !question.relevant.includes(r.doc.id) && r.rank < br);
    const who = intruder ? ` “${intruder.doc.title}” now outranks it.` : "";
    return `${used} That made this question worse: ${expected} fell from ${rankPhrase(a.firstRelevant, k)} to ${rankPhrase(b.firstRelevant, k)}.${who}`;
  }
  if (a.recall !== b.recall) {
    return `${used} ${expected[0].toUpperCase()}${expected.slice(1)} stays at ${rankPhrase(b.firstRelevant, k)}, and recall in the top ${k} goes from ${fmt(a.recall)} to ${fmt(b.recall)}.`;
  }
  return bHit
    ? `${used} Scores change, but ${expected} stays at ${rankPhrase(b.firstRelevant, k)}.`
    : `${used} It did not help: ${expected} is still ${rankPhrase(b.firstRelevant, k)}.`;
}

export function fmt(n: number): string {
  return n.toFixed(2);
}

/* ─────────────────────────── highlighting ─────────────────────────── */

export interface Segment {
  text: string;
  kind: "plain" | "typed" | "synonym";
}

/** Split text into segments, marking words that matched the query. */
export function highlight(text: string, query: QueryTerm[]): Segment[] {
  const kinds = new Map(query.map((q) => [q.term, q.via ? "synonym" : "typed"] as const));
  const segments: Segment[] = [];
  let cursor = 0;
  for (const tok of tokenizeWithSpans(text)) {
    const kind = tok.term ? kinds.get(tok.term) : undefined;
    if (!kind) continue;
    if (tok.start > cursor) segments.push({ text: text.slice(cursor, tok.start), kind: "plain" });
    segments.push({ text: tok.raw, kind });
    cursor = tok.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), kind: "plain" });
  return segments;
}
