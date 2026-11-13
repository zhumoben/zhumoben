const KEYWORDS = new Set([
  "import", "export", "from", "default", "function", "return", "const", "let", "var",
  "interface", "type", "extends", "implements", "case", "switch", "break", "if", "else",
  "new", "as", "satisfies", "readonly", "void", "null", "undefined", "true", "false",
  "for", "of", "in", "throw", "try", "catch", "await", "async", "typeof", "keyof",
  "class", "this", "delete", "instanceof", "enum", "namespace", "declare", "abstract",
  "public", "private", "protected", "static", "get", "set", "yield",
]);

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(0x[\da-fA-F]+|\d+(?:\.\d+)?)\b|\b([A-Za-z_$][\w$]*)\b/g;

export function highlight(code: string): string {
  let out = "";
  let last = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, match.index));

    if (match[1]) {
      out += `<span class="tok-com">${escapeHtml(match[1])}</span>`;
    } else if (match[2]) {
      out += `<span class="tok-str">${escapeHtml(match[2])}</span>`;
    } else if (match[3]) {
      out += `<span class="tok-num">${escapeHtml(match[3])}</span>`;
    } else {
      const word = match[4];
      const before = code.charAt(match.index - 1);
      const before2 = code.charAt(match.index - 2);
      const before3 = code.charAt(match.index - 3);
      const lhs = before === "<" ? before2 : before3;
      const looksGeneric = /[\w$)\]]/.test(lhs);
      let className = "";

      if (KEYWORDS.has(word)) {
        className = "tok-kw";
      } else if (!looksGeneric && (before === "<" || (before === "/" && before2 === "<"))) {
        className = "tok-tag";
      } else if (/^[A-Z]/.test(word)) {
        className = "tok-typ";
      }

      out += className
        ? `<span class="${className}">${escapeHtml(word)}</span>`
        : escapeHtml(word);
    }

    last = TOKEN_RE.lastIndex;
  }

  return out + escapeHtml(code.slice(last));
}
