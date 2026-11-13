import fs from "node:fs";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import matter from "gray-matter";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { Plugin, ViteDevServer } from "vite";
import { listQuestionIds, loadAllQuestions, loadQuestion, toMeta } from "./server/questions.js";
import { createApiMiddleware } from "./server/middleware.js";
import type { KitConfig } from "../shared/types.js";

const VIRTUAL_PREFIX = "\0zhumoben:";

export interface ZhumobenPluginOptions {
  cwd: string;
  config?: KitConfig;
}

export function zhumoben(options: ZhumobenPluginOptions): Plugin {
  const { cwd } = options;
  const config = options.config ?? {};
  const questionsRoot = path.join(cwd, "questions");

  return {
    name: "zhumoben",

    resolveId(id) {
      if (id === "virtual:zhumoben/questions") {
        return `${VIRTUAL_PREFIX}questions`;
      }
      if (id.startsWith("virtual:zhumoben/question/")) {
        return VIRTUAL_PREFIX + id.slice("virtual:zhumoben/".length);
      }
      return null;
    },

    async load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      const key = id.slice(VIRTUAL_PREFIX.length);

      if (key === "questions") {
        return renderQuestionIndex(cwd);
      }

      if (key.startsWith("question/")) {
        return renderQuestionModule(cwd, key.slice("question/".length));
      }

      return null;
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use(createApiMiddleware({ cwd, config }));

      if (fs.existsSync(questionsRoot)) {
        server.watcher.add(questionsRoot);
        server.watcher.on("all", (_event, file) => {
          if (!file.startsWith(questionsRoot)) return;
          const modules = server.moduleGraph.idToModuleMap;
          for (const [moduleId, mod] of modules) {
            if (moduleId.startsWith(VIRTUAL_PREFIX)) {
              server.moduleGraph.invalidateModule(mod);
            }
          }
          server.ws.send({ type: "full-reload" });
        });
      }
    },
  };
}

async function renderQuestionIndex(cwd: string): Promise<string> {
  const questions = await loadAllQuestions(cwd);
  const entries = questions.map((question) => {
    const meta = toMeta(question);
    return `{
  meta: ${JSON.stringify(meta)},
  load: () => import("virtual:zhumoben/question/${question.id}")
}`;
  });

  return `export const questions = [\n${entries.join(",\n")}\n];\n`;
}

async function renderQuestionModule(cwd: string, id: string): Promise<string> {
  const question = await loadQuestion(cwd, id);
  const parsed = matter(await fs.promises.readFile(question.file, "utf8"));

  const compiled = await compile(parsed.content, {
    outputFormat: "program",
    providerImportSource: "@mdx-js/react",
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug],
    development: false,
  });

  return `${String(compiled)}\nexport const frontmatter = ${JSON.stringify(parsed.data)};\n`;
}

export async function warmup(cwd: string): Promise<void> {
  const ids = await listQuestionIds(cwd);
  if (ids.length === 0) return;
  await loadAllQuestions(cwd);
}
