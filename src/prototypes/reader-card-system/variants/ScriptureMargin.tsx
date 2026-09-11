import { ChevronDown, Copy, PanelRight, Rows3 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  LukeNarrativePreview,
  lukeChapterSections,
  PrototypeFrame,
  Surface,
  useLukeChapterOne,
  type LukeChapterSection,
  type PrototypeCardFixture,
  type WidthMode,
} from "../shared";
import "./scripture-margin.css";

type AnchorId = LukeChapterSection["id"];
type MarginNoteId = LukeChapterSection["id"];
type DisplayMode = "side" | "foot";
type MarginKind = PrototypeCardFixture["kind"];

type ScriptureVerse = {
  anchor: AnchorId;
  verseNumber: number;
  range: string;
  label: string;
  fallbackText: string;
  section: LukeChapterSection;
};

type MarginNote = {
  id: MarginNoteId;
  anchor: AnchorId;
  range: string;
  source: string;
  title: string;
  body: string;
  references: string[];
  kind: MarginKind;
  section: LukeChapterSection;
};

const noteKindBySection: Record<string, MarginKind> = {
  preface: "note",
  "john-announced": "study",
  "jesus-announced": "study",
  "mary-elizabeth": "note",
  "john-born": "media",
  "zechariah-prophecy": "study",
};

const sourceLabelByKind: Record<MarginKind, string> = {
  note: "用户笔记",
  study: "综合解读",
  media: "媒体",
};

const marginCopyBySection: Record<string, { title: string; body: string }> = {
  preface: {
    title: "确实之道与有序阅读",
    body: "序言把 Luke 1 的阅读入口放在“亲眼看见的人”“传道的人”和“详细考察”之间：边注不急着下结论，而是提醒读者按次序跟随路加的见证链。",
  },
  "john-announced": {
    title: "圣殿静默中的祷告回应",
    body: "撒迦利亚的怀疑没有取消应许，却让静默成为可见的记号；这段把祭司、殿、百姓等候和孩子使命连在一起，显示救恩先从神听见多年祷告开始。",
  },
  "jesus-announced": {
    title: "大卫王位与卑微仆人",
    body: "加百列宣告的不是一般出生喜讯，而是至高者儿子的王权应许；马利亚的“我是主的使女”让宏大的国度应许落在具体、顺服的身体与日常生活里。",
  },
  "mary-elizabeth": {
    title: "两位母亲把恩典唱出来",
    body: "伊利沙伯的祝福和马利亚的尊主颂互相呼应：腹中婴孩欢喜跳动，个人蒙恩立刻扩展成神怜悯、翻转、记念亚伯拉罕之约的公共赞美。",
  },
  "john-born": {
    title: "命名、开口与山地传闻",
    body: "约翰的出生让隐藏的怜悯进入邻里共同见证；当撒迦利亚写下孩子的名字并重新开口，众人从欢喜走向敬畏，开始追问这孩子将来的使命。",
  },
  "zechariah-prophecy": {
    title: "清晨日光与预备道路",
    body: "撒迦利亚的颂歌把约翰放在先知使命中，也把焦点推向主亲自眷顾救赎；“清晨的日光”把赦罪、平安路和坐在黑暗中的人连成全章的黎明终点。",
  },
};

const scriptureVerses: ScriptureVerse[] = lukeChapterSections.map((section) => {
  const verseNumber = section.refs[0] ?? section.startVerse;

  return {
    anchor: section.id,
    verseNumber,
    range: section.range,
    label: `Luke.1.${verseNumber}`,
    fallbackText: `${section.shortExcerpt} — ${section.summary}`,
    section,
  };
});

const marginNotes: MarginNote[] = lukeChapterSections.map((section) => {
  const kind = noteKindBySection[section.id] ?? "study";
  const copy = marginCopyBySection[section.id] ?? { title: section.title, body: section.summary };

  return {
    id: section.id,
    anchor: section.id,
    range: section.range,
    source: sourceLabelByKind[kind],
    title: copy.title,
    body: `${copy.body} ${section.cue}`,
    references: [section.range, ...section.refs.map((ref) => `Luke.1.${ref}`)],
    kind,
    section,
  };
});

const initialDisplayModes = Object.fromEntries(
  marginNotes.map((note, index) => [note.id, index === 2 || index === 5 ? "foot" : "side"]),
) as Record<MarginNoteId, DisplayMode>;

const initialCollapsedNotes = Object.fromEntries(
  marginNotes.map((note) => [note.id, false]),
) as Record<MarginNoteId, boolean>;

function noteForAnchor(anchor: AnchorId) {
  return marginNotes.find((note) => note.anchor === anchor) ?? marginNotes[0];
}

function labelForAnchor(anchor: AnchorId) {
  return scriptureVerses.find((verse) => verse.anchor === anchor)?.label ?? "Luke.1.1";
}

function displayModeLabel(mode: DisplayMode) {
  return mode === "side" ? "旁注" : "脚注";
}

function footnoteSummary(note: MarginNote, collapsed: boolean) {
  if (collapsed) {
    return "正文已折叠；点按脚注仍可回到经文锚点与右侧控制。";
  }

  return note.body.length > 54 ? `${note.body.slice(0, 54)}……` : note.body;
}

export function ScriptureMargin({ replayKey }: { replayKey: number }) {
  const { verses, versesBySection, status } = useLukeChapterOne();
  const [widthMode, setWidthMode] = useState<WidthMode>("wide");
  const [feedback, setFeedback] = useState("");
  const [activeAnchor, setActiveAnchor] = useState<AnchorId>(scriptureVerses[0].anchor);
  const [activeNoteId, setActiveNoteId] = useState<MarginNoteId>(marginNotes[0].id);
  const [displayModes, setDisplayModes] = useState(initialDisplayModes);
  const [collapsedNotes, setCollapsedNotes] = useState(initialCollapsedNotes);
  const [copiedNoteId, setCopiedNoteId] = useState<MarginNoteId | null>(null);

  const versesByNumber = useMemo(() => new Map(verses.map((verse) => [verse.verse, verse.text])), [verses]);
  const activeNote = marginNotes.find((note) => note.id === activeNoteId) ?? marginNotes[0];
  const modeClass = `scripture-margin-mode-${widthMode}`;
  const footnoteNotes = marginNotes.filter((note) => displayModes[note.id] === "foot");
  const activeLabel = labelForAnchor(activeAnchor);

  const selectAnchor = (anchor: AnchorId, origin: "verse" | "spine") => {
    const nextNote = noteForAnchor(anchor);
    const nextLabel = labelForAnchor(anchor);
    setActiveAnchor(anchor);
    setActiveNoteId(nextNote.id);
    setFeedback(origin === "verse" ? `已从经文 ${nextLabel} 同步到右侧批注。` : `经文脊柱已定位到 ${nextLabel}。`);
  };

  const selectNote = (note: MarginNote) => {
    setActiveAnchor(note.anchor);
    setActiveNoteId(note.id);
    setFeedback(`已选择 ${displayModeLabel(displayModes[note.id])}“${note.title}”，中央经文同步到 ${labelForAnchor(note.anchor)}。`);
  };

  const setDisplayMode = (note: MarginNote, mode: DisplayMode) => {
    setDisplayModes((current) => ({ ...current, [note.id]: mode }));
    setFeedback(`“${note.title}”现在显示为${displayModeLabel(mode)}。`);
  };

  const toggleCollapsed = (note: MarginNote) => {
    const nextValue = !collapsedNotes[note.id];
    setCollapsedNotes((current) => ({ ...current, [note.id]: nextValue }));
    setFeedback(nextValue ? `“${note.title}”正文已折叠。` : `“${note.title}”正文已展开。`);
  };

  const copyNote = async (note: MarginNote) => {
    try {
      await navigator.clipboard.writeText(`${note.title}\n${note.body}`);
      setFeedback(`已复制“${note.title}”。`);
    } catch {
      setFeedback(`“${note.title}”已进入原型复制反馈；当前浏览器未开放剪贴板权限。`);
    }
    setCopiedNoteId(note.id);
  };

  return (
    <PrototypeFrame
      name="经文边注台"
      axis="verse-anchor topology"
      description="经文行、左侧脊柱与右侧批注共享同一组 verse anchor，选择任何一端都会同步定位。"
      widthMode={widthMode}
      onWidthModeChange={(mode) => {
        setWidthMode(mode);
        setFeedback(mode === "narrow" ? "已切到窄栏：经文纸面优先，批注改为脚注顺序。" : `已切到${mode === "wide" ? "宽" : "中"}栏：保持经文锚点同步。`);
      }}
      feedback={feedback}
    >
      <Surface
        eyebrow="左侧 · Verse anchors"
        title="经文脊柱"
        count={scriptureVerses.length}
        className={`prototype-surface--left scripture-margin-surface scripture-margin-surface--spine ${modeClass}`}
      >
        <nav className="scripture-margin-spine" aria-label="路加福音 1 章经文锚点">
          {scriptureVerses.map((verse) => (
            <button
              key={verse.anchor}
              type="button"
              className="scripture-margin-spine-button"
              data-active={activeAnchor === verse.anchor ? "" : undefined}
              aria-label={`定位到 ${verse.label}`}
              aria-pressed={activeAnchor === verse.anchor}
              onClick={() => selectAnchor(verse.anchor, "spine")}
            >
              <span className="scripture-margin-spine-button__number">{verse.verseNumber}</span>
              <span className="scripture-margin-spine-button__label">{verse.label}</span>
            </button>
          ))}
        </nav>
      </Surface>

      <Surface
        eyebrow="中间 · Luke 1 narrative anchors"
        title="连续经文纸面"
        className={`prototype-surface--center scripture-margin-surface scripture-margin-surface--paper ${modeClass}`}
      >
        <article className="scripture-margin-paper" aria-label="路加福音 1 章六段叙事经文锚点">
          <header className="scripture-margin-paper__header">
            <span>路加福音 Luke</span>
            <strong>1:1–80</strong>
          </header>
          <div className="scripture-margin-verses">
            {scriptureVerses.map((verse) => (
              <button
                key={verse.anchor}
                type="button"
                className="scripture-margin-verse"
                data-active={activeAnchor === verse.anchor ? "" : undefined}
                aria-label={`选择经文 ${verse.label}`}
                aria-pressed={activeAnchor === verse.anchor}
                id={`scripture-margin-verse-${verse.anchor}`}
                onClick={() => selectAnchor(verse.anchor, "verse")}
              >
                <span className="scripture-margin-verse__number">{verse.verseNumber}</span>
                <span className="scripture-margin-verse__text">
                  {versesByNumber.get(verse.verseNumber) ?? verse.fallbackText}
                </span>
              </button>
            ))}
          </div>
          <p className="scripture-margin-paper__cue">
            当前锚点：<strong>{activeLabel}</strong> · {activeNote.range} · 已连接 “{activeNote.title}”
          </p>
          {footnoteNotes.length > 0 ? (
            <section className="scripture-margin-footnotes" aria-label="经文纸面脚注">
              <h3 className="scripture-margin-footnotes__title">脚注</h3>
              <div className="scripture-margin-footnotes__list">
                {footnoteNotes.map((note) => {
                  const isActive = note.id === activeNoteId;
                  const collapsed = collapsedNotes[note.id];

                  return (
                    <button
                      key={note.id}
                      type="button"
                      className="scripture-margin-footnote"
                      data-active={isActive ? "" : undefined}
                      aria-controls={`scripture-margin-verse-${note.anchor}`}
                      aria-label={`脚注 ${note.title}，回到 ${labelForAnchor(note.anchor)}`}
                      aria-pressed={isActive}
                      onClick={() => selectNote(note)}
                    >
                      <span className="scripture-margin-footnote__anchor">{labelForAnchor(note.anchor)}</span>
                      <span className="scripture-margin-footnote__title">{note.title}</span>
                      <span className="scripture-margin-footnote__summary">{footnoteSummary(note, collapsed)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </article>
      </Surface>

      <Surface
        eyebrow="右侧 · Linked notes"
        title="页边批注"
        count={marginNotes.length}
        className={`prototype-surface--right scripture-margin-surface scripture-margin-surface--notes ${modeClass}`}
      >
        <div className="scripture-margin-note-list" aria-label="按经文锚点排序的批注与脚注控制">
          {marginNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            const displayMode = displayModes[note.id];
            const collapsed = collapsedNotes[note.id];
            const copied = copiedNoteId === note.id;

            return (
              <article
                key={note.id}
                className="scripture-margin-note"
                data-active={isActive ? "" : undefined}
                data-anchor={note.anchor}
                data-display={displayMode}
              >
                <button
                  type="button"
                  className="scripture-margin-note__selector"
                  aria-label={`选择 ${note.title}，锚点 ${labelForAnchor(note.anchor)}`}
                  aria-pressed={isActive}
                  onClick={() => selectNote(note)}
                >
                  <span className="scripture-margin-note__anchor">{note.range}</span>
                  <span className="scripture-margin-note__title">{note.title}</span>
                  <span className="scripture-margin-note__mode">{displayModeLabel(displayMode)}</span>
                </button>

                {isActive ? (
                  <div className="scripture-margin-note__controls" role="toolbar" aria-label={`${note.title} 批注操作`}>
                    <button
                      type="button"
                      className="scripture-margin-control"
                      aria-label={`把 ${note.title} 显示为脚注`}
                      aria-pressed={displayMode === "foot"}
                      onClick={() => setDisplayMode(note, "foot")}
                    >
                      <Rows3 aria-hidden="true" size={15} />
                      脚注
                    </button>
                    <button
                      type="button"
                      className="scripture-margin-control"
                      aria-label={`把 ${note.title} 显示为旁注`}
                      aria-pressed={displayMode === "side"}
                      onClick={() => setDisplayMode(note, "side")}
                    >
                      <PanelRight aria-hidden="true" size={15} />
                      旁注
                    </button>
                    <button
                      type="button"
                      className="scripture-margin-control"
                      aria-label={collapsed ? `展开 ${note.title}` : `折叠 ${note.title}`}
                      aria-pressed={collapsed}
                      aria-expanded={!collapsed}
                      onClick={() => toggleCollapsed(note)}
                    >
                      <ChevronDown aria-hidden="true" size={15} />
                      {collapsed ? "已折叠" : "折叠"}
                    </button>
                    <button
                      type="button"
                      className="scripture-margin-control"
                      aria-label={`复制 ${note.title}`}
                      aria-pressed={copied}
                      onClick={() => copyNote(note)}
                    >
                      <Copy aria-hidden="true" size={15} />
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                ) : null}

                {displayMode === "foot" ? (
                  <p className="scripture-margin-note__foot-status">
                    已移入中央经文纸面的脚注区；右侧保留锚点与显示方式控制。
                  </p>
                ) : !collapsed ? (
                  <div className="scripture-margin-note__body">
                    <LukeNarrativePreview
                      section={note.section}
                      verses={versesBySection.get(note.section.id) ?? []}
                      status={status}
                      compact
                    />
                    <p>{note.body}</p>
                    <div className="scripture-margin-note__refs" aria-label={`${note.title} 相关引用`}>
                      {note.references.map((reference) => (
                        <span key={reference}>{reference}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="scripture-margin-note__collapsed">正文已折叠，锚点和显示位置仍可操作。</p>
                )}
              </article>
            );
          })}
        </div>
      </Surface>

      <span className="scripture-margin-replay-marker" aria-hidden="true" data-replay={replayKey} />
    </PrototypeFrame>
  );
}
