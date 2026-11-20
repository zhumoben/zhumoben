import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { markdownFieldClass, markdownFieldExtensions } from "../lib/md-editor";

/**
 * A small Markdown editor for the text fields of the scorecard: an item's evidence (`note`) and the Pro / Con / Q
 * notes. It shows the same syntax highlighting as the mini editor in asrun — headings, **bold**, `code`, lists and
 * links are colored while they are typed — in the project's monospace font.
 *
 * The box keeps the height the textarea had before it (see `.md-field--note` / `.md-field--notes` in `styles.css`) and
 * grows with its content; no `maxHeight`, so a long note is never hidden and the dock's body does the scrolling.
 *
 * The field owns its text while a person types in it. `@uiw/react-codemirror` answers a changed `value` by replacing
 * the whole document, so handing every keystroke straight back as `value` would undo the last characters, move the
 * caret and drop an input method's composition. `value` is therefore only adopted while the field does not have the
 * focus (a record was reloaded, "新建" was pressed) and again when it is left.
 */

/** One object for good: a new one on every render would make the editor reconfigure itself on every keystroke. */
const FIELD_BASIC_SETUP = {
  lineNumbers: false,
  foldGutter: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  highlightSelectionMatches: false,
  bracketMatching: false,
  closeBrackets: false,
  autocompletion: false,
  rectangularSelection: false,
  crosshairCursor: false,
  drawSelection: true,
};

export function MarkdownField({
  value,
  onChange,
  ariaLabel,
  placeholder,
  variant = "note",
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  /** Which CSS box this field sits in: an item's evidence or one of the three note boxes. */
  variant?: "note" | "notes";
  autoFocus?: boolean;
}) {
  // A new `onChange` identity on every render reconfigures the editor, and a reconfigure per keystroke disturbs an
  // input method's composition (which is where the last characters typed can disappear).
  const change = useRef(onChange);
  change.current = onChange;

  /** The text the editor shows. */
  const [text, setText] = useState(value);
  /** What the editor showed last; compared with `incoming` to tell a change from elsewhere from our own echo. */
  const shown = useRef(value);
  /** The last committed `value` of the caller, for the blur handler (which runs outside a render). */
  const incoming = useRef(value);
  const focused = useRef(false);

  /** Takes the caller's text when it differs from what the editor shows. */
  const adopt = useCallback(() => {
    if (incoming.current === shown.current) return;
    shown.current = incoming.current;
    setText(incoming.current);
  }, []);

  // A change from elsewhere (a reloaded record, "新建", a discarded draft) lands while the field is not the one being
  // typed in. While it is, the editor's own text wins: it is what the person sees and keeps typing in.
  useEffect(() => {
    incoming.current = value;
    if (focused.current) return;
    adopt();
  }, [value, adopt]);

  const handleChange = useCallback((next: string) => {
    shown.current = next;
    setText(next);
    change.current(next);
  }, []);

  const extensions = useMemo(
    () => [
      ...markdownFieldExtensions,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ "aria-label": ariaLabel }),
    ],
    [ariaLabel],
  );

  return (
    <div
      className={`md-field md-field--${variant} ${markdownFieldClass}`}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        // Leaving the field: the caller's version wins, so what was typed and what the record holds agree again.
        adopt();
      }}
    >
      <CodeMirror
        value={text}
        onChange={handleChange}
        theme="none"
        autoFocus={autoFocus}
        extensions={extensions}
        basicSetup={FIELD_BASIC_SETUP}
        placeholder={placeholder}
      />
    </div>
  );
}
