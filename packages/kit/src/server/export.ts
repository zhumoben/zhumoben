import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { bandOf, recordIdFor, totalOf } from "../../shared/score.js";
import type { ExportFormat, ScoreRecord } from "../../shared/types.js";
import type { LoadedQuestion } from "./questions.js";

/** `dist/cli.js` -> `../templates`, `src/server/export.ts` -> `../../templates`. */
function resolveTemplateRoot(): string {
  const here = new URL(".", import.meta.url);
  const candidates = ["../templates/", "../../templates/"].map((rel) =>
    fileURLToPath(new URL(rel, here)),
  );
  return candidates.find((dir) => fs.existsSync(dir)) ?? candidates[0];
}

const TEMPLATE_ROOT = resolveTemplateRoot();

export interface ExportResult {
  filename: string;
  content: string;
  mime: string;
}

export function renderExport(
  format: ExportFormat,
  record: ScoreRecord,
  question: LoadedQuestion,
  cwd: string,
  templatesDir = "templates",
): ExportResult {
  const card = question.scorecard;
  const { total, filled, count, max } = totalOf(card, record.scores);
  const band = bandOf(card, total);
  const id = recordIdFor(record);

  if (format === "json") {
    return {
      filename: `${id}.json`,
      content: JSON.stringify({ ...record, total, max, band: band?.label ?? null }, null, 2) + "\n",
      mime: "application/json",
    };
  }

  const file = `scorecard.${format}.hbs`;
  const override = path.resolve(cwd, templatesDir, file);
  const builtin = path.join(TEMPLATE_ROOT, file);
  const source = fs.readFileSync(fs.existsSync(override) ? override : builtin, "utf8");

  const template = Handlebars.compile(source, { noEscape: format === "md" });

  const rows = card.groups.flatMap((group) =>
    group.items.map((item) => ({
      group: group.title,
      label: item.label,
      score: record.scores[item.id]?.score ?? null,
      max: item.max,
      note: record.scores[item.id]?.note ?? "",
      fullCredit: item.fullCredit ?? "",
    })),
  );

  const content = template({
    record,
    question: { ...question.frontmatter, id: question.id },
    groups: card.groups,
    rows,
    total,
    max,
    filled,
    count,
    percent: max > 0 ? Math.round((total / max) * 100) : 0,
    band: band?.label ?? "—",
    tone: band?.tone ?? "gray",
    id,
    generatedAt: new Date().toISOString(),
  });

  return {
    filename: `${id}.${format}`,
    content,
    mime: format === "md" ? "text/markdown" : "text/html",
  };
}
