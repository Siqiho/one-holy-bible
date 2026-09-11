import { ChevronDown, Copy, GripVertical, Navigation2, Pencil, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";
import {
  LukeNarrativePreview,
  lukeChapterSections,
  mediaCard,
  noteCard,
  PrototypeFrame,
  type PrototypeCardFixture,
  studyCard,
  Surface,
  useLukeChapterOne,
  type WidthMode,
} from "../shared";

type StableGridProps = { replayKey: number };

type StableCardProps = {
  fixture: PrototypeCardFixture;
  compact?: boolean;
  onFeedback: (message: string) => void;
};

const primaryFixtures = [noteCard, studyCard, mediaCard];

function StableCard({ fixture, compact = false, onFeedback }: StableCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(fixture.title);
  const [draftTitle, setDraftTitle] = useState(fixture.title);
  const primaryReference = fixture.references[0] ?? "Luke.1.1–80";

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(fixture.body);
      onFeedback(`已复制“${title}”正文。`);
    } catch {
      onFeedback(`“${title}”已进入原型复制反馈；浏览器未开放剪贴板权限。`);
    }
  };

  if (!visible) {
    return (
      <div className="stable-card stable-card--undo" role="status">
        <span>卡片已从这个案例中移除</span>
        <button type="button" onClick={() => { setVisible(true); onFeedback(`已撤销移除“${title}”。`); }}>
          <Undo2 aria-hidden="true" size={16} /> 撤销
        </button>
      </div>
    );
  }

  return (
    <article className={`stable-card${compact ? " stable-card--compact" : ""}`}>
      <header className="stable-card__header">
        <div className="stable-card__leading">
          <span className="stable-card__grip" title="固定尺寸的拖拽把手" aria-hidden="true">
            <GripVertical size={18} />
          </span>
          <button type="button" className="stable-icon-button" aria-label={`定位到 ${primaryReference} ${title}`} onClick={() => onFeedback(`已定位到 ${primaryReference}：${title}`)}>
            <Navigation2 aria-hidden="true" size={17} />
          </button>
          <button
            type="button"
            className="stable-icon-button"
            aria-label={`${collapsed ? "展开" : "折叠"} ${title}`}
            aria-expanded={!collapsed}
            onClick={() => { setCollapsed((value) => !value); onFeedback(collapsed ? `已展开“${title}”。` : `已折叠“${title}”。`); }}
          >
            <ChevronDown aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="stable-card__identity">
          <span>{fixture.source}</span>
          {editing ? (
            <label>
              <span className="sr-only">编辑卡片标题</span>
              <input value={draftTitle} autoFocus onChange={(event) => setDraftTitle(event.target.value)} />
            </label>
          ) : <h3 title={title}>{title}</h3>}
        </div>

        <div className="stable-card__actions">
          {editing ? (
            <>
              <button
                type="button"
                className="stable-icon-button"
                aria-label={`保存 ${title}`}
                onClick={() => { setTitle(draftTitle.trim() || fixture.title); setEditing(false); onFeedback("标题已在原型中保存。"); }}
              >
                <span aria-hidden="true">✓</span>
              </button>
              <button
                type="button"
                className="stable-icon-button"
                aria-label="取消编辑"
                onClick={() => { setDraftTitle(title); setEditing(false); onFeedback("已取消编辑。"); }}
              >
                <X aria-hidden="true" size={16} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className="stable-icon-button" aria-label={`编辑 ${title}`} onClick={() => { setEditing(true); onFeedback(`正在编辑“${title}”。`); }}>
                <Pencil aria-hidden="true" size={16} />
              </button>
              <button type="button" className="stable-icon-button" aria-label={`复制 ${title}`} onClick={copyBody}>
                <Copy aria-hidden="true" size={16} />
              </button>
              <button type="button" className="stable-icon-button stable-icon-button--danger" aria-label={`移除 ${title}`} onClick={() => { setVisible(false); onFeedback(`已从案例中移除“${title}”。`); }}>
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {!collapsed ? (
        <div className="stable-card__body">
          {fixture.kind === "media" ? <LukeNarrativePreview section={lukeChapterSections[5]} compact /> : null}
          <p>{fixture.body}</p>
          <div className="stable-card__references" aria-label="相关引用">
            {fixture.references.map((reference) => <span key={reference}>{reference}</span>)}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function StableGrid({ replayKey }: StableGridProps) {
  const [widthMode, setWidthMode] = useState<WidthMode>("wide");
  const [feedback, setFeedback] = useState("");
  const { sections } = useLukeChapterOne();
  const gridSections = sections.slice(0, 3);

  return (
    <PrototypeFrame
      name="稳态栅格"
      axis="响应式布局"
      description="空间不足时换行，不压缩；卡片身份、标题与动作始终各守其位。"
      widthMode={widthMode}
      onWidthModeChange={(mode) => { setWidthMode(mode); setFeedback(`已切换到${mode === "wide" ? "宽" : mode === "medium" ? "中" : "窄"}栏演示。`); }}
      feedback={feedback}
    >
      <Surface eyebrow="左侧 · 已整理" title="Luke 1 叙事线" count={3} className="prototype-surface--left">
        <div className="stable-section-stack" aria-label="路加福音一章已整理叙事节点">
          {gridSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="stable-section-chip"
              onClick={() => setFeedback(`已定位到 ${section.range}：${section.title}。`)}
            >
              <span>{section.range}</span>
              <strong>{section.title}</strong>
              <small>{section.shortExcerpt}</small>
            </button>
          ))}
        </div>
        <StableCard fixture={mediaCard} compact onFeedback={setFeedback} />
      </Surface>

      <Surface eyebrow="中间 · 当前章节" title="Luke.1.1–80" count={3} className="prototype-surface--center">
        <div className="stable-section-strip" aria-label="路加福音一章主阅读节点">
          {gridSections.map((section) => (
            <article key={section.id}>
              <span>{section.range}</span>
              <strong>{section.title}</strong>
              <p>{section.summary}</p>
            </article>
          ))}
        </div>
        {primaryFixtures.map((fixture, index) => (
          <StableCard key={`${fixture.source}-${fixture.title}`} fixture={fixture} compact={index > 0} onFeedback={setFeedback} />
        ))}
      </Surface>

      <Surface eyebrow="右侧 · 资源浏览" title="Luke 1 资源" count={2} className="prototype-surface--right">
        <StableCard fixture={studyCard} compact onFeedback={setFeedback} />
        <StableCard fixture={mediaCard} compact onFeedback={setFeedback} />
      </Surface>
      <span className="prototype-replay-marker" aria-hidden="true" data-replay={replayKey} />
    </PrototypeFrame>
  );
}
