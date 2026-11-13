import type { IncomingMessage, ServerResponse } from "node:http";
import {
  deleteRecord,
  listSummaries,
  readRecord,
  writeRecord,
} from "./records.js";
import { loadAllQuestions, loadQuestion, toMeta } from "./questions.js";
import { renderExport } from "./export.js";
import type { ExportFormat, KitConfig, ScoreRecord } from "../../shared/types.js";

type Next = (error?: unknown) => void;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function createApiMiddleware(options: { cwd: string; config: KitConfig }) {
  const { cwd, config } = options;

  return async function middleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: Next,
  ): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const route = url.pathname;

    if (!route.startsWith("/__kit/api/")) {
      next();
      return;
    }

    try {
      if (route === "/__kit/api/config" && req.method === "GET") {
        send(res, 200, config);
        return;
      }

      if (route === "/__kit/api/questions" && req.method === "GET") {
        const questions = await loadAllQuestions(cwd);
        send(res, 200, questions.map(toMeta));
        return;
      }

      if (route === "/__kit/api/records" && req.method === "GET") {
        const questions = await loadAllQuestions(cwd);
        const cards = new Map(questions.map((q) => [q.id, q.scorecard]));
        send(res, 200, await listSummaries(cwd, cards));
        return;
      }

      if (route === "/__kit/api/records" && req.method === "PUT") {
        const body = (await readBody(req)) as { id?: string | null; record: ScoreRecord };
        if (!body?.record) {
          send(res, 400, { error: "missing record" });
          return;
        }
        const result = await writeRecord(cwd, body.id ?? null, body.record);
        send(res, 200, result);
        return;
      }

      const recordMatch = /^\/__kit\/api\/records\/(.+)$/.exec(route);
      if (recordMatch) {
        const id = decodeURIComponent(recordMatch[1]);
        if (req.method === "GET") {
          send(res, 200, await readRecord(cwd, id));
          return;
        }
        if (req.method === "DELETE") {
          send(res, 200, await deleteRecord(cwd, id));
          return;
        }
      }

      if (route === "/__kit/api/export" && req.method === "POST") {
        const body = (await readBody(req)) as { id: string; format: ExportFormat };
        const record = await readRecord(cwd, body.id);
        const question = await loadQuestion(cwd, record.questionId);
        const result = renderExport(
          body.format === "md" || body.format === "html" ? body.format : "json",
          record,
          question,
          cwd,
          config.templatesDir,
        );
        send(res, 200, result);
        return;
      }

      send(res, 404, { error: `unknown endpoint ${route}` });
    } catch (error) {
      send(res, 500, { error: (error as Error).message });
    }
  };
}
