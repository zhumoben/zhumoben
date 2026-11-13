# zhumoben 朱墨本

A local-first interview question bank and scorecard. Your questions and score
records live in your own repository as plain files; `zhumoben` is only the
viewer and the scoring tool.

> 题库和评分记录都是你自己的私有数据（`questions/`、`records/`），
> 跟着 git 走；平台本身是一个 npm 包。

## Why

Interview material rots in three ways: it lives in someone's notes, the rubric
drifts between interviewers, and the scorecards end up in a spreadsheet nobody
revisits. zhumoben keeps all three in one place, as files you can review and
diff.

- **Question bank as files** — each question is an MDX file plus a
  `scorecard.json`; both are edited in your editor, reviewed in a PR.
- **Scoring during the interview** — a scorecard dock with a timer, per-item
  weights, per-item evidence, and Pro / Con / Question notes.
- **Records as JSON** — one file per interview, named after the date, the time
  and the candidate. Renaming a field renames the file.
- **Exports** — JSON, Markdown and a standalone HTML report, rendered from
  templates you can override.

## Requirements

- Node.js >= 20.19
- pnpm (or npm)

## Quick start

Create a private repository for your data (it can be empty):

```bash
mkdir my-interviews && cd my-interviews
pnpm init
pnpm add -D zhumoben
npx zhumoben init      # writes questions/, records/, kit.config.ts
npx zhumoben dev
```

`zhumoben dev` starts a local server at http://localhost:5173 and reads the
question bank from the current working directory. Nothing is uploaded.

## Data layout

```
my-interviews/
├─ kit.config.ts            # title, port, optional tag colours
├─ questions/
│  └─ dynamic-form/
│     ├─ question.mdx       # frontmatter + MDX body
│     └─ scorecard.json     # groups, items, weights, bands
└─ records/
   ├─ 2026-11-14.1430.张三.json
   └─ _trash/
```

### `question.mdx`

```mdx
---
title: 动态表单题
subtitle: Senior 级评分与追问手册
level: L4
levelLabel: Senior
duration: 30 min
stack: React 19 · TypeScript 5
format: 现场 / 共享编辑器
tags: [react, typescript, live-coding]
summary: 一道 30 分钟的 React + TypeScript live coding 题。
---

## 评定框架

正文用 Markdown；需要版式时用内置组件：

<Callout tone="info">
  **核心判据：**他是否把这道题当成一个会被别人修改的组件来设计。
</Callout>

<Duo>
  <Panel tone="good" title="绿旗">…</Panel>
  <Panel tone="good" title="红旗">…</Panel>
</Duo>

<Timeline>
  <Step time="00:00 – 04:00" title="澄清与建模">…</Step>
</Timeline>
```

### `scorecard.json`

```json
{
  "version": 1,
  "max": 100,
  "groups": [
    {
      "id": "core",
      "title": "核心实现",
      "items": [
        { "id": "render", "label": "动态渲染与受控", "max": 20, "fullCredit": "…" }
      ]
    }
  ],
  "bands": [
    { "min": 90, "max": 100, "label": "Strong Senior", "tone": "accent" },
    { "min": 0, "max": 49, "label": "No Hire", "tone": "red" }
  ]
}
```

`bands` must cover `0..max` without gaps. `zhumoben dev` refuses to start when
the scorecard is inconsistent, and prints the reason.

## Records

A record is identified by its file name without the extension:

```
records/2026-11-14.1430.张三.json   →   2026-11-14.1430.张三
```

Changing the date, the time or the candidate renames the file automatically.
Deleting a record moves it to `records/_trash/`.

## Built-in MDX components

| Component | Purpose |
|---|---|
| `<Callout tone="info\|warn\|bad\|good">` | Tinted note block |
| `<Duo>` + `<Panel tone title>` | Two-column comparison |
| `<Timeline>` + `<Step time title>` | Chronological observation notes |
| `<Checklist>` | Unchecked verification list |
| `<Q label="Q4" question="…">` | Collapsible follow-up question |
| `<Rubric />` | Renders the scorecard weights as a table |

### A CJK emphasis gotcha

Markdown's emphasis rules are unfriendly to Chinese. A closing `**` that sits
between a punctuation mark and a CJK character is not recognised:

```md
<!-- renders the asterisks literally -->
**核心判据：**他是否…
```

Move the punctuation outside the emphasis instead:

```md
**核心判据**：他是否…
```

## CLI

| Command | What it does |
|---|---|
| `zhumoben init` | Scaffold `questions/`, `records/` and `kit.config.ts` |
| `zhumoben dev` | Start the local server (`--port`, `--open`) |
| `zhumoben new-question <id>` | Create a question folder from the template |

A static `zhumoben build` is on the roadmap; the records API needs a Node
process, so the first version is deliberately dev-server only.

## Development

```bash
pnpm install
pnpm dev            # runs examples/demo against the workspace package
pnpm typecheck
pnpm test
```

The demo under `examples/demo` is a consumer project: it depends on
`zhumoben` through the workspace protocol, exactly as a real user would.

## Status

Early. The schema is stable enough to use, but expect changes before `1.0`.

## License

MIT. The Inkstone-inspired palette and typographic rules are adapted from the
author's own theme system; see `NOTICE.md`.
