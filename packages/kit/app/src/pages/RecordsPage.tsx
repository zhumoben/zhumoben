import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, ExternalLink, Plus, Search, Trash2 } from "react-feather";
import type { QuestionMeta, RecordSummary } from "../../../shared/types";
import { api, download } from "../lib/api";
import { questionHref } from "../lib/router";

type Range = "all" | "month" | "30" | "90";

export function RecordsPage({
  questions,
  initialQuestion,
  onNavigate,
}: {
  questions: QuestionMeta[];
  initialQuestion?: string;
  onNavigate: (hash: string) => void;
}) {
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [questionId, setQuestionId] = useState(initialQuestion ?? "");
  const [range, setRange] = useState<Range>("all");
  const [descending, setDescending] = useState(true);

  const load = () => {
    api
      .records()
      .then((list) => {
        setRecords(list);
        setError(null);
      })
      .catch((cause) => setError((cause as Error).message));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const now = new Date();
    const from = new Date(now);
    if (range === "30") from.setDate(from.getDate() - 30);
    if (range === "90") from.setDate(from.getDate() - 90);

    return records
      .filter((record) => {
        if (questionId && record.questionId !== questionId) return false;
        if (needle) {
          const haystack = `${record.candidate} ${record.interviewer} ${record.questionTitle} ${record.id}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        if (range === "month") {
          const when = new Date(`${record.date}T${record.time || "00:00"}`);
          if (when.getFullYear() !== now.getFullYear() || when.getMonth() !== now.getMonth()) {
            return false;
          }
        } else if (range === "30" || range === "90") {
          const when = new Date(`${record.date}T${record.time || "00:00"}`);
          if (when < from) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const left = `${a.date} ${a.time}`;
        const right = `${b.date} ${b.time}`;
        return descending ? (left < right ? 1 : -1) : left < right ? -1 : 1;
      });
  }, [records, query, questionId, range, descending]);

  const seniorPlus = records.filter(
    (record) => record.tone === "green" || record.tone === "gold",
  ).length;
  const pending = records.filter((record) => record.band === "未完成" || record.band === "—").length;

  const remove = async (record: RecordSummary) => {
    if (!window.confirm(`删除 ${record.candidate || "未命名"} 的评分记录？\n会移动到 records/_trash/`)) {
      return;
    }
    try {
      await api.remove(record.id);
      setRecords((list) => list.filter((item) => item.id !== record.id));
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const exportMd = async (record: RecordSummary) => {
    try {
      const result = await api.exportRecord(record.id, "md");
      download(result.filename, result.content, result.mime);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">评分记录</h1>
          <p className="page__desc">
            {records.length} 条记录 · 文件位于 records/*.json
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => onNavigate("#/bank")}>
          <Plus size={13} strokeWidth={1.8} />
          新建评分
        </button>
      </div>

      <div className="records-summary">
        <div>
          <b>{records.length}</b>
          <span>Total</span>
        </div>
        <div>
          <b>{seniorPlus}</b>
          <span>Senior+</span>
        </div>
        <div>
          <b>{pending}</b>
          <span>未完成</span>
        </div>
        <div>
          <b>{filtered.length}</b>
          <span>Shown</span>
        </div>
      </div>

      {error && <div className="notice">{error}</div>}

      <div className="toolbar" style={{ marginBottom: 14 }}>
        <label className="search">
          <Search size={13} strokeWidth={1.8} aria-hidden="true" />
          <input
            type="text"
            placeholder="搜索候选人、面试官、文件名…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <select
          className="chip"
          value={questionId}
          onChange={(event) => setQuestionId(event.target.value)}
        >
          <option value="">全部题目</option>
          {questions.map((question) => (
            <option key={question.id} value={question.id}>
              {question.title}
            </option>
          ))}
        </select>

        <select
          className="chip"
          value={range}
          onChange={(event) => setRange(event.target.value as Range)}
        >
          <option value="all">全部时间</option>
          <option value="month">本月</option>
          <option value="30">近 30 天</option>
          <option value="90">近 90 天</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">没有匹配的记录。</p>
      ) : (
        <div className="rtable-wrap">
          <table className="rtable">
            <thead>
              <tr>
                <th style={{ width: "20%" }}>候选人</th>
                <th style={{ width: "24%" }}>题目</th>
                <th
                  style={{ width: "15%" }}
                  onClick={() => setDescending((value) => !value)}
                >
                  面试时间{" "}
                  <span className="sort">
                    {descending ? (
                      <ArrowDown size={11} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <ArrowUp size={11} strokeWidth={2} aria-hidden="true" />
                    )}
                  </span>
                </th>
                <th style={{ width: "9%" }}>总分</th>
                <th style={{ width: "11%" }}>档位</th>
                <th style={{ width: "21%" }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="rname">{record.candidate || "未命名"}</div>
                    <div className="rid">{record.id}</div>
                  </td>
                  <td className="rpaper">{record.questionTitle}</td>
                  <td className="rid">
                    {record.date.slice(5)} {record.time}
                  </td>
                  <td>
                    <span className="rscore">{record.total}</span>{" "}
                    <small>/ {record.max}</small>
                  </td>
                  <td>
                    <span className="badge" data-tone={record.tone}>
                      {record.band}
                    </span>
                  </td>
                  <td>
                    <div className="racts">
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => onNavigate(questionHref(record.questionId, record.id))}
                      >
                        <ExternalLink size={11} strokeWidth={1.8} aria-hidden="true" />
                        打开
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => void exportMd(record)}>
                        <Download size={11} strokeWidth={1.8} aria-hidden="true" />
                        导出
                      </button>
                      <button type="button" className="btn btn--sm" onClick={() => void remove(record)}>
                        <Trash2 size={11} strokeWidth={1.8} aria-hidden="true" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 12, font: "400 10.5px/1.6 var(--font-mono)", color: "var(--ink-3)" }}>
        records/*.json · 删除时移入 records/_trash/
      </p>
    </div>
  );
}
