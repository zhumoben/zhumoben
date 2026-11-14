# 面试数据

这是 zhumoben 的私有数据仓库：题库和评分记录都在这里，跟着 git 走。

```
questions/
  <id>/
    question.mdx     # frontmatter + 正文
    scorecard.json   # 评分维度、分值与档位
records/
  <日期>.<时间>.<姓名>.json
```

## 常用命令

```bash
pnpm dev     # 本地开发，http://localhost:5901
pnpm build   # 产出 dist/
pnpm serve   # 托管 dist/，http://localhost:5900
```

## 新建题目

```bash
npx zhumoben new-question my-question
```

然后编辑 `questions/my-question/question.mdx` 和 `scorecard.json`。
评分维度的分值之和必须等于 `scorecard.json` 里的 `max`，`bands` 必须无缺口地覆盖 `0..max`。
