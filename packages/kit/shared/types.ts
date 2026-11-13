/** Shared between the browser app and the node side. No runtime imports. */

export type Tone = "accent" | "amber" | "gray" | "red";

export interface ScoreItem {
  id: string;
  label: string;
  max: number;
  /** What a full score looks like. Rendered in the rubric table. */
  fullCredit?: string;
}

export interface ScoreGroup {
  id: string;
  title: string;
  items: ScoreItem[];
}

export interface Band {
  min: number;
  max: number;
  label: string;
  tone: Tone;
}

export interface Scorecard {
  version: 1;
  max: number;
  groups: ScoreGroup[];
  bands: Band[];
}

export interface QuestionFrontmatter {
  title: string;
  subtitle?: string;
  /** L1..L5 */
  level?: string;
  /** Senior / Mid / … */
  levelLabel?: string;
  duration?: string;
  stack?: string;
  format?: string;
  tags?: string[];
  summary?: string;
}

export interface Chapter {
  id: string;
  title: string;
}

export interface QuestionMeta extends QuestionFrontmatter {
  id: string;
  tags: string[];
  chapters: Chapter[];
  scorecard: Scorecard;
}

export interface ScoreNote {
  score: number | null;
  note?: string;
}

export interface RecordNotes {
  pros: string;
  cons: string;
  questions: string;
}

export interface ScoreRecord {
  schemaVersion: 1;
  questionId: string;
  questionTitle: string;
  candidate: string;
  interviewer: string;
  /** yyyy-mm-dd */
  date: string;
  /** HH:mm */
  time: string;
  scores: Record<string, ScoreNote>;
  notes: RecordNotes;
  createdAt: string;
  updatedAt: string;
}

export interface RecordSummary {
  id: string;
  questionId: string;
  questionTitle: string;
  candidate: string;
  interviewer: string;
  date: string;
  time: string;
  total: number;
  max: number;
  band: string;
  tone: Tone;
  updatedAt: string;
}

export type ExportFormat = "json" | "md" | "html";

export interface KitConfig {
  title?: string;
  description?: string;
  port?: number;
  open?: boolean;
  tags?: Record<string, { color?: string; label?: string }>;
  templatesDir?: string;
}
