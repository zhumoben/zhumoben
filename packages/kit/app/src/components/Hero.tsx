import type { Band, QuestionMeta } from "../../../shared/types";
import { questionHref } from "../lib/router";

const TONE_BG: Record<Band["tone"], string> = {
  red: "#8d4a44",
  gray: "#5a6672",
  amber: "#a8813f",
  accent: "#5d8aa6",
};

export function Scale({ bands, max }: { bands: Band[]; max: number }) {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  return (
    <div className="scale">
      <div className="scale__head">
        <span>评分档位</span>
        <span>0 — {max}</span>
      </div>
      <div className="scale__bar">
        {sorted.map((band, index) => (
          <i
            key={band.label}
            style={{
              flex: band.max - band.min + 1,
              background:
                index === sorted.length - 1 && band.tone === "accent"
                  ? "#86b3cc"
                  : TONE_BG[band.tone],
            }}
          />
        ))}
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            切换题目
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => onNavigate(`#/records?question=${encodeURIComponent(question.id)}`)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="13" y2="17" />
            </svg>
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

        <Scale bands={question.scorecard.bands} max={question.scorecard.max} />
      </div>
    </section>
  );
}

export function questionLink(id: string): string {
  return questionHref(id);
}
