import { useMemo, useState } from "react";
import type { QuestionMeta, RecordSummary } from "../../../shared/types";
import { questionHref } from "../lib/router";

export function BankPage({
  questions,
  records,
  onNavigate,
}: {
  questions: QuestionMeta[];
  records: RecordSummary[];
  onNavigate: (hash: string) => void;
}) {
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState(false);

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of questions) {
      for (const item of question.tags) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [questions]);

  const countsByQuestion = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of records) {
      counts.set(record.questionId, (counts.get(record.questionId) ?? 0) + 1);
    }
    return counts;
  }, [records]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return questions.filter((question) => {
      if (tag && !question.tags.includes(tag)) return false;
      if (!needle) return true;
      return [question.title, question.subtitle, question.summary, question.stack, ...question.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [questions, tag, query]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">题库</h1>
          <p className="page__desc">
            {questions.length} 道题 · {tagCounts.length} 个标签
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setHint((value) => !value)}>
          + 新建题目
        </button>
      </div>

      {hint && (
        <div className="notice" style={{ background: "var(--accent-soft)", borderColor: "var(--accent-line)", color: "var(--accent-ink)" }}>
          <span>›</span>
          <span>
            在项目根目录运行 <code>npx zhumoben new-question &lt;id&gt;</code>，然后刷新页面。
            题目会出现在 <code>questions/&lt;id&gt;/</code>。
          </span>
        </div>
      )}

      <div className="toolbar">
        <label className="search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7.5" />
            <line x1="21" y1="21" x2="16.6" y2="16.6" />
          </svg>
          <input
            type="text"
            placeholder="搜索题目、标签、技术栈…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="chips">
          <button
            type="button"
            className={`chip${tag === null ? " is-on" : ""}`}
            onClick={() => setTag(null)}
          >
            全部 <span className="n">{questions.length}</span>
          </button>
          {tagCounts.map(([name, count]) => (
            <button
              key={name}
              type="button"
              className={`chip${tag === name ? " is-on" : ""}`}
              onClick={() => setTag(tag === name ? null : name)}
            >
              {name} <span className="n">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">没有匹配的题目。</p>
      ) : (
        <div className="qlist">
          {filtered.map((question) => {
            const count = countsByQuestion.get(question.id) ?? 0;
            return (
              <button
                key={question.id}
                type="button"
                className="qrow"
                onClick={() => onNavigate(questionHref(question.id))}
              >
                <div>
                  <div className="qrow__title">{question.title}</div>
                  {question.subtitle && <div className="qrow__sub">{question.subtitle}</div>}
                  {question.summary && <div className="qrow__desc">{question.summary}</div>}
                  <div className="qrow__tags">
                    {question.tags.map((item) => (
                      <span className="tag" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="qrow__stat">
                  <div className="qrow__line">
                    <b>{question.level ?? "—"}</b> · {question.levelLabel ?? ""}
                  </div>
                  <div className="qrow__line">
                    {question.duration ?? "—"} · {question.scorecard.max} 分 · {question.chapters.length} 章
                  </div>
                </div>
                <div className="qrow__act">
                  <span className="badge" data-tone={count > 0 ? "accent" : "gray"}>
                    {count > 0 ? `${count} 条评分` : "未评分"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p
        style={{
          marginTop: 14,
          font: "400 10.5px/1.6 var(--font-mono)",
          color: "var(--ink-3)",
        }}
      >
        questions/*/question.mdx · scorecard.json
      </p>
    </div>
  );
}
