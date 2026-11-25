/**
 * HTML rendering for the lab. Used at build time (static default result) and
 * in the browser after every control change, so both paths show exactly the
 * same markup computed by the same engine.
 */

import { corpus, type LabQuestion } from "./corpus";
import {
  explain,
  fmt,
  highlight,
  type ApproachResult,
  type Evaluation,
  type QueryTerm,
  type QuestionResult,
} from "./engine";

const docById = new Map(corpus.map((d) => [d.id, d]));

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function marked(text: string, query: QueryTerm[]): string {
  return highlight(text, query)
    .map((s) =>
      s.kind === "plain"
        ? esc(s.text)
        : `<mark class="hit hit-${s.kind}">${esc(s.text)}</mark>`,
    )
    .join("");
}

function queryTerms(query: QueryTerm[]): string {
  if (!query.length) return `<span class="muted">no searchable words</span>`;
  return query
    .map((t) =>
      t.via
        ? `<span class="qt qt-synonym">${esc(t.term)}<span class="qt-via"> ← ${esc(t.via)}</span></span>`
        : `<span class="qt">${esc(t.term)}</span>`,
    )
    .join(" ");
}

const APPROACHES = {
  keyword: { letter: "A", name: "Keyword matching" },
  synonyms: { letter: "B", name: "Keyword + synonym map" },
} as const;

function column(id: keyof typeof APPROACHES, r: ApproachResult, q: LabQuestion, k: number): string {
  const { letter, name } = APPROACHES[id];
  const top = r.ranking.slice(0, k);
  const items = top
    .map((res) => {
      const expected = q.relevant.includes(res.doc.id);
      return `<li class="result${expected ? " is-expected" : ""}">
  <div class="result-head">
    <span class="result-rank" aria-label="Approach ${letter}, rank ${res.rank}">${letter}${res.rank}</span>
    <span class="result-title">${esc(res.doc.title)}</span>
    <span class="result-id">${res.doc.id}</span>
  </div>
  <p class="result-text">${marked(res.doc.text, r.query)}</p>
  <p class="result-meta">${expected ? `<strong class="flag-expected">✓ Expected source</strong> · ` : ""}score ${res.score.toFixed(2)}${res.tied ? ` · <span class="flag-tie">tied score, ordered by id</span>` : ""}</p>
</li>`;
    })
    .join("");

  let footnote = "";
  if (!top.length) {
    footnote = `<p class="empty">No document shares a searchable word with this question.</p>`;
  } else if (r.firstRelevant !== null && r.firstRelevant > k) {
    footnote = `<p class="below-cut">An expected source is at rank ${r.firstRelevant}, below the top ${k} shown.</p>`;
  } else if (r.firstRelevant === null) {
    footnote = `<p class="below-cut">No expected source was retrieved.</p>`;
  }

  return `<section class="approach approach-${id}" aria-labelledby="approach-${id}-title">
  <header class="approach-head">
    <h3 id="approach-${id}-title"><span class="approach-letter">${letter}</span> ${name}</h3>
    <p class="approach-query"><span class="label">Searched for</span> ${queryTerms(r.query)}</p>
  </header>
  ${top.length ? `<ol class="results" start="1">${items}</ol>` : ""}
  ${footnote}
</section>`;
}

export function renderComparison(result: QuestionResult, k: number): string {
  const q = result.question;
  const expected = q.relevant
    .map((id) => `<li><span class="result-id">${id}</span> ${esc(docById.get(id)?.title ?? id)}</li>`)
    .join("");
  return `<div class="question-card">
  <div>
    <p class="label">Question</p>
    <p class="question-text">${esc(q.text)}</p>
  </div>
  <div class="expected">
    <p class="label">Expected source${q.relevant.length > 1 ? "s" : ""}</p>
    <ul>${expected}</ul>
  </div>
</div>
<div class="comparison">
  ${column("keyword", result.keyword, q, k)}
  ${column("synonyms", result.synonyms, q, k)}
</div>
<div class="what-changed">
  <p class="label">What changed</p>
  <p>${esc(explain(result, k))}</p>
  ${q.note ? `<p class="note">${esc(q.note)}</p>` : ""}
</div>`;
}

function rankCell(r: number | null, k: number): string {
  if (r === null) return `<span class="miss">not found</span>`;
  if (r > k) return `<span class="miss">${r} <span class="small">(outside top ${k})</span></span>`;
  return String(r);
}

function verdict(p: QuestionResult): string {
  const a = p.keyword.rr;
  const b = p.synonyms.rr;
  const ra = p.keyword.recall;
  const rb = p.synonyms.recall;
  if (b > a || (b === a && rb > ra)) return `<span class="v v-better">better</span>`;
  if (b < a || (b === a && rb < ra)) return `<span class="v v-worse">worse</span>`;
  return `<span class="v v-same">same</span>`;
}

function delta(a: number, b: number): string {
  const d = b - a;
  if (Math.abs(d) < 0.005) return `<span class="delta">no change</span>`;
  return `<span class="delta">${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}</span>`;
}

export function renderMetrics(ev: Evaluation, selectedId: string): string {
  const { keyword: a, synonyms: b } = ev.summary;
  const k = ev.k;
  const rows = ev.perQuestion
    .map(
      (p) => `<tr${p.question.id === selectedId ? ` class="is-selected" aria-current="true"` : ""}>
  <th scope="row">${esc(p.question.text)}</th>
  <td>${rankCell(p.keyword.firstRelevant, k)}</td>
  <td>${rankCell(p.synonyms.firstRelevant, k)}</td>
  <td>${verdict(p)}</td>
</tr>`,
    )
    .join("");

  return `<div class="scoreboard">
  <div class="metric">
    <h4 class="metric-name">Recall@${k}</h4>
    <p class="metric-def">Of the expected sources, what share appear in the top ${k} results, averaged over questions.</p>
    <dl class="metric-values">
      <div><dt>A · Keyword</dt><dd>${fmt(a.recall)}</dd></div>
      <div><dt>B · + Synonyms</dt><dd>${fmt(b.recall)} ${delta(a.recall, b.recall)}</dd></div>
    </dl>
  </div>
  <div class="metric">
    <h4 class="metric-name">MRR@${k}</h4>
    <p class="metric-def">How near the top the first expected source sits: 1.00 means always first, 0.50 means second on average, 0 if it is not in the top ${k}.</p>
    <dl class="metric-values">
      <div><dt>A · Keyword</dt><dd>${fmt(a.mrr)}</dd></div>
      <div><dt>B · + Synonyms</dt><dd>${fmt(b.mrr)} ${delta(a.mrr, b.mrr)}</dd></div>
    </dl>
  </div>
</div>
<p class="metric-count">Computed from ${ev.queryCount} labeled questions over ${corpus.length} synthetic documents.</p>
<div class="table-wrap">
<table class="per-question">
  <caption>Rank of the first expected source, per question</caption>
  <thead><tr><th scope="col">Question</th><th scope="col">A · Keyword</th><th scope="col">B · + Synonyms</th><th scope="col">B vs A</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>`;
}

/** One short sentence for the live region. */
export function announce(ev: Evaluation, selectedId: string): string {
  const p = ev.perQuestion.find((x) => x.question.id === selectedId)!;
  const where = (r: number | null) =>
    r === null ? "not found" : r > ev.k ? `rank ${r}, outside the top ${ev.k}` : `rank ${r}`;
  return `Results updated. Keyword: ${where(p.keyword.firstRelevant)}. With synonyms: ${where(
    p.synonyms.firstRelevant,
  )}. MRR@${ev.k} across ${ev.queryCount} questions: ${fmt(ev.summary.keyword.mrr)} versus ${fmt(
    ev.summary.synonyms.mrr,
  )}.`;
}
