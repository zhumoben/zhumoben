import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { parseFrontmatter, parseScorecard } from "../schema.js";
import type {
  Chapter,
  QuestionFrontmatter,
  QuestionMeta,
  Scorecard,
} from "../../shared/types.js";
import { stripMarkdown } from "../../shared/score.js";

export interface LoadedQuestion {
  id: string;
  dir: string;
  file: string;
  frontmatter: QuestionFrontmatter;
  scorecard: Scorecard;
  chapters: Chapter[];
  body: string;
}

export function questionsDir(cwd: string): string {
  return path.join(cwd, "questions");
}

export async function listQuestionIds(cwd: string): Promise<string[]> {
  const dir = questionsDir(cwd);
  if (!fs.existsSync(dir)) return [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(dir, name, "question.mdx")))
    .sort();
}

export async function loadQuestion(cwd: string, id: string): Promise<LoadedQuestion> {
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
    throw new Error(`invalid question id "${id}"`);
  }

  const dir = path.join(questionsDir(cwd), id);
  const file = path.join(dir, "question.mdx");
  if (!fs.existsSync(file)) {
    throw new Error(`question "${id}" not found: expected ${file}`);
  }

  const raw = await fs.promises.readFile(file, "utf8");
  const parsed = matter(raw);

  let frontmatter: QuestionFrontmatter;
  try {
    frontmatter = parseFrontmatter(parsed.data) as QuestionFrontmatter;
  } catch (error) {
    throw new Error(`[${id}] ${(error as Error).message}`);
  }

  const scorecardFile = path.join(dir, "scorecard.json");
  if (!fs.existsSync(scorecardFile)) {
    throw new Error(`question "${id}" is missing scorecard.json`);
  }

  let scorecard: Scorecard;
  try {
    scorecard = parseScorecard(JSON.parse(await fs.promises.readFile(scorecardFile, "utf8")));
  } catch (error) {
    throw new Error(`[${id}] ${(error as Error).message}`);
  }

  return {
    id,
    dir,
    file,
    frontmatter,
    scorecard,
    chapters: extractChapters(parsed.content),
    body: parsed.content,
  };
}

export function toMeta(question: LoadedQuestion): QuestionMeta {
  return {
    ...question.frontmatter,
    id: question.id,
    tags: question.frontmatter.tags ?? [],
    chapters: question.chapters,
    scorecard: question.scorecard,
  };
}

export async function loadAllQuestions(cwd: string): Promise<LoadedQuestion[]> {
  const ids = await listQuestionIds(cwd);
  const questions: LoadedQuestion[] = [];
  for (const id of ids) {
    questions.push(await loadQuestion(cwd, id));
  }
  return questions;
}

/** `## 评定框架` -> { id: "评定框架", title: "评定框架" } — matches rehype-slug. */
export function extractChapters(body: string): Chapter[] {
  const slugger = new GithubSlugger();
  const chapters: Chapter[] = [];
  let inFence = false;

  for (const line of body.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const title = stripMarkdown(match[1]).replace(/\{#[^}]*\}\s*$/, "").trim();
    if (!title) continue;
    chapters.push({ id: slugger.slug(title), title });
  }

  return chapters;
}
