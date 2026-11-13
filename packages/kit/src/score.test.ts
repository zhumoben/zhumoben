import { describe, expect, it } from "vitest";
import {
  bandOf,
  emptyScores,
  recordIdFor,
  safeName,
  summarize,
  totalOf,
} from "../shared/score.js";
import type { ScoreRecord, Scorecard } from "../shared/types.js";
import { parseScorecard } from "./schema.js";

const card: Scorecard = {
  version: 1,
  max: 100,
  groups: [
    {
      id: "core",
      title: "核心",
      items: [
        { id: "a", label: "A", max: 60 },
        { id: "b", label: "B", max: 40 },
      ],
    },
  ],
  bands: [
    { min: 90, max: 100, label: "Strong", tone: "accent" },
    { min: 80, max: 89, label: "Pass", tone: "accent" },
    { min: 50, max: 79, label: "Borderline", tone: "amber" },
    { min: 0, max: 49, label: "No Hire", tone: "red" },
  ],
};

function record(overrides: Partial<ScoreRecord> = {}): ScoreRecord {
  return {
    schemaVersion: 1,
    questionId: "demo",
    questionTitle: "Demo",
    candidate: "张三",
    interviewer: "李四",
    date: "2026-11-14",
    time: "14:30",
    scores: { a: { score: 50 }, b: { score: 30 } },
    notes: { pros: "", cons: "", questions: "" },
    createdAt: "2026-11-14T06:30:00.000Z",
    updatedAt: "2026-11-14T06:30:00.000Z",
    ...overrides,
  };
}

describe("recordIdFor", () => {
  it("derives the id from date, time and candidate", () => {
    expect(recordIdFor({ date: "2026-11-14", time: "14:30", candidate: "张三" })).toBe(
      "2026-11-14.1430.张三",
    );
  });

  it("never produces a colon in the filename", () => {
    const id = recordIdFor({ date: "2026-01-02", time: "09:05", candidate: "A" });
    expect(id).not.toContain(":");
    expect(id).toBe("2026-01-02.0905.A");
  });

  it("falls back to 未命名 when the candidate is empty", () => {
    expect(recordIdFor({ date: "2026-01-02", time: "09:05", candidate: "  " })).toBe(
      "2026-01-02.0905.未命名",
    );
  });

  it("strips characters that are illegal on Windows", () => {
    expect(safeName('a<b>c:d"e/f\\g|h?i*j')).toBe("abcdefghij");
  });

  it("avoids reserved device names", () => {
    expect(safeName("con")).toBe("con_");
  });
});

describe("scoring", () => {
  it("treats an empty score as unrated, not as zero", () => {
    const scores = emptyScores(card);
    const { total, filled, count, max } = totalOf(card, scores);
    expect(total).toBe(0);
    expect(filled).toBe(0);
    expect(count).toBe(2);
    expect(max).toBe(100);
  });

  it("sums only rated items", () => {
    const result = totalOf(card, { a: { score: 60 }, b: { score: null } });
    expect(result.total).toBe(60);
    expect(result.filled).toBe(1);
  });

  it("maps totals onto bands", () => {
    expect(bandOf(card, 95)?.label).toBe("Strong");
    expect(bandOf(card, 85)?.label).toBe("Pass");
    expect(bandOf(card, 60)?.label).toBe("Borderline");
    expect(bandOf(card, 10)?.label).toBe("No Hire");
  });

  it("does not publish a band while the record is incomplete", () => {
    const summary = summarize(card, record({ scores: { a: { score: 60 } } }));
    expect(summary.total).toBe(60);
    expect(summary.band).toBe("未完成");
    expect(summary.tone).toBe("amber");
  });

  it("publishes the band once every item is rated", () => {
    const summary = summarize(card, record());
    expect(summary.total).toBe(80);
    expect(summary.band).toBe("Pass");
  });
});

describe("scorecard validation", () => {
  it("accepts a consistent scorecard", () => {
    expect(() => parseScorecard(card)).not.toThrow();
  });

  it("rejects items that do not add up", () => {
    const broken = { ...card, max: 100, groups: [{ id: "g", title: "G", items: [{ id: "a", label: "A", max: 10 }] }] };
    expect(() => parseScorecard(broken)).toThrow(/add up/);
  });

  it("rejects bands with gaps", () => {
    const broken = {
      ...card,
      bands: [
        { min: 90, max: 100, label: "Strong", tone: "accent" },
        { min: 0, max: 49, label: "No Hire", tone: "red" },
      ],
    };
    expect(() => parseScorecard(broken)).toThrow(/cover/);
  });

  it("rejects duplicate item ids", () => {
    const broken = {
      ...card,
      groups: [
        { id: "g", title: "G", items: [{ id: "a", label: "A", max: 50 }, { id: "a", label: "A2", max: 50 }] },
      ],
    };
    expect(() => parseScorecard(broken)).toThrow(/duplicate/);
  });
});
