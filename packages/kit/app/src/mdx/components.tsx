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
import { toBlob } from "html-to-image";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronRight,
  Copy,
  FileText,
  Image as ImageIcon,
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

function trimText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

function serializeChildren(node: Node): string {
  return Array.from(node.childNodes)
    .map((child) => serializeNode(child))
    .join("");
}

/** Turn the rendered question back into standard Markdown. */
function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (!(node instanceof HTMLElement)) return "";

  const tag = node.tagName.toLowerCase();
  if (node.classList.contains("code__bar")) return "";

  switch (tag) {
    case "p": {
      const content = trimText(serializeChildren(node));
      return content ? `${content}\n\n` : "";
    }
    case "br":
      return "\n";
    case "strong":
    case "b": {
      const content = trimText(serializeChildren(node));
      if (!content) return "";
      return `**${content}**`;
    }
    case "em":
    case "i": {
      const content = trimText(serializeChildren(node));
      if (!content) return "";
      return `*${content}*`;
    }
    case "del":
    case "s": {
      const content = trimText(serializeChildren(node));
      if (!content) return "";
      return `~~${content}~~`;
    }
    case "code": {
      if (node.parentElement?.tagName.toLowerCase() === "pre") return "";
      const text = node.textContent ?? "";
      return text ? `\`${text}\`` : "";
    }
    case "pre": {
      const code = node.querySelector("code");
      const language =
        node.closest(".code")?.querySelector(".lang")?.textContent?.trim() ?? "";
      const text = (code?.textContent ?? node.textContent ?? "").replace(/\n$/, "");
      if (!text) return "";
      const fence = "```";
      return `${fence}${language}\n${text}\n${fence}\n\n`;
    }
    case "ul":
    case "ol": {
      const items = Array.from(node.children).filter(
        (child) => child.tagName.toLowerCase() === "li",
      );
      const lines = items.map((item, index) => {
        const marker = tag === "ol" ? `${index + 1}. ` : "- ";
        const content = trimText(serializeChildren(item));
        const indented = content.replace(/\n/g, `\n${" ".repeat(marker.length)}`);
        return `${marker}${indented}\n`;
      });
      return `${lines.join("")}\n`;
    }
    case "blockquote": {
      const content = trimText(serializeChildren(node));
      if (!content) return "";
      return `${content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    }
    case "a": {
      const href = node.getAttribute("href") ?? "";
      const label = trimText(serializeChildren(node)) || href;
      if (!href) return label;
      return `[${label}](${href})`;
    }
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const content = trimText(serializeChildren(node));
      if (!content) return "";
      const level = Number(tag[1]);
      return `${"#".repeat(level)} ${content}\n\n`;
    }
    default:
      return serializeChildren(node);
  }
}

function plainText(node: HTMLElement): string {
  return trimText(
    Array.from(node.childNodes)
      .map((child) => serializeNode(child))
      .join(""),
  );
}

async function copyPlainText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to the selection-based fallback
    }
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  if (!copied) throw new Error("copy failed");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

type CopyAction = "rich" | "markdown" | "image";

function QuestionCard({ children }: { children?: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState<CopyAction | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageDownloaded, setImageDownloaded] = useState(false);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flash = (action: CopyAction) => {
    setCopied(action);
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCopied(null);
      setImageDownloaded(false);
    }, 1800);
  };

  const handleCopyRich = async () => {
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
      flash("rich");
    } catch {
      if (copySelection(body)) flash("rich");
    }
  };

  const handleCopyMarkdown = async () => {
    const body = bodyRef.current;
    if (!body) return;

    try {
      await copyPlainText(plainText(body));
      flash("markdown");
    } catch {
      // Leave the label unchanged when the clipboard is unavailable.
    }
  };

  const handleCopyImage = async () => {
    const body = bodyRef.current;
    if (!body || imageBusy) return;

    setImageBusy(true);
    body.classList.add("qcard__body--capture");

    try {
      // Give the layout a frame to widen the capture area and unclip code.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const blob = await toBlob(body, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        skipFonts: true,
      });
      if (!blob) return;

      try {
        if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
        } else {
          throw new Error("clipboard images unavailable");
        }
        setImageDownloaded(false);
      } catch {
        downloadBlob(blob, "question.png");
        setImageDownloaded(true);
      }
      flash("image");
    } catch (error) {
      console.error("failed to render the question image", error);
    } finally {
      body.classList.remove("qcard__body--capture");
      setImageBusy(false);
    }
  };

  return (
    <div className="qcard">
      <div className="qcard__bar">
        <span className="qcard__label">题目原文</span>
        <div className="qcard__actions">
          <button
            type="button"
            className="btn btn--sm"
            onClick={handleCopyRich}
            title="复制为富文本，适合 Notion、Word、飞书"
          >
            {copied === "rich" ? (
              <Check size={12} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Copy size={12} strokeWidth={1.8} aria-hidden="true" />
            )}
            {copied === "rich" ? "已复制" : "复制题目"}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={handleCopyMarkdown}
            title="复制为标准 Markdown"
          >
            {copied === "markdown" ? (
              <Check size={12} strokeWidth={2} aria-hidden="true" />
            ) : (
              <FileText size={12} strokeWidth={1.8} aria-hidden="true" />
            )}
            {copied === "markdown" ? "已复制" : "Markdown"}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            onClick={handleCopyImage}
            disabled={imageBusy}
            title="复制为图片，适合 Google Meet"
          >
            {copied === "image" ? (
              <Check size={12} strokeWidth={2} aria-hidden="true" />
            ) : (
              <ImageIcon size={12} strokeWidth={1.8} aria-hidden="true" />
            )}
            {imageBusy
              ? "生成中…"
              : copied === "image"
                ? imageDownloaded
                  ? "已下载"
                  : "已复制"
                : "图片"}
          </button>
        </div>
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
