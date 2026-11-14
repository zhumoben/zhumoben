# zhumoben

Local-first interview question bank and scorecard. Questions and score records
are files in your own repository; `zhumoben` is the viewer and the scoring tool.

```bash
npm create zhumoben@latest my-interviews
cd my-interviews
pnpm install
pnpm dev        # http://localhost:5901
```

Or add it to an existing data project:

```bash
pnpm add -D zhumoben
npx zhumoben init
npx zhumoben dev
```

## Commands

| Command | What it does |
|---|---|
| `zhumoben dev` | Local server on 5901, reads `questions/` from the cwd |
| `zhumoben build` | Static build into `dist/` |
| `zhumoben serve` | Serve `dist/` with the records API on 5900 |
| `zhumoben init` | Scaffold `questions/`, `records/`, `kit.config.ts` |
| `zhumoben new-question <id>` | Create a question folder from the template |

## Data layout

```
questions/<id>/question.mdx     frontmatter + MDX body
questions/<id>/scorecard.json   groups, items, weights, bands
records/<date>.<time>.<name>.json
```

The record id is the file name without `.json`. Changing the date, the time or
the candidate renames the file. Deleting moves it to `records/_trash/`.

Full documentation: https://github.com/zhumoben/zhumoben
