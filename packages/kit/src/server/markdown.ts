import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeStringify);

/**
 * Render a notes field as HTML for the exported scorecard.
 * Raw HTML in the Markdown source is dropped (remark-rehype default), so notes
 * cannot inject markup into the standalone report.
 */
export function renderNoteMarkdown(source: string): string {
  if (!source.trim()) return "";
  return String(processor.processSync(source)).trim();
}
