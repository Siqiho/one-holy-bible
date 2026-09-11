import { BookOpen, Columns3 } from "lucide-react";
import type { ReactNode } from "react";
import {
  lukeChapterSections,
  type LukeChapterSection,
  type LukeChapterStatus,
  type LukeChapterVerse,
} from "./lukeChapterOne";

export {
  lukeChapterCards,
  lukeChapterSections,
  useLukeChapterOne,
} from "./lukeChapterOne";
export type {
  LukeChapterCard,
  LukeChapterSection,
  LukeChapterStatus,
  LukeChapterVerse,
} from "./lukeChapterOne";

export type WidthMode = "wide" | "medium" | "narrow";

export type PrototypeCardFixture = {
  source: string;
  title: string;
  body: string;
  references: string[];
  kind: "note" | "media" | "study";
};

export const noteCard: PrototypeCardFixture = {
  source: "用户笔记",
  title: "确实之道需要有次序地读",
  body: "Luke 1 先给出阅读方法：把亲眼见证、传承与详细查考放在一起，帮助读者进入整章推进。",
  references: ["Luke.1.1–4", "路 1:4"],
  kind: "note",
};

export const studyCard: PrototypeCardFixture = {
  source: "综合解读",
  title: "两次预告并排显明恩典主动临到",
  body: "约翰与耶稣的出生预告都从神的主动差遣开始；不同回应形成张力，却共同指向主为百姓预备救恩。",
  references: ["Luke.1.5–38", "路 1:17"],
  kind: "study",
};

export const mediaCard: PrototypeCardFixture = {
  source: "媒体",
  title: "Luke 1 叙事流：从确据到日光",
  body: "六段叙事线浏览 80 节：序言、约翰预告、耶稣预告、两位母亲相遇、约翰出生、撒迦利亚预言。",
  references: ["Luke.1.1–80", "六段叙事"],
  kind: "media",
};

export type PrototypeFrameProps = {
  name: string;
  axis: string;
  description: string;
  frameMode?: "default" | "chapter-focus";
  chapterTitle?: string;
  chapterReference?: string;
  contextLabel?: string;
  widthMode: WidthMode;
  onWidthModeChange: (mode: WidthMode) => void;
  feedback: string;
  children: ReactNode;
};

const widthOptions: Array<{ mode: WidthMode; label: string }> = [
  { mode: "wide", label: "宽" },
  { mode: "medium", label: "中" },
  { mode: "narrow", label: "窄" },
];

export function PrototypeFrame({
  name,
  axis,
  description,
  frameMode = "default",
  chapterTitle,
  chapterReference = "Luke.1.1–80",
  contextLabel = "80 节连续阅读 · 降临序曲",
  widthMode,
  onWidthModeChange,
  feedback,
  children,
}: PrototypeFrameProps) {
  const displayedChapterTitle = chapterTitle ?? (chapterReference.startsWith("Gen.") ? "创世记 Genesis 1" : "路加福音 Luke 1");

  return (
    <main className={`reader-card-prototype reader-card-prototype--${frameMode}`}>
      <header className="prototype-brief">
        <div className="prototype-brief__identity">
          <div className="prototype-kicker">
            <BookOpen aria-hidden="true" size={16} strokeWidth={1.8} />
            One Holy Bible · Card Lab
          </div>
          <h1>{name}</h1>
          <p><strong>{axis}</strong> · {description}</p>
        </div>

        <div className="prototype-width-control" role="group" aria-label="模拟阅读台宽度">
          <span><Columns3 aria-hidden="true" size={15} /> 栏宽演示</span>
          <div>
            {widthOptions.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                aria-pressed={widthMode === mode}
                onClick={() => onWidthModeChange(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className={`prototype-workbench-shell prototype-workbench-shell--${widthMode}`} aria-label={`${name} 阅读台案例`}>
        <header className="prototype-workbench-toolbar">
          <div className="prototype-product-mark">OHB</div>
          <div>
            <span>{displayedChapterTitle}</span>
            <strong>{chapterReference}</strong>
          </div>
          <div className="prototype-workbench-toolbar__context">{contextLabel}</div>
        </header>
        <div className="prototype-workspace">{children}</div>
      </section>

      <div className="prototype-feedback" role="status" aria-live="polite">
        {feedback || "可点击案例中的控件，观察真实状态变化。"}
      </div>
    </main>
  );
}

export type LukeNarrativePreviewProps = {
  section?: LukeChapterSection;
  verses?: LukeChapterVerse[];
  status?: LukeChapterStatus;
  compact?: boolean;
  className?: string;
};

export function LukeNarrativePreview({
  section = lukeChapterSections[5],
  verses = [],
  status = "fallback",
  compact = false,
  className = "",
}: LukeNarrativePreviewProps) {
  const displayedVerses = compact ? verses.slice(0, 2) : verses.slice(0, 4);
  const previewClassName = [
    "prototype-luke-preview",
    compact ? "prototype-luke-preview--compact" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={previewClassName} aria-label={`${section.range} 路加福音一章叙事预览`}>
      <div className="prototype-luke-preview__beam" aria-hidden="true" />
      <div className="prototype-luke-preview__meta">
        <span>{section.range}</span>
        <strong>{section.title}</strong>
      </div>
      <p>{section.summary}</p>
      <div className="prototype-luke-preview__refs" aria-label="重点经文">
        {section.refs.map((ref) => <span key={ref}>Luke.1.{ref}</span>)}
      </div>
      {displayedVerses.length > 0 ? (
        <div className="prototype-luke-preview__verses" aria-label={`${section.range} 经文摘录`}>
          {displayedVerses.map((verse) => (
            <span key={verse.id}><sup>{verse.verse}</sup>{verse.text}</span>
          ))}
        </div>
      ) : (
        <small>{status === "loading" ? "正在载入本地经文……" : "章节概要预览"}</small>
      )}
    </div>
  );
}

export type SurfaceProps = {
  eyebrow: string;
  title: string;
  count?: number;
  countLabel?: string;
  className?: string;
  children: ReactNode;
};

export function Surface({ eyebrow, title, count, countLabel, className = "", children }: SurfaceProps) {
  return (
    <section className={`prototype-surface ${className}`.trim()} aria-label={title}>
      <header className="prototype-surface__header">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {typeof count === "number" ? <strong aria-label={countLabel ?? `${count} 张卡片`}>{count}</strong> : null}
      </header>
      <div className="prototype-surface__body">{children}</div>
    </section>
  );
}

export function TrianglePreview() {
  return <LukeNarrativePreview compact />;
}
