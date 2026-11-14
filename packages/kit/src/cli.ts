#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadConfig } from "./server/config.js";
import { loadAllQuestions, listQuestionIds } from "./server/questions.js";
import { zhumoben } from "./plugin.js";

const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const appRoot = path.join(pkgRoot, "app");

/** Port of the packaged/release build. */
export const RELEASE_PORT = 5900;
/** Port used by the dev server. */
export const DEV_PORT = 5901;

const HELP = `
zhumoben — local-first interview question bank and scorecard

Usage:
  zhumoben dev [--port 5901] [--open]
  zhumoben init
  zhumoben new-question <id>

The current directory is your data project: questions/, records/ and
kit.config.ts. Nothing leaves this machine.
`.trim();

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? "dev";

  if (command === "-h" || command === "--help" || command === "help") {
    console.log(HELP);
    return;
  }

  if (command === "-v" || command === "--version") {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(pkgRoot, "package.json"), "utf8"),
    ) as { version: string };
    console.log(pkg.version);
    return;
  }

  if (command === "init") {
    await init(process.cwd());
    return;
  }

  if (command === "new-question") {
    const id = argv[1];
    if (!id) {
      console.error("usage: zhumoben new-question <id>");
      process.exitCode = 1;
      return;
    }
    await newQuestion(process.cwd(), id);
    return;
  }

  if (command === "dev") {
    await dev(process.cwd(), argv.slice(1));
    return;
  }

  console.error(`unknown command "${command}"\n\n${HELP}`);
  process.exitCode = 1;
}

async function dev(cwd: string, args: string[]): Promise<void> {
  if (!fs.existsSync(appRoot)) {
    throw new Error(`app assets are missing at ${appRoot}; the package is broken`);
  }

  const config = await loadConfig(cwd);

  const ids = await listQuestionIds(cwd);
  if (ids.length === 0) {
    console.warn(
      `\n[zhumoben] no questions found in ${path.join(cwd, "questions")}\n` +
        `           run "zhumoben init" or "zhumoben new-question <id>" first.\n`,
    );
  }

  // Fail fast with a readable message instead of a Vite overlay.
  try {
    await loadAllQuestions(cwd);
  } catch (error) {
    console.error(`\n[zhumoben] ${(error as Error).message}\n`);
    process.exit(1);
  }

  const portFlag = args.indexOf("--port");
  const port =
    portFlag >= 0 ? Number(args[portFlag + 1]) : (config.devPort ?? DEV_PORT);
  const open = args.includes("--open") || config.open === true;

  const server = await createServer({
    root: appRoot,
    configFile: false,
    envDir: false,
    cacheDir: path.join(cwd, "node_modules", ".zhumoben"),
    plugins: [react(), tailwindcss(), zhumoben({ cwd, config })],
    server: {
      port,
      open,
      fs: { allow: [appRoot, cwd] },
    },
  });

  await server.listen();
  server.printUrls();
  console.log(
    `\n  zhumoben · ${config.title ?? "Interview Kit"}\n` +
      `  dev     http://localhost:${port}\n` +
      `  release :${config.port ?? RELEASE_PORT}\n` +
      `  data    ${cwd}\n` +
      `  questions ${ids.length}\n`,
  );
}

async function init(cwd: string): Promise<void> {
  const questions = path.join(cwd, "questions");
  const records = path.join(cwd, "records");
  fs.mkdirSync(questions, { recursive: true });
  fs.mkdirSync(records, { recursive: true });

  const configFile = path.join(cwd, "kit.config.ts");
  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(
      configFile,
      `export default {
  title: "Interview Kit",
  port: 5900,
  devPort: 5901,
  // tags: { react: { color: "accent" } },
};\n`,
      "utf8",
    );
  }

  const readme = path.join(questions, "README.md");
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `# 题库\n\n每个子目录是一道题：\n\n- \`question.mdx\` — frontmatter（标题、难度、标签…）+ 正文\n- \`scorecard.json\` — 评分维度、分值与档位\n\n新建：\`npx zhumoben new-question <id>\`\n`,
      "utf8",
    );
  }

  const gitkeep = path.join(records, ".gitkeep");
  if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, "", "utf8");

  console.log(`\n  zhumoben initialised in ${cwd}\n` + `  next: npx zhumoben dev\n`);
}

async function newQuestion(cwd: string, id: string): Promise<void> {
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
    throw new Error("question id may only contain letters, digits, dot, dash and underscore");
  }
  const dir = path.join(cwd, "questions", id);
  if (fs.existsSync(dir)) {
    throw new Error(`question "${id}" already exists`);
  }
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "question.mdx"),
    `---
title: ${id}
subtitle: 一句话说明
level: L3
levelLabel: Mid+
duration: 30 min
stack: TypeScript
format: 现场 / 共享编辑器
tags: []
summary: 用一两句话说明这道题考什么。
---

## 题目

在这里写题目描述。

<Callout tone="info">
  **考官提示：** 这里可以写一句话提醒。
</Callout>

## 考察要点

| 维度 | 及格 | 资深 |
| --- | --- | --- |
| 示例 | 能跑通 | 能说清取舍 |
`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(dir, "scorecard.json"),
    `${JSON.stringify(
      {
        version: 1,
        max: 100,
        groups: [
          {
            id: "core",
            title: "核心实现",
            items: [
              { id: "impl", label: "实现正确", max: 50 },
              { id: "design", label: "结构设计", max: 30 },
            ],
          },
          {
            id: "craft",
            title: "工程细节",
            items: [{ id: "detail", label: "边界与细节", max: 20 }],
          },
        ],
        bands: [
          { min: 90, max: 100, label: "Strong", tone: "accent" },
          { min: 75, max: 89, label: "Pass", tone: "accent" },
          { min: 60, max: 74, label: "Borderline", tone: "amber" },
          { min: 0, max: 59, label: "No Hire", tone: "red" },
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`  created questions/${id}\n`);
}

main().catch((error) => {
  console.error(`\n[zhumoben] ${(error as Error).message}\n`);
  process.exit(1);
});
