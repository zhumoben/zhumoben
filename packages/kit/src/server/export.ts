import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import { PRODUCT_HOMEPAGE, PRODUCT_NAME } from "../../shared/brand.js";
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

/** Local wall-clock time with its UTC offset, e.g. `2026-11-21 14:30:05 UTC+08:00`. */
export function formatLocalTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const zone = `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${zone}`
  );
}

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
    product: PRODUCT_NAME,
    homepage: PRODUCT_HOMEPAGE,
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
    generatedAt: formatLocalTimestamp(new Date()),
  });

  return {
    filename: `${id}.${format}`,
    content,
    mime: format === "md" ? "text/markdown" : "text/html",
  };
}
