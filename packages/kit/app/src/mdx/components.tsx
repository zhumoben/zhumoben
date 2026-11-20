import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronRight,
  Copy,
  Info,
  XCircle,
} from "react-feather";
import type { QuestionMeta, Scorecard } from "../../../shared/types";
import { highlight } from "./highlight";

export const QuestionContext = createContext<{ meta?: QuestionMeta }>({});

const CALLOUT_ICON = {
  info: Info,
  good: CheckCircle,
  warn: AlertTriangle,
  bad: XCircle,
};

function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "good" | "warn" | "bad";
  children?: ReactNode;
}) {
  const Icon = CALLOUT_ICON[tone];
  return (
    <div className="callout" data-tone={tone}>
      <span className="callout__icon">
        <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
      </span>
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
        <span className="chev">
          <ChevronRight size={13} strokeWidth={2} aria-hidden="true" />
        </span>
      </summary>
      <div className="qa__body">{children}</div>
    </details>
  );
}

/** 把渲染后的题目节点转成带内联样式的 HTML，粘贴到文档工具时保留格式。 */
function clipboardHtml(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("code").forEach((element) => {
    const code = element as HTMLElement;
    code.style.fontFamily =
      "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
    code.style.fontSize = "12.5px";
    code.style.background = "#f2f3f5";
    code.style.color = "#3b4a5a";
    code.style.padding = "1px 4px";
    code.style.borderRadius = "4px";
  });

  clone.querySelectorAll("a").forEach((element) => {
    (element as HTMLElement).style.color = "#45657a";
  });

  const wrapper =
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto," +
    "'PingFang SC','Microsoft YaHei',sans-serif;font-size:14px;line-height:1.75;color:#2b323a";

  return `<div style="${wrapper}">${clone.innerHTML}</div>`;
}

/** 不支持 Clipboard API 时的兜底：选中节点后走 execCommand。 */
function copySelection(node: HTMLElement): boolean {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  if (!selection) return false;

  selection.removeAllRanges();
  selection.addRange(range);
  const copied = document.execCommand("copy");
  selection.removeAllRanges();
  return copied;
}

function QuestionCard({ children }: { children?: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flash = () => {
    setCopied(true);
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const handleCopy = async () => {
    const body = bodyRef.current;
    if (!body) return;

    const text = body.innerText.trim();

    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([clipboardHtml(body)], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copySelection(body)) {
        return;
      }
      flash();
    } catch {
      if (copySelection(body)) flash();
    }
  };

  return (
    <div className="qcard">
      <div className="qcard__bar">
        <span className="qcard__label">题目原文</span>
        <button type="button" className="btn btn--sm qcard__copy" onClick={handleCopy}>
          {copied ? (
            <Check size={12} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Copy size={12} strokeWidth={1.8} aria-hidden="true" />
          )}
          {copied ? "已复制" : "复制题目"}
        </button>
      </div>
      <div className="qcard__body" ref={bodyRef}>
        {children}
      </div>
    </div>
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
  QuestionCard,
  Rubric,
};
