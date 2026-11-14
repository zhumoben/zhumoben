import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "react-feather";
import type { QuestionMeta, RecordSummary } from "../../../shared/types";
import { api } from "../lib/api";
import { questionHref } from "../lib/router";

export function HomePage({
  questions,
  onNavigate,
}: {
  questions: QuestionMeta[];
  onNavigate: (hash: string) => void;
}) {
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .records()
      .then(setRecords)
      .catch((cause) => setError((cause as Error).message));
  }, []);

  const tags = useMemo(
    () => new Set(questions.flatMap((question) => question.tags)),
    [questions],
  );
  const lastWrite = records[0]?.updatedAt?.slice(0, 10) ?? "—";

  return (
    <>
      <section className="hero hero--home">
        <div className="hero__inner">
          <div className="home-eyebrow">Local-first interview scoring</div>
          <h1 className="home-title">
            把面试判断
            <br />
            沉淀成可复用的标准
          </h1>
          <p className="hero__lead">
            题库、评分维度和评分记录都保存在你自己的仓库里。打开一题，边聊边打分，记录自动落盘。
          </p>
          <div className="home-stats">
            <div>
              <b>{questions.length}</b>
              <span>Questions</span>
            </div>
            <div>
              <b>{records.length}</b>
              <span>Records</span>
            </div>
            <div>
              <b>{tags.size}</b>
              <span>Tags</span>
            </div>
            <div>
              <b>{lastWrite}</b>
              <span>Last write</span>
            </div>
          </div>
        </div>
      </section>

      <div className="home-body">
        <section>
          <div className="block__head">
            <h2 className="block__title">最近评分</h2>
            <button type="button" className="block__more" onClick={() => onNavigate("#/records")}>
              全部 {records.length} 条
              <ArrowRight size={12} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          {error && <div className="notice">{error}</div>}
          {!error && records.length === 0 && <p className="empty">还没有评分记录。</p>}

          {records.slice(0, 4).map((record) => (
            <button
              key={record.id}
              type="button"
              className="row-link"
              onClick={() => onNavigate(questionHref(record.questionId, record.id))}
            >
              <div className="row-link__main">
                <div className="row-link__title">
                  {record.candidate || "未命名"} · {record.questionTitle}
                </div>
                <div className="row-link__meta">
                  {record.date} {record.time} · {record.interviewer || "—"}
                </div>
              </div>
              <span className="badge" data-tone={record.tone}>
                {record.band}
              </span>
              <div className="row-link__score">
                {record.total}
                <small>/{record.max}</small>
              </div>
            </button>
          ))}
        </section>

        <section>
          <div className="block__head">
            <h2 className="block__title">题库</h2>
            <button type="button" className="block__more" onClick={() => onNavigate("#/bank")}>
              全部 {questions.length} 题
              <ArrowRight size={12} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          {questions.length === 0 && <p className="empty">题库还是空的。</p>}

          {questions.slice(0, 5).map((question) => (
            <button
              key={question.id}
              type="button"
              className="row-link"
              onClick={() => onNavigate(questionHref(question.id))}
            >
              <div className="row-link__main">
                <div className="row-link__title">{question.title}</div>
                <div className="row-link__meta">
                  {question.level ?? "—"} · {question.duration ?? "—"} · {question.scorecard.max} 分
                </div>
              </div>
              <span className="badge" data-tone="gray">
                {question.chapters.length} 章
              </span>
            </button>
          ))}
        </section>
      </div>
    </>
  );
}
