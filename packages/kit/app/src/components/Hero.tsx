import { FileText, List } from "react-feather";
import type { Band, QuestionMeta } from "../../../shared/types";
import { questionHref } from "../lib/router";
import { useScoreMark } from "../lib/score-mark";
import { Tag } from "./Tag";

const TONE_BG: Record<Band["tone"], string> = {
  gold: "linear-gradient(90deg, var(--band-strong), var(--band-strong-2))",
  green: "var(--band-senior)",
  purple: "var(--band-doubt)",
  blue: "var(--band-mid)",
  gray: "var(--band-junior)",
  red: "var(--band-nohire)",
  amber: "var(--color-tone-amber-line)",
  accent: "var(--accent)",
};

export function Scale({ bands, max }: { bands: Band[]; max: number }) {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  const mark = useScoreMark();
  const pct = mark ? Math.min(100, Math.round((mark.total / (mark.max || 1)) * 100)) : 0;

  return (
    <div className="scale">
      <div className="scale__head">
        <span>评分档位</span>
        <span className={`now${mark ? " is-live" : ""}`}>
          {mark ? `当前 ${mark.total} / ${mark.max}` : `0 — ${max}`}
        </span>
      </div>
      <div className="scale__bar">
        {sorted.map((band) => (
          <i
            key={band.label}
            style={{
              flex: band.max - band.min + 1,
              background: TONE_BG[band.tone],
              boxShadow:
                band.tone === "gold" ? "0 0 12px rgb(220 192 106 / .42)" : undefined,
            }}
          />
        ))}
        {mark && <span className="scale__needle" style={{ left: `${pct}%` }} />}
      </div>
      <div className="scale__labels">
        {sorted.map((band) => (
          <span key={band.label} style={{ flex: band.max - band.min + 1 }}>
            <b>
              {band.min}–{band.max}
            </b>
            {band.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function QuestionHero({
  question,
  recordCount,
  onNavigate,
}: {
  question: QuestionMeta;
  recordCount: number;
  onNavigate: (hash: string) => void;
}) {
  const levelValue = Number((question.level ?? "").replace(/[^\d]/g, "")) || 0;

  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__top">
          <div className="crumb">
            <a
              href="#/bank"
              onClick={(event) => {
                event.preventDefault();
                onNavigate("#/bank");
              }}
            >
              题库
            </a>
            <span className="sep">/</span>
            <span>{question.title}</span>
          </div>
          <div className="spacer" />
          <button type="button" className="ghost-btn" onClick={() => onNavigate("#/bank")}>
            <List size={13} strokeWidth={1.8} aria-hidden="true" />
            切换题目
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onNavigate(`#/records?question=${encodeURIComponent(question.id)}`)}
          >
            <FileText size={13} strokeWidth={1.8} aria-hidden="true" />
            本题 {recordCount} 条评分
          </button>
        </div>

        <div className="hero__head">
          <div>
            <h1>{question.title}</h1>
            {question.subtitle && <p className="hero__sub">{question.subtitle}</p>}
            {question.summary && <p className="hero__lead">{question.summary}</p>}
          </div>
          <div className="level">
            <span className="level__tag">{question.level ?? "—"}</span>
            <div className="level__meta">
              <span className="level__name">{question.levelLabel ?? "—"}</span>
              <span className="level__bars">
                {[1, 2, 3, 4, 5].map((step) => (
                  <i key={step} className={step <= levelValue ? "on" : undefined} />
                ))}
              </span>
            </div>
          </div>
        </div>

        <div className="hero__meta">
          {question.duration && (
            <span>
              <b>{question.duration}</b>
            </span>
          )}
          <span className="dot" />
          <span>
            <b>{question.scorecard.max}</b> 分
          </span>
          {question.stack && (
            <>
              <span className="dot" />
              <span>{question.stack}</span>
            </>
          )}
          {question.format && (
            <>
              <span className="dot" />
              <span>{question.format}</span>
            </>
          )}
          <span className="dot" />
          <span>
            <b>{question.chapters.length}</b> 个章节
          </span>
        </div>

        {question.tags.length > 0 && (
          <div className="hero__tags">
            {question.tags.map((tag) => (
              <Tag key={tag} name={tag} />
            ))}
          </div>
        )}

        <Scale bands={question.scorecard.bands} max={question.scorecard.max} />
      </div>
    </section>
  );
}

export function questionLink(id: string): string {
  return questionHref(id);
}
