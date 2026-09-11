import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { bookTitle } from "../domain/bibleBooks";
import { detectScriptureRefs, type DetectedScriptureRef } from "../domain/scriptureRef";
import { parseVerseId, type VerseId } from "../domain/verse";
import { useVerseTextLookup } from "./VersePreviewContext";

interface ScriptureLinkedTextProps {
  text: string;
  sourceBookId?: string;
  sourceChapter?: number;
}

interface PreviewState {
  verseIds: VerseId[];
  label: string;
  anchor: DOMRect;
}

function displayLabelForRef(ref: DetectedScriptureRef, sourceText: string): string {
  // Wiki links read cleaner without brackets; comprehensive citations keep surrounding parens.
  if (ref.pattern === "wiki") {
    return ref.raw.replace(/^\[\[/, "").replace(/\]\]$/, "");
  }
  return sourceText.slice(ref.start, ref.end);
}

function formatVerseHeading(verseId: VerseId): string {
  try {
    const parsed = parseVerseId(verseId);
    return `${bookTitle(parsed.book)} ${parsed.chapter}:${parsed.verse}`;
  } catch {
    return verseId;
  }
}

function splitPlainWithBreaks(value: string): ReactNode[] {
  const parts = value.split("\n");
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (index > 0) nodes.push(<br key={`br-${index}`} />);
    if (part) nodes.push(part);
  });
  return nodes;
}

export function ScriptureLinkedText({ text, sourceBookId, sourceChapter }: ScriptureLinkedTextProps) {
  const lookup = useVerseTextLookup();
  const refs = useMemo(
    () => detectScriptureRefs(text, { sourceBookId, sourceChapter }),
    [sourceBookId, sourceChapter, text],
  );
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const paragraphs = useMemo(() => text.split(/\n\s*\n/), [text]);

  if (!text.trim()) {
    return null;
  }

  // Map global offsets by rebuilding from paragraph joins with \n\n
  let cursor = 0;
  const paragraphNodes = paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraphIndex > 0) {
      // account for the \n\n consumed by split (formatTextResourceBody uses \n\n)
      cursor += 2;
    }

    const paragraphStart = cursor;
    const paragraphEnd = paragraphStart + paragraph.length;
    cursor = paragraphEnd;

    const localRefs = refs.filter((ref) => ref.start >= paragraphStart && ref.end <= paragraphEnd);
    const children: ReactNode[] = [];
    let localCursor = 0;

    localRefs.forEach((ref, refIndex) => {
      const start = ref.start - paragraphStart;
      const end = ref.end - paragraphStart;
      if (start > localCursor) {
        children.push(...splitPlainWithBreaks(paragraph.slice(localCursor, start)).map((node, i) => (
          <span key={`t-${paragraphIndex}-${refIndex}-pre-${i}`}>{node}</span>
        )));
      }

      if (ref.verseIds.length === 0) {
        children.push(
          <span key={`t-${paragraphIndex}-${refIndex}-raw`}>{paragraph.slice(start, end)}</span>,
        );
        localCursor = end;
        return;
      }

      const label = displayLabelForRef(ref, text);
      const keyId = ref.verseIds.join("_");
      children.push(
        <ScriptureRefMark
          key={`ref-${paragraphIndex}-${refIndex}-${keyId}`}
          label={label}
          verseIds={ref.verseIds}
          enabled={Boolean(lookup)}
          onPreview={(next) => setPreview(next)}
          onClearPreview={() =>
            setPreview((current) =>
              current && current.verseIds.join("|") === ref.verseIds.join("|") ? null : current,
            )
          }
        />,
      );
      localCursor = end;
    });

    if (localCursor < paragraph.length) {
      children.push(
        <span key={`t-${paragraphIndex}-tail`}>{splitPlainWithBreaks(paragraph.slice(localCursor))}</span>,
      );
    }

    return (
      <p key={`p-${paragraphIndex}`} className="scripture-linked-text__paragraph">
        {children}
      </p>
    );
  });

  return (
    <div className="scripture-linked-text" data-testid="scripture-linked-text">
      {paragraphNodes}
      {preview && lookup ? (
        <VersePreviewPopover
          verseIds={preview.verseIds}
          label={preview.label}
          anchor={preview.anchor}
          lookup={lookup}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}

function ScriptureRefMark({
  label,
  verseIds,
  enabled,
  onPreview,
  onClearPreview,
}: {
  label: string;
  verseIds: VerseId[];
  enabled: boolean;
  onPreview: (state: PreviewState) => void;
  onClearPreview: () => void;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const primaryId = verseIds[0]!;

  function openPreview() {
    if (!enabled || !anchorRef.current) return;
    onPreview({
      verseIds,
      label,
      anchor: anchorRef.current.getBoundingClientRect(),
    });
  }

  return (
    <span
      ref={anchorRef}
      className={`scripture-ref ${enabled ? "scripture-ref--interactive" : ""}`}
      data-testid="scripture-ref"
      data-verse-id={primaryId}
      data-verse-ids={verseIds.join(",")}
      tabIndex={enabled ? 0 : undefined}
      role={enabled ? "link" : undefined}
      aria-label={enabled ? `查看和合本 ${formatVerseHeadingList(verseIds)}` : undefined}
      onMouseEnter={openPreview}
      onMouseLeave={onClearPreview}
      onFocus={openPreview}
      onBlur={onClearPreview}
      onClick={(event) => {
        // Keep parent card selection/drag handlers from treating this as card chrome.
        event.stopPropagation();
        openPreview();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      {label}
    </span>
  );
}

function formatVerseHeadingList(verseIds: VerseId[]): string {
  if (verseIds.length === 1) return formatVerseHeading(verseIds[0]!);
  try {
    const parsed = verseIds.map((id) => parseVerseId(id));
    const first = parsed[0]!;
    const sameChapter = parsed.every((item) => item.book === first.book && item.chapter === first.chapter);
    if (sameChapter) {
      return `${bookTitle(first.book)} ${first.chapter}:${parsed.map((item) => item.verse).join("、")}`;
    }
    const sameBook = parsed.every((item) => item.book === first.book);
    if (sameBook) {
      return `${bookTitle(first.book)} ${parsed.map((item) => `${item.chapter}:${item.verse}`).join("；")}`;
    }
  } catch {
    // fall through
  }
  return verseIds.map((id) => formatVerseHeading(id)).join("；");
}

function VersePreviewPopover({
  verseIds,
  label,
  anchor,
  lookup,
  onClose,
}: {
  verseIds: VerseId[];
  label: string;
  anchor: DOMRect;
  lookup: Map<string, string> | { get(id: string): string | undefined };
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: anchor.bottom + 8, left: anchor.left });
  const entries = verseIds.map((verseId) => ({
    verseId,
    text: lookup.get(verseId),
  }));
  const contentKey = entries.map((entry) => `${entry.verseId}:${entry.text ?? ""}`).join("|");

  useLayoutEffect(() => {
    const node = popoverRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const margin = 8;
    let top = anchor.bottom + 8;
    let left = anchor.left;

    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - rect.height - 8);
    }
    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }
    if (left < margin) left = margin;

    setPosition({ top, left });
  }, [anchor.bottom, anchor.left, anchor.top, contentKey]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function handleScroll() {
      onClose();
    }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  const heading = formatVerseHeadingList(verseIds);

  return createPortal(
    <div
      ref={popoverRef}
      className="verse-preview-popover"
      data-testid="verse-preview-popover"
      role="tooltip"
      style={{ top: position.top, left: position.left }}
    >
      <div className="verse-preview-popover__header">
        <strong>{heading}</strong>
        <span>和合本</span>
      </div>
      <div className="verse-preview-popover__body">
        {entries.map((entry) => (
          <p className="verse-preview-popover__text" key={entry.verseId}>
            {entries.length > 1 ? <span className="verse-preview-popover__verse-no">{parseVerseId(entry.verseId).verse}. </span> : null}
            {entry.text?.trim()
              ? entry.text
              : `暂无和合本经文（${label} → ${entry.verseId}）`}
          </p>
        ))}
      </div>
    </div>,
    document.body,
  );
}
