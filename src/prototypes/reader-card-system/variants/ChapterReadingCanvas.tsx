import { BookMarked, CheckCircle2, Compass, Eye, Layers3, Link2, Sparkles, Tags, UsersRound } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import {
  PrototypeFrame,
  Surface,
  lukeChapterSections,
  useLukeChapterOne,
  type LukeChapterSection,
  type LukeChapterVerse,
  type WidthMode,
} from "../shared";
import "./chapter-reading-canvas.css";

// UI prototype question: can a compact chapter header keep Luke 1 itself as the
// dominant surface while side panels only provide navigation and reading cues?

type ChapterReadingCanvasProps = { replayKey: number };

type SceneContext = {
  people: string[];
  themes: string[];
  crossReferences: string[];
};

const sceneContexts: Record<string, SceneContext> = {
  preface: {
    people: ["路加", "提阿非罗", "亲眼看见并传道的人"],
    themes: ["确实", "有序叙述", "传承与查考"],
    crossReferences: ["Acts.1.1–2", "John.20.30–31", "2Tim.3.14"],
  },
  "john-announced": {
    people: ["撒迦利亚", "伊利沙伯", "加百列", "以色列百姓"],
    themes: ["祷告蒙听", "祭司静默", "为主预备道路"],
    crossReferences: ["Mal.4.5–6", "Luke.1.76", "Isa.40.3"],
  },
  "jesus-announced": {
    people: ["马利亚", "加百列", "大卫家", "至高者的儿子"],
    themes: ["恩典临到", "圣灵荫庇", "王权应许"],
    crossReferences: ["2Sam.7.12–16", "Isa.7.14", "Luke.2.11"],
  },
  "mary-elizabeth": {
    people: ["马利亚", "伊利沙伯", "腹中的约翰", "亚伯拉罕后裔"],
    themes: ["蒙福相遇", "尊主颂", "怜悯与翻转"],
    crossReferences: ["1Sam.2.1–10", "Ps.103.17", "Luke.6.20–26"],
  },
  "john-born": {
    people: ["伊利沙伯", "撒迦利亚", "邻里亲族", "山地众人"],
    themes: ["怜悯公开", "命名顺服", "恢复开口"],
    crossReferences: ["Luke.1.13", "Luke.1.20", "Luke.1.76"],
  },
  "zechariah-prophecy": {
    people: ["撒迦利亚", "约翰", "主的百姓", "坐在黑暗中的人"],
    themes: ["眷顾救赎", "圣约记念", "日光临到"],
    crossReferences: ["Mal.3.1", "Isa.9.2", "Luke.2.30–32"],
  },
};

function widthLabel(mode: WidthMode) {
  if (mode === "wide") return "宽";
  if (mode === "medium") return "中";
  return "窄";
}

function sceneLabel(index: number) {
  return `场景 ${index + 1}`;
}

function verseStatusLabel(status: ReturnType<typeof useLukeChapterOne>["status"], verseCount: number) {
  if (status === "ready") return `${verseCount} 节`;
  if (status === "loading") return "载入中";
  return "章节概要";
}

function SceneNavigator({
  activeSectionId,
  onSelect,
}: {
  activeSectionId: string;
  onSelect: (section: LukeChapterSection) => void;
}) {
  return (
    <ol className="chapter-scene-nav" aria-label="路加福音一章六段叙事导航">
      {lukeChapterSections.map((section, index) => (
        <li key={section.id}>
          <button
            type="button"
            aria-pressed={activeSectionId === section.id}
            aria-label={`阅读${sceneLabel(index)}，${section.title}，${section.range}`}
            onClick={() => onSelect(section)}
          >
            <span className="chapter-scene-nav__number" aria-hidden="true">{index + 1}</span>
            <span className="chapter-scene-nav__copy">
              <strong>{section.title}</strong>
              <small>{section.range}</small>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function ChapterScene({
  section,
  sceneNumber,
  active,
  cueOpen,
  verses,
  scriptureStatus,
  onFocus,
}: {
  section: LukeChapterSection;
  sceneNumber: number;
  active: boolean;
  cueOpen: boolean;
  verses: LukeChapterVerse[];
  scriptureStatus: ReturnType<typeof useLukeChapterOne>["status"];
  onFocus: (section: LukeChapterSection) => void;
}) {
  return (
    <article
      className="chapter-reading-section"
      data-active={active ? "" : undefined}
      aria-current={active ? "location" : undefined}
    >
      <button
        type="button"
        className="chapter-reading-section__focus"
        onClick={() => onFocus(section)}
        aria-label={`聚焦${sceneLabel(sceneNumber - 1)}：${section.title}`}
      >
        <span>{sceneLabel(sceneNumber - 1)}</span>
        <strong>{section.title}</strong>
        <small>{section.range}</small>
      </button>

      <div className="chapter-reading-section__body">
        <p className="chapter-reading-section__excerpt">
          <span aria-hidden="true">“</span>{section.shortExcerpt.replace(/[“”]/g, "")}<span aria-hidden="true">”</span>
        </p>
        <div className="chapter-scripture-lines" aria-label={`${section.range} 经文正文`}>
          <div className="chapter-scripture-lines__label">
            <span>和合本 · 本地经文</span>
            <strong>{verseStatusLabel(scriptureStatus, verses.length)}</strong>
          </div>
          {verses.length > 0 ? verses.map((verse) => (
            <p key={verse.id}>
              <sup>{verse.verse}</sup>
              {verse.text}
            </p>
          )) : (
            <p className="chapter-scripture-lines__fallback">{section.summary}</p>
          )}
        </div>
        <p>{section.summary}</p>
        <div className="chapter-verse-refs" aria-label={`${section.title}重点节号`}>
          {section.refs.map((ref) => <span key={ref}>Luke.1.{ref}</span>)}
        </div>
        {active && cueOpen ? (
          <aside className="chapter-inline-cue" aria-label={`${section.title}阅读提示`}>
            <Sparkles aria-hidden="true" size={16} />
            <p>{section.cue}</p>
          </aside>
        ) : null}
      </div>
    </article>
  );
}

function ContextList({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <article className="chapter-context-card">
      {icon}
      <div>
        <h3>{title}</h3>
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </article>
  );
}

export function ChapterReadingCanvas({ replayKey }: ChapterReadingCanvasProps) {
  const [widthMode, setWidthMode] = useState<WidthMode>("wide");
  const [feedback, setFeedback] = useState("");
  const [activeSectionId, setActiveSectionId] = useState(lukeChapterSections[0].id);
  const [cueOpen, setCueOpen] = useState(true);
  const { verses, versesBySection, status: scriptureStatus, error } = useLukeChapterOne();

  const activeSection = useMemo(
    () => lukeChapterSections.find((section) => section.id === activeSectionId) ?? lukeChapterSections[0],
    [activeSectionId],
  );

  const activeSceneIndex = useMemo(
    () => lukeChapterSections.findIndex((section) => section.id === activeSection.id),
    [activeSection.id],
  );

  const activeContext = sceneContexts[activeSection.id] ?? {
    people: [],
    themes: [],
    crossReferences: activeSection.refs.map((ref) => `Luke.1.${ref}`),
  };

  const selectSection = (section: LukeChapterSection) => {
    setActiveSectionId(section.id);
    setFeedback(`已聚焦${section.title}：${section.range}。`);
  };

  const toggleCue = () => {
    const nextCueOpen = !cueOpen;
    setCueOpen(nextCueOpen);
    setFeedback(nextCueOpen ? `已展开${activeSection.title}阅读提示。` : "已收起阅读提示，中央经文保持连续阅读。");
  };

  return (
    <PrototypeFrame
      name="章节阅读画布"
      axis="章优先阅读与叙事场景"
      description="把卡片系统退到辅助位置：左侧只导航六段叙事，中央完整承载 Luke 1 的 80 节连续阅读，右侧随当前场景给人物、主题与互文线索。"
      chapterReference="Luke.1.1–80"
      contextLabel="80 节连续阅读 · 六段叙事"
      widthMode={widthMode}
      onWidthModeChange={(mode) => {
        setWidthMode(mode);
        setFeedback(`已切换到${widthLabel(mode)}栏章节画布，场景导航与上下文会重新排布。`);
      }}
      feedback={feedback}
      frameMode="chapter-focus"
    >
      <div className={`chapter-reading-canvas chapter-reading-canvas--${widthMode}`} data-cue-open={cueOpen ? "" : undefined}>
        <Surface eyebrow="左侧 · 场景轴" title="六段叙事导航" count={lukeChapterSections.length} countLabel="6 个叙事场景" className="prototype-surface--left chapter-reading-surface chapter-reading-surface--nav">
          <div className="chapter-nav-intro">
            <Compass aria-hidden="true" size={17} />
            <p>按叙事场景定位 Luke 1，但正文仍保持一章连续阅读。</p>
          </div>
          <SceneNavigator activeSectionId={activeSection.id} onSelect={selectSection} />
        </Surface>

        <Surface eyebrow="中央 · 连续章阅读" title="Luke 1 · 80 节正文" className="prototype-surface--center chapter-reading-surface chapter-reading-surface--reading">
          <div className="chapter-reading-scroll" aria-label="路加福音一章连续阅读">
            <header className="chapter-reading-lede">
              <div>
                <span>Chapter Reading Canvas</span>
                <h3>路加福音 1 章从确实之道开篇，穿过两次出生预告、两首颂赞，收束在旷野预备。</h3>
              </div>
              <BookMarked aria-hidden="true" size={28} />
            </header>

            <div className="chapter-reading-load-state" role="status" aria-live="polite">
              <strong>{scriptureStatus === "ready" ? "本地 Luke 1 已载入" : scriptureStatus === "loading" ? "正在载入本地 Luke 1" : "本地经文暂未载入"}</strong>
              <span>{scriptureStatus === "ready" ? `${verses.length} / 80 节` : error ?? "先显示六段章节概要。"}</span>
            </div>

            {lukeChapterSections.map((section, index) => (
              <ChapterScene
                key={section.id}
                section={section}
                sceneNumber={index + 1}
                active={activeSection.id === section.id}
                cueOpen={cueOpen}
                verses={versesBySection.get(section.id) ?? []}
                scriptureStatus={scriptureStatus}
                onFocus={selectSection}
              />
            ))}
          </div>
        </Surface>

        <Surface eyebrow="右侧 · 阅读线索" title="场景上下文" count={6} countLabel="6 个上下文模块" className="prototype-surface--right chapter-reading-surface chapter-reading-surface--context">
          <article className="chapter-focus-card" aria-live="polite">
            <header>
              <span>{activeSection.range}</span>
              <h3>{sceneLabel(activeSceneIndex)} · {activeSection.title}</h3>
            </header>
            <p>{activeSection.movement}</p>
            <button type="button" aria-pressed={cueOpen} onClick={toggleCue}>
              <Eye aria-hidden="true" size={16} />
              {cueOpen ? "隐藏中央提示" : "显示中央提示"}
            </button>
          </article>

          <ContextList
            icon={<UsersRound aria-hidden="true" size={18} />}
            title="人物"
            items={activeContext.people}
          />

          <ContextList
            icon={<Tags aria-hidden="true" size={18} />}
            title="主题"
            items={activeContext.themes}
          />

          <ContextList
            icon={<Link2 aria-hidden="true" size={18} />}
            title="互文"
            items={activeContext.crossReferences}
          />

          <article className="chapter-context-card chapter-context-card--checked">
            <CheckCircle2 aria-hidden="true" size={18} />
            <div>
              <h3>章节边界</h3>
              <p>本画布只读取 Luke.1.1–80；导航、提示与上下文都跟随六段共享章节模型。</p>
            </div>
          </article>

          <article className="chapter-context-card">
            <Layers3 aria-hidden="true" size={18} />
            <div>
              <h3>当前提示</h3>
              <p>{activeSection.cue}</p>
            </div>
          </article>
        </Surface>

        <span className="prototype-replay-marker" aria-hidden="true" data-replay={replayKey} />
      </div>
    </PrototypeFrame>
  );
}
