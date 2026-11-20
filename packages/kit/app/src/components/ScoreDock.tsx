import { useEffect, useRef, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { format, isValid, parse } from "date-fns";
import { zhCN } from "date-fns/locale";
import { ChevronDown, Copy, Download, Plus, Save, X } from "react-feather";
import type { ExportFormat, QuestionMeta, ScoreRecord } from "../../../shared/types";
import { bandOf, clamp, emptyScores, recordIdFor, totalOf } from "../../../shared/score";
import { api, copyText, download } from "../lib/api";
import { currentTime, percent, today } from "../lib/format";
import { setScoreMark } from "../lib/score-mark";
import { MarkdownField } from "./MarkdownField";
import { Timer } from "./Timer";

registerLocale("zh-CN", zhCN);

const DATE_FORMAT = "yyyy-MM-dd HH:mm";

function toDate(date: string, time: string): Date {
  const parsed = parse(`${date} ${time || "00:00"}`, DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : new Date();
}

type Status = "loading" | "idle" | "saving" | "saved" | "error";

const STATUS_TEXT: Record<Status, string> = {
  loading: "载入中…",
  idle: "未保存",
  saving: "保存中…",
  saved: "已保存",
  error: "保存失败",
};

function draft(question: QuestionMeta): ScoreRecord {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    questionId: question.id,
    questionTitle: question.title,
    candidate: "",
    interviewer: "",
    date: today(),
    time: currentTime(),
    scores: emptyScores(question.scorecard),
    notes: { pros: "", cons: "", questions: "" },
    createdAt: now,
    updatedAt: now,
  };
}

function hasContent(record: ScoreRecord): boolean {
  if (record.candidate.trim() || record.interviewer.trim()) return true;
  const notes = record.notes;
  if (notes.pros.trim() || notes.cons.trim() || notes.questions.trim()) return true;
  return Object.values(record.scores).some(
    (entry) => typeof entry?.score === "number" || Boolean(entry?.note?.trim()),
  );
}

export function ScoreDock({
  question,
  recordId,
  onClose,
}: {
  question: QuestionMeta;
  recordId?: string;
  onClose: () => void;
}) {
  const [record, setRecord] = useState<ScoreRecord | null>(null);
  const [savedId, setSavedId] = useState<string | null>(recordId ?? null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dirtyToken, setDirtyToken] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const savedIdRef = useRef<string | null>(recordId ?? null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        if (recordId) {
          const loaded = await api.record(recordId);
          if (!alive) return;
          savedIdRef.current = recordId;
          setSavedId(recordId);
          setRecord(loaded);
          setStatus("saved");
          return;
        }

        const list = await api.records();
        const latest = list
          .filter((item) => item.questionId === question.id)
          .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];

        if (latest) {
          const loaded = await api.record(latest.id);
          if (!alive) return;
          savedIdRef.current = latest.id;
          setSavedId(latest.id);
          setRecord(loaded);
          setStatus("saved");
          return;
        }

        if (!alive) return;
        savedIdRef.current = null;
        setSavedId(null);
        setRecord(draft(question));
        setStatus("idle");
      } catch (cause) {
        if (!alive) return;
        setError((cause as Error).message);
        setStatus("error");
        setRecord(draft(question));
      }
    })();

    return () => {
      alive = false;
    };
  }, [question.id, recordId]);

  async function save(next: ScoreRecord): Promise<void> {
    if (!hasContent(next)) {
      setStatus("idle");
      return;
    }
    setStatus("saving");
    try {
      const result = await api.save(savedIdRef.current, next);
      savedIdRef.current = result.id;
      setSavedId(result.id);
      setStatus("saved");
      setError(null);
    } catch (cause) {
      setStatus("error");
      setError((cause as Error).message);
    }
  }

  useEffect(() => {
    if (dirtyToken === 0 || !record) return;
    const handle = window.setTimeout(() => void save(record), 700);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyToken]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (record) void save(record);
        return;
      }
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const live = record ? totalOf(question.scorecard, record.scores) : null;

  useEffect(() => {
    setScoreMark(
      live && live.filled > 0 ? { total: live.total, max: live.max } : null,
    );
  }, [live?.total, live?.max, live?.filled]);

  useEffect(() => () => setScoreMark(null), []);

  if (!record) {
    return (
      <aside className="dock" aria-label="评分表">
        <div className="dock__head">
          <div>
            <p className="dock__eyebrow">Scorecard</p>
            <h2 className="dock__title">评分表</h2>
          </div>
          <button type="button" className="dock__close" aria-label="收起" onClick={onClose}>
            <X size={14} strokeWidth={1.8} />
          </button>
        </div>
        <div className="dock__body">
          <p className="empty">载入中…</p>
        </div>
      </aside>
    );
  }

  const patch = (changes: Partial<ScoreRecord>) => {
    setRecord((prev) => (prev ? { ...prev, ...changes } : prev));
    setDirtyToken((token) => token + 1);
  };

  const setScore = (itemId: string, raw: string, max: number) => {
    const score = raw === "" ? null : clamp(Number(raw), 0, max);
    patch({
      scores: {
        ...record.scores,
        [itemId]: { ...(record.scores[itemId] ?? { note: "" }), score },
      },
    });
  };

  const setNote = (itemId: string, note: string) => {
    patch({
      scores: {
        ...record.scores,
        [itemId]: { score: record.scores[itemId]?.score ?? null, note },
      },
    });
  };

  const setNotes = (key: keyof ScoreRecord["notes"], value: string) => {
    patch({ notes: { ...record.notes, [key]: value } });
  };

  const { total, filled, count, max } = totalOf(question.scorecard, record.scores);
  const band = filled === count ? bandOf(question.scorecard, total) : undefined;
  const liveBand = filled > 0 ? bandOf(question.scorecard, total) : undefined;
  const provisional = filled > 0 && filled < count;
  const id = savedId ?? recordIdFor(record);

  const doExport = async (format: ExportFormat) => {
    setMenuOpen(false);
    try {
      const result = await api.exportRecord(id, format);
      download(result.filename, result.content, result.mime);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const copyAs = async (format: ExportFormat) => {
    setMenuOpen(false);
    try {
      const result = await api.exportRecord(id, format);
      await copyText(result.content);
      setStatus("saved");
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  return (
    <aside className="dock" aria-label="评分表">
      <div className="dock__head">
        <div>
          <p className="dock__eyebrow">Scorecard</p>
          <h2 className="dock__title">评分表</h2>
          <div className="dock__id">{id}</div>
        </div>
        <button type="button" className="dock__close" aria-label="收起" onClick={onClose}>
          ✕
        </button>
      </div>

      <Timer />

      <div className="dock__body">
        {error && (
          <div className="notice">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        <div className="dock__meta">
          <label className="field">
            <span className="field__label">候选人</span>
            <input
              value={record.candidate}
              placeholder="姓名"
              onChange={(event) => patch({ candidate: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">面试官</span>
            <input
              value={record.interviewer}
              placeholder="你的名字"
              onChange={(event) => patch({ interviewer: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="field__label">日期 / 时间</span>
            <DatePicker
              selected={toDate(record.date, record.time)}
              onChange={(next: Date | null) => {
                if (!next || !isValid(next)) return;
                patch({
                  date: format(next, "yyyy-MM-dd"),
                  time: format(next, "HH:mm"),
                });
              }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={5}
              timeCaption="时间"
              dateFormat={DATE_FORMAT}
              locale="zh-CN"
              showPopperArrow={false}
              popperPlacement="bottom-end"
              popperClassName="zb-datepicker-popper"
              calendarClassName="zb-datepicker"
              className="date-input"
            />
          </label>
        </div>

        {question.scorecard.groups.map((group) => {
          const groupTotal = group.items.reduce((sum, item) => {
            const value = record.scores[item.id]?.score;
            return sum + (typeof value === "number" ? value : 0);
          }, 0);
          const groupMax = group.items.reduce((sum, item) => sum + item.max, 0);

          return (
            <div className="group" key={group.id}>
              <div className="group__head">
                <span>{group.title}</span>
                <b>
                  {groupTotal} / {groupMax}
                </b>
              </div>
              {group.items.map((item) => {
                const entry = record.scores[item.id];
                const filledItem = typeof entry?.score === "number";
                return (
                  <div className={`item${filledItem ? " is-filled" : ""}`} key={item.id}>
                    <div className="item__row">
                      <span className="item__label">{item.label}</span>
                      <input
                        className="item__score"
                        type="number"
                        min={0}
                        max={item.max}
                        placeholder="—"
                        value={typeof entry?.score === "number" ? String(entry.score) : ""}
                        onChange={(event) => setScore(item.id, event.target.value, item.max)}
                      />
                      <span className="item__max">/ {item.max}</span>
                    </div>
                    <MarkdownField
                      variant="note"
                      ariaLabel={`评分理由：${item.label}`}
                      placeholder="理由 / 证据（可选）"
                      value={entry?.note ?? ""}
                      onChange={(note) => setNote(item.id, note)}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="notes">
          <div className="notes__head">
            面试笔记 <span>不计分 · 随导出</span>
          </div>
          <div className="note-box note-box--pro">
            <span className="note-box__label">
              <i>PRO</i>做得好 / 加分点
            </span>
            <MarkdownField
              variant="notes"
              ariaLabel="Pro 做得好 / 加分点"
              placeholder="判别联合建模、状态合并正确…"
              value={record.notes.pros}
              onChange={(value) => setNotes("pros", value)}
            />
          </div>
          <div className="note-box note-box--con">
            <span className="note-box__label">
              <i>CON</i>问题 / 扣分依据
            </span>
            <MarkdownField
              variant="notes"
              ariaLabel="Con 问题 / 扣分依据"
              placeholder="value 绑错、key 用 index…"
              value={record.notes.cons}
              onChange={(value) => setNotes("cons", value)}
            />
          </div>
          <div className="note-box note-box--q">
            <span className="note-box__label">
              <i>Q</i>待追问 / 存疑
            </span>
            <MarkdownField
              variant="notes"
              ariaLabel="Q 待追问 / 存疑"
              placeholder="跑过 tsc 吗？fields 变化怎么处理？"
              value={record.notes.questions}
              onChange={(value) => setNotes("questions", value)}
            />
          </div>
        </div>
      </div>

      <div className="dock__foot">
        <div className="sum">
          <span className="sum__k">
            总分 · 已评 {filled}/{count}
          </span>
          <span className="sum__v">
            {total}
            <small>/ {max}</small>
          </span>
        </div>
        <div className="bar">
          <i
            data-band={(band ?? liveBand)?.tone ?? "none"}
            data-provisional={provisional ? "true" : undefined}
            style={{ width: `${percent(total, max)}%` }}
          />
        </div>
        <div className="dock__level">
          <span className="badge" data-tone={band?.tone ?? "amber"}>
            {band?.label ?? "未完成"}
          </span>
          <span>{STATUS_TEXT[status]}</span>
        </div>

        <div className="dock__actions">
          <button type="button" className="btn btn--primary" onClick={() => void save(record)}>
            <Save size={13} strokeWidth={1.8} />
            保存
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              savedIdRef.current = null;
              setSavedId(null);
              setRecord(draft(question));
              setStatus("idle");
              setError(null);
              setDirtyToken(0);
            }}
          >
            <Plus size={13} strokeWidth={1.8} />
            新建
          </button>
        </div>

        <div className="dock__actions dock__actions--3">
          <div className="menu" ref={menuRef}>
            <button
              type="button"
              className="btn"
              style={{ width: "100%" }}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <Download size={13} strokeWidth={1.8} />
              导出 <ChevronDown size={12} strokeWidth={1.8} />
            </button>
            {menuOpen && (
              <div className="menu__list">
                <button type="button" className="menu__item" onClick={() => void doExport("json")}>
                  JSON
                </button>
                <button type="button" className="menu__item" onClick={() => void doExport("md")}>
                  Markdown
                </button>
                <button type="button" className="menu__item" onClick={() => void doExport("html")}>
                  HTML
                </button>
              </div>
            )}
          </div>
          <button type="button" className="btn" onClick={() => void copyAs("md")}>
            <Copy size={12} strokeWidth={1.8} />
            复制 MD
          </button>
          <button type="button" className="btn" onClick={() => void copyAs("json")}>
            <Copy size={12} strokeWidth={1.8} />
            复制 JSON
          </button>
        </div>
      </div>
    </aside>
  );
}
