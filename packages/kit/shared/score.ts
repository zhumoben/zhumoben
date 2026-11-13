import type {
  Band,
  QuestionMeta,
  RecordSummary,
  ScoreNote,
  ScoreRecord,
  Scorecard,
} from "./types.js";

export function emptyScores(card: Scorecard): Record<string, ScoreNote> {
  const scores: Record<string, ScoreNote> = {};
  for (const group of card.groups) {
    for (const item of group.items) {
      scores[item.id] = { score: null, note: "" };
    }
  }
  return scores;
}

export function totalOf(
  card: Scorecard,
  scores: Record<string, ScoreNote>,
): { total: number; filled: number; count: number; max: number } {
  let total = 0;
  let filled = 0;
  let count = 0;
  for (const group of card.groups) {
    for (const item of group.items) {
      count += 1;
      const raw = scores[item.id]?.score;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        total += clamp(raw, 0, item.max);
        filled += 1;
      }
    }
  }
  return { total, filled, count, max: card.max };
}

export function bandOf(card: Scorecard, total: number): Band | undefined {
  return card.bands.find((b) => total >= b.min && total <= b.max);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function safeName(input: string): string {
  const cleaned = String(input ?? "")
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "")
    .slice(0, 60);
  if (!cleaned) return "";
  return RESERVED.test(cleaned) ? `${cleaned}_` : cleaned;
}

/**
 * The record id is the file name without `.json`:
 *   records/2026-11-14.1430.张三.json  ->  2026-11-14.1430.张三
 */
export function recordIdFor(record: {
  date: string;
  time: string;
  candidate: string;
}): string {
  const date = record.date || "1970-01-01";
  const time = (record.time || "00:00").replace(/[^\d]/g, "").padEnd(4, "0").slice(0, 4);
  const name = safeName(record.candidate) || "未命名";
  return `${date}.${time}.${name}`;
}

export function summarize(
  card: Scorecard,
  record: ScoreRecord,
): Omit<RecordSummary, "id"> {
  const { total, filled, count, max } = totalOf(card, record.scores);
  const band = filled < count ? undefined : bandOf(card, total);
  return {
    questionId: record.questionId,
    questionTitle: record.questionTitle,
    candidate: record.candidate,
    interviewer: record.interviewer,
    date: record.date,
    time: record.time,
    total,
    max,
    band: band?.label ?? "未完成",
    tone: band?.tone ?? "amber",
    updatedAt: record.updatedAt,
  };
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}
