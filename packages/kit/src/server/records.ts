import fs from "node:fs";
import path from "node:path";
import { recordIdFor, summarize } from "../../shared/score.js";
import type { RecordSummary, ScoreRecord, Scorecard } from "../../shared/types.js";

export function recordsDir(cwd: string): string {
  return path.join(cwd, "records");
}

function assertInside(root: string, target: string): void {
  const base = path.resolve(root) + path.sep;
  if (!path.resolve(target).startsWith(base)) {
    throw new Error(`refusing to touch a path outside ${root}`);
  }
}

function recordPath(cwd: string, id: string): string {
  const root = recordsDir(cwd);
  const target = path.resolve(root, `${id}.json`);
  assertInside(root, target);
  return target;
}

async function walkIds(dir: string, prefix = ""): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const ids: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      ids.push(...(await walkIds(path.join(dir, entry.name), rel)));
    } else if (entry.name.endsWith(".json")) {
      ids.push(rel.slice(0, -".json".length));
    }
  }

  return ids.sort().reverse();
}

export async function listRecordIds(cwd: string): Promise<string[]> {
  return walkIds(recordsDir(cwd));
}

export async function readRecord(cwd: string, id: string): Promise<ScoreRecord> {
  const file = recordPath(cwd, id);
  if (!fs.existsSync(file)) {
    throw new Error(`record "${id}" not found`);
  }
  const raw = JSON.parse(await fs.promises.readFile(file, "utf8")) as ScoreRecord;
  return normalizeRecord(raw);
}

function normalizeRecord(raw: Partial<ScoreRecord>): ScoreRecord {
  return {
    schemaVersion: 1,
    questionId: raw.questionId ?? "",
    questionTitle: raw.questionTitle ?? "",
    candidate: raw.candidate ?? "",
    interviewer: raw.interviewer ?? "",
    date: raw.date ?? "1970-01-01",
    time: raw.time ?? "00:00",
    scores: raw.scores ?? {},
    notes: {
      pros: raw.notes?.pros ?? "",
      cons: raw.notes?.cons ?? "",
      questions: raw.notes?.questions ?? "",
    },
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export async function writeRecord(
  cwd: string,
  currentId: string | null,
  input: ScoreRecord,
): Promise<{ id: string }> {
  const root = recordsDir(cwd);
  await fs.promises.mkdir(root, { recursive: true });

  const record = normalizeRecord(input);
  record.updatedAt = new Date().toISOString();

  const nextId = recordIdFor(record);
  const target = recordPath(cwd, nextId);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });

  const tmp = `${target}.tmp`;
  await fs.promises.writeFile(tmp, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await fs.promises.rename(tmp, target);

  if (currentId && currentId !== nextId) {
    const old = recordPath(cwd, currentId);
    if (fs.existsSync(old)) {
      try {
        await fs.promises.unlink(old);
      } catch {
        // The file may be locked on Windows; the new copy is already on disk.
      }
    }
  }

  return { id: nextId };
}

export async function deleteRecord(cwd: string, id: string): Promise<{ movedTo: string }> {
  const root = recordsDir(cwd);
  const file = recordPath(cwd, id);
  if (!fs.existsSync(file)) {
    throw new Error(`record "${id}" not found`);
  }
  const trash = path.join(root, "_trash");
  await fs.promises.mkdir(trash, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(trash, `${id.replace(/\//g, "__")}.${stamp}.json`);
  await fs.promises.rename(file, target);
  return { movedTo: path.relative(cwd, target).replace(/\\/g, "/") };
}

export async function listSummaries(
  cwd: string,
  cards: Map<string, Scorecard>,
): Promise<RecordSummary[]> {
  const ids = await listRecordIds(cwd);
  const summaries: RecordSummary[] = [];

  for (const id of ids) {
    try {
      const record = await readRecord(cwd, id);
      const card = cards.get(record.questionId);
      if (!card) continue;
      summaries.push({ id, ...summarize(card, record) });
    } catch {
      // A malformed file should not take the whole list down.
    }
  }

  return summaries;
}

export async function latestRecordId(
  cwd: string,
  questionId: string,
): Promise<string | null> {
  const ids = await listRecordIds(cwd);
  for (const id of ids) {
    try {
      const record = await readRecord(cwd, id);
      if (record.questionId === questionId) return id;
    } catch {
      // skip
    }
  }
  return null;
}
