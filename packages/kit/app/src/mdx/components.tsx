import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from "react";
import type { QuestionMeta, Scorecard } from "../../../shared/types";
import { highlight } from "./highlight";

export const QuestionContext = createContext<{ meta?: QuestionMeta }>({});

const CALLOUT_ICON: Record<string, string> = {
  info: "◆",
  good: "✓",
  warn: "▲",
  bad: "✕",
};

function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "good" | "warn" | "bad";
  children?: ReactNode;
}) {
  return (
    <div className="callout" data-tone={tone}>
      <span className="callout__icon">{CALLOUT_ICON[tone]}</span>
      <div>{children}</div>
    </div>
  );
}

function Duo({ children }: { children?: ReactNode }) {
  return <div className="duo">{children}</div>;
}

function Panel({
  tone,
  title,
  children,
}: {
  tone?: "good" | "bad";
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="panel" data-tone={tone}>
      {title && <div className="panel__t">{title}</div>}
      {children}
    </div>
  );
}

function Timeline({ children }: { children?: ReactNode }) {
  return <div className="tl">{children}</div>;
}

function Step({
  time,
  title,
  children,
}: {
  time?: string;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="tl__item">
      {time && <div className="tl__t">{time}</div>}
      {title && <div className="tl__h">{title}</div>}
      <div className="tl__b">{children}</div>
    </div>
  );
}

function Checklist({ children }: { children?: ReactNode }) {
  return <ul className="check">{children}</ul>;
}

function Q({
  label,
  question,
  open,
  children,
}: {
  label?: string;
  question?: string;
  open?: boolean;
  children?: ReactNode;
}) {
  return (
    <details className="qa" open={open}>
      <summary>
        {label && <span className="qidx">{label}</span>}
        <span>{question}</span>
        <span className="chev">▶</span>
      </summary>
      <div className="qa__body">{children}</div>
    </details>
  );
}

function RubricTable({ card }: { card: Scorecard }) {
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: "26%" }}>维度</th>
            <th style={{ width: "10%" }}>分值</th>
            <th>拿满分的要求</th>
          </tr>
        </thead>
        <tbody>
          {card.groups.flatMap((group) =>
            group.items.map((item) => (
              <tr key={item.id}>
                <td>{item.label}</td>
                <td>
                  <span className="num">{item.max}</span>
                </td>
                <td>{item.fullCredit ?? "—"}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function Rubric() {
  const { meta } = useContext(QuestionContext);
  if (!meta) return null;
  return <RubricTable card={meta.scorecard} />;
}

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return collectText(props.children);
  }
  return "";
}

function Pre({ children }: { children?: ReactNode }) {
  const child = Children.toArray(children)[0];
  const props = isValidElement(child)
    ? (child.props as { className?: string; children?: ReactNode })
    : ({} as { className?: string; children?: ReactNode });

  const language = (props.className ?? "").replace("language-", "") || "text";
  const raw = collectText(props.children).replace(/\n$/, "");
  const name = `snippet.${language === "text" ? "txt" : language}`;

  return (
    <div className="code">
      <div className="code__bar">
        <span className="dot" />
        <span>{name}</span>
        <span className="lang">{language}</span>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: highlight(raw) }} />
      </pre>
    </div>
  );
}

function H2({ id, children }: { id?: string; children?: ReactNode }) {
  const { meta } = useContext(QuestionContext);
  const index = id ? (meta?.chapters.findIndex((chapter) => chapter.id === id) ?? -1) : -1;

  return (
    <h2 id={id}>
      {index >= 0 && <span className="sec__num">{String(index + 1).padStart(2, "0")}</span>}
      {children}
    </h2>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mdxComponents: Record<string, any> = {
  h2: H2,
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {children}
    </a>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="table-wrap">
      <table className="tbl">{children}</table>
    </div>
  ),
  pre: Pre,
  code: ({ children }: { children?: ReactNode }) => <code className="inline">{children}</code>,
  Callout,
  Duo,
  Panel,
  Timeline,
  Step,
  Checklist,
  Q,
  Rubric,
};
