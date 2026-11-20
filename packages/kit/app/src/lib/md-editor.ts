import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting } from "@codemirror/language";
import { Tag, styleTags, tagHighlighter, tags as t } from "@lezer/highlight";

/*
 * Markdown highlighting for the small fields of the scorecard (an item's note, the Pro / Con / Q boxes). It is the
 * same idea as the editor in asrun: the text stays editable, the marks are only colored, so `**bold**` reads as bold
 * while it is typed. The colors live in `styles.css` under `.md-field`; this file only maps syntax tags to classes.
 */

// A list bullet or number, kept apart from the other marks so that it can get its own color.
const listMark = Tag.define(t.processingInstruction);

const highlighter = tagHighlighter([
  { tag: t.heading, class: "md-tok-heading" },
  { tag: t.strong, class: "md-tok-strong" },
  { tag: t.emphasis, class: "md-tok-em" },
  { tag: t.quote, class: "md-tok-quote" },
  { tag: t.link, class: "md-tok-link" },
  { tag: t.url, class: "md-tok-url" },
  { tag: t.monospace, class: "md-tok-code" },
  { tag: t.labelName, class: "md-tok-label" },
  { tag: t.contentSeparator, class: "md-tok-mark" },
  { tag: listMark, class: "md-tok-list" },
  { tag: t.processingInstruction, class: "md-tok-mark" },
  { tag: t.meta, class: "md-tok-mark" },
  { tag: t.invalid, class: "md-tok-invalid" },
]);

export const markdownFieldClass = "md-editor";

/**
 * The extensions of every Markdown field. One module-level array: a new identity on every render would reconfigure
 * the editor (and drop the undo history) on every keystroke.
 */
export const markdownFieldExtensions = [
  markdown({
    base: markdownLanguage,
    extensions: { props: [styleTags({ ListMark: listMark })] },
  }),
  syntaxHighlighting(highlighter),
];
