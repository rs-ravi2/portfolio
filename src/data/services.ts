/**
 * The three fixed-scope offers. Examples are illustrative scenarios that show
 * the shape of a handoff. They are not past client work and should never be
 * described as such.
 */

export interface Service {
  id: string;
  title: string;
  summary: string;
  input: string;
  output: string;
  acceptance: string;
}

export const services: Service[] = [
  {
    id: "automate",
    title: "Automate one workflow or API integration",
    summary:
      "A repetitive task that runs on copy-paste, or two tools that should talk to each other and don’t.",
    input:
      "A weekly CSV export from your billing tool, read access to your CRM’s API, and a description of what someone currently does by hand.",
    output:
      "A Python job that reads the export, matches each row to a CRM contact and updates it, writing a run log and an exceptions file. Includes a README so your team can run and change it.",
    acceptance:
      "On a sample week you supply, every row is either updated or listed in the exceptions file with a reason, and running it twice makes no duplicate changes.",
  },
  {
    id: "pipeline",
    title: "Build or repair one data pipeline",
    summary:
      "A report that is late, wrong, or rebuilt by hand. Or a pipeline nobody wants to touch.",
    input:
      "Read access to three source tables, the report or table they should feed, and one month you have checked by hand.",
    output:
      "Tested SQL and Python transformations that build the target table on a schedule in your environment, with data-quality checks and a short runbook.",
    acceptance:
      "Row counts and totals reconcile with your hand-checked month, and the run fails loudly, naming the column, when a key is null or duplicated.",
  },
  {
    id: "evaluate",
    title: "Evaluate one LLM or RAG workflow",
    summary:
      "An assistant or search feature that seems fine in demos, and you can’t say how often it is wrong.",
    input:
      "Your current prompt or retrieval setup, plus 30 to 100 real questions with known-good answers or source documents.",
    output:
      "A labeled test set, a repeatable evaluation script reporting retrieval and answer metrics, and a written summary of failure patterns with ranked fixes.",
    acceptance:
      "One command reproduces the reported numbers on your machine, and every recommended fix cites failing examples from your test set.",
  },
];

export const process = [
  {
    step: "Send the problem",
    detail: "What happens today, a few sample inputs, the output you want, and your deadline.",
  },
  {
    step: "Get a written scope",
    detail:
      "One deliverable, a fixed price, acceptance criteria you can check, milestones, and what is out of scope. Nothing starts until you agree.",
  },
  {
    step: "Receive it in milestones",
    detail:
      "Each milestone ships with a short note on what changed and how to verify it. The final handoff includes docs, and a call if useful.",
  },
];
