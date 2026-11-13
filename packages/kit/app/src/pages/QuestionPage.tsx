import { useEffect, useState, type ComponentType } from "react";
import type { QuestionMeta } from "../../../shared/types";
import { api } from "../lib/api";
import { QuestionHero } from "../components/Hero";
import { Toc } from "../components/Toc";
import { QuestionContext } from "../mdx/components";

export interface QuestionEntry {
  meta: QuestionMeta;
  load: () => Promise<{
    default: ComponentType;
    frontmatter: Record<string, unknown>;
  }>;
}

export function QuestionPage({
  entry,
  onNavigate,
}: {
  entry: QuestionEntry;
  onNavigate: (hash: string) => void;
}) {
  const [Content, setContent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    let alive = true;
    setContent(null);
    setError(null);

    entry
      .load()
      .then((mod) => {
        if (alive) setContent(() => mod.default);
      })
      .catch((cause) => {
        if (alive) setError((cause as Error).message);
      });

    return () => {
      alive = false;
    };
  }, [entry]);

  useEffect(() => {
    api
      .records()
      .then((list) => setRecordCount(list.filter((item) => item.questionId === entry.meta.id).length))
      .catch(() => setRecordCount(0));
  }, [entry.meta.id]);

  return (
    <>
      <QuestionHero question={entry.meta} recordCount={recordCount} onNavigate={onNavigate} />

      <div className="wrap">
        <div className="layout">
          <Toc chapters={entry.meta.chapters} />

          <article className="article">
            {error && <div className="notice">题目加载失败：{error}</div>}
            {!error && !Content && <p className="empty">载入中…</p>}
            {Content && (
              <QuestionContext.Provider value={{ meta: entry.meta }}>
                <Content />
              </QuestionContext.Provider>
            )}
          </article>
        </div>
      </div>
    </>
  );
}
