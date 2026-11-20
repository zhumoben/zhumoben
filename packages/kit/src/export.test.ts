import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderExport, labelColumnWidth } from "./server/export.js";
import type { LoadedQuestion } from "./server/questions.js";
import type { ScoreRecord, Scorecard } from "../shared/types.js";

const scorecard: Scorecard = {
  version: 1,
  max: 100,
  groups: [
    {
      id: "core",
      title: "核心",
      items: [{ id: "render", label: "动态渲染", max: 100 }],
    },
  ],
  bands: [
    { min: 90, max: 100, label: "Strong", tone: "accent" },
    { min: 80, max: 89, label: "Senior", tone: "accent" },
    { min: 0, max: 79, label: "No Hire", tone: "red" },
  ],
};

const question: LoadedQuestion = {
  id: "demo",
  dir: "",
  file: "",
  frontmatter: { title: "演示题", subtitle: "副标题" },
  scorecard,
  chapters: [],
  body: "",
};

const record: ScoreRecord = {
  schemaVersion: 1,
  questionId: "demo",
  questionTitle: "演示题",
  candidate: "张三",
  interviewer: "李四",
  date: "2026-11-14",
  time: "14:30",
  scores: { render: { score: 86, note: "一次 map" } },
  notes: { pros: "结构清晰", cons: "缺少校验", questions: "跑过 tsc 吗" },
  createdAt: "2026-11-14T06:30:00.000Z",
  updatedAt: "2026-11-14T06:30:00.000Z",
};

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "zhumoben-export-"));
}

describe("export templates", () => {
  it("sizes the dimension column from its longest label", () => {
    expect(labelColumnWidth(["接口设计"])).toBe(78);
    expect(labelColumnWidth(["并发窗口"])).toBe(78);
    expect(labelColumnWidth(["Promise 生命周期"])).toBeGreaterThan(117);
    expect(labelColumnWidth([])).toBe(26);
  });

  it("renders the built-in markdown template", () => {
    const out = renderExport("md", record, question, tempDir());
    expect(out.filename).toBe("2026-11-14.1430.张三.md");
    expect(out.mime).toBe("text/markdown");
    expect(out.content).toContain("# 演示题 · 张三");
    expect(out.content).toContain("86 / 100");
    expect(out.content).toContain("| 动态渲染 | 86 | 100 |"); 
    expect(out.content).toContain("结构清晰");
    expect(out.content).toContain("[朱墨本](https://github.com/zhumoben/zhumoben)");
    expect(out.content).not.toContain("记录文件");
    expect(out.content).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC[+-]\d{2}:\d{2}/);
  });

  it("renders the built-in html template with the score", () => {
    const out = renderExport("html", record, question, tempDir());
    expect(out.filename).toBe("2026-11-14.1430.张三.html");
    expect(out.content).toContain("<!doctype html>");
    expect(out.content).toContain("86");
    expect(out.content).toContain("动态渲染");
    expect(out.content).toContain("朱墨本");
    expect(out.content).toContain('href="https://github.com/zhumoben/zhumoben"');
    expect(out.content).toContain('target="_blank"');
    expect(out.content).toContain('class="col-dim"');
    expect(out.content).toMatch(/width:min\(\d+px, 40%\)/);
    expect(out.content).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC[+-]\d{2}:\d{2}/);
  });

  it("renders notes as markdown in html and keeps raw markdown in md", () => {
    const withMarkdown: ScoreRecord = {
      ...record,
      scores: { render: { score: 86, note: "**一次 map**\n\n- 缺少缓存\n- 未处理卸载" } },
      notes: { pros: "**结构清晰**", cons: "- 缺少校验", questions: "`tsc` 跑过吗" },
    };

    const html = renderExport("html", withMarkdown, question, tempDir());
    expect(html.content).toContain("<strong>一次 map</strong>");
    expect(html.content).toContain("<li>缺少缓存</li>");
    expect(html.content).toContain("<strong>结构清晰</strong>");
    expect(html.content).toContain("<code>tsc</code>");

    const md = renderExport("md", withMarkdown, question, tempDir());
    expect(md.content).toContain("**一次 map**");
    expect(md.content).not.toContain("<strong>");
  });

  it("flattens multi-line notes into one markdown table cell", () => {
    const withLines: ScoreRecord = {
      ...record,
      scores: { render: { score: 86, note: "第一行\n第二行 | 带竖线\n- 列表项" } },
    };

    const md = renderExport("md", withLines, question, tempDir());
    expect(md.content).toContain("| 动态渲染 | 86 | 100 | 第一行 第二行 \\| 带竖线 列表项 |");
    expect(md.content).not.toContain("<br>");
  });

  it("lets a consumer override a template", () => {
    const cwd = tempDir();
    fs.mkdirSync(path.join(cwd, "templates"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, "templates", "scorecard.md.hbs"),
      "OVERRIDE {{total}}/{{max}} {{record.candidate}}",
      "utf8",
    );

    const out = renderExport("md", record, question, cwd);
    expect(out.content).toBe("OVERRIDE 86/100 张三");
  });

  it("honours a custom templates directory", () => {
    const cwd = tempDir();
    fs.mkdirSync(path.join(cwd, "my-templates"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, "my-templates", "scorecard.md.hbs"),
      "CUSTOM {{record.candidate}}",
      "utf8",
    );

    const out = renderExport("md", record, question, cwd, "my-templates");
    expect(out.content).toBe("CUSTOM 张三");
  });

  it("exports json with the computed total and band", () => {
    const out = renderExport("json", record, question, tempDir());
    const parsed = JSON.parse(out.content) as { total: number; max: number; band: string };
    expect(out.filename).toBe("2026-11-14.1430.张三.json");
    expect(parsed.total).toBe(86);
    expect(parsed.max).toBe(100);
    expect(parsed.band).toBe("Senior");
  });
});
