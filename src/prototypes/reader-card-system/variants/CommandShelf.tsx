import { ChevronDown, Copy, Navigation2, Pencil, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";
import {
  mediaCard,
  noteCard,
  PrototypeFrame,
  type PrototypeCardFixture,
  studyCard,
  Surface,
  TrianglePreview,
  useLukeChapterOne,
  type WidthMode,
} from "../shared";

type CommandShelfProps = { replayKey: number };

type CommandCardProps = {
  fixture: PrototypeCardFixture;
  onFeedback: (message: string) => void;
};

const primaryFixtures = [noteCard, studyCard, mediaCard];

function CommandCard({ fixture, onFeedback }: CommandCardProps) {
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
      <div className="command-card command-card--undo" role="status">
        <span>卡片已移入临时回收区</span>
        <button type="button" onClick={() => { setVisible(true); onFeedback(`已撤销移除“${title}”。`); }}><Undo2 aria-hidden="true" size={16} /> 撤销</button>
      </div>
    );
  }

  return (
    <article className="command-card">
      <header className="command-card__identity">
        <div>
          <span>{fixture.source}</span>
          {editing ? (
            <label>
              <span className="sr-only">编辑卡片标题</span>
              <input value={draftTitle} autoFocus onChange={(event) => setDraftTitle(event.target.value)} />
            </label>
          ) : <h3>{title}</h3>}
        </div>
        <small>{primaryReference}</small>
      </header>

      <div className="command-card__shelf" role="toolbar" aria-label={`${title} 快捷操作`}>
        {editing ? (
          <>
            <button type="button" onClick={() => { setTitle(draftTitle.trim() || fixture.title); setEditing(false); onFeedback("标题已在案例中保存。"); }}><span aria-hidden="true">✓</span> 保存</button>
            <button type="button" onClick={() => { setDraftTitle(title); setEditing(false); onFeedback("已取消编辑。"); }}><X aria-hidden="true" size={16} /> 取消</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onFeedback(`已定位到 ${primaryReference}：${title}`)}><Navigation2 aria-hidden="true" size={16} /> 定位</button>
            <button type="button" aria-pressed={collapsed} onClick={() => { setCollapsed((value) => !value); onFeedback(collapsed ? `已展开“${title}”。` : `已折叠“${title}”。`); }}><ChevronDown aria-hidden="true" size={16} /> {collapsed ? "展开" : "折叠"}</button>
            <button type="button" onClick={() => { setEditing(true); onFeedback(`正在编辑“${title}”。`); }}><Pencil aria-hidden="true" size={16} /> 编辑</button>
            <button type="button" onClick={copyBody}><Copy aria-hidden="true" size={16} /> 复制</button>
            <button type="button" className="is-danger" onClick={() => { setVisible(false); onFeedback(`已从案例中移除“${title}”。`); }}><Trash2 aria-hidden="true" size={16} /> 移除</button>
          </>
        )}
      </div>

      {!collapsed ? (
        <div className="command-card__body">
          {fixture.kind === "media" ? <TrianglePreview /> : null}
          <p>{fixture.body}</p>
          <div className="command-card__references">
            {fixture.references.map((reference) => <button type="button" key={reference} onClick={() => onFeedback(`已打开引用 ${reference}。`)}>{reference}</button>)}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function CommandShelf({ replayKey }: CommandShelfProps) {
  const [widthMode, setWidthMode] = useState<WidthMode>("wide");
  const [feedback, setFeedback] = useState("");
  const { sections } = useLukeChapterOne();
  const commandSections = [sections[0], sections[2], sections[5]];

  return (
    <PrototypeFrame
      name="快捷工具架"
      axis="高频操作模型"
      description="动作带文字、位置固定；再窄也保持触控尺寸，并允许工具条独立滚动。"
      widthMode={widthMode}
      onWidthModeChange={(mode) => { setWidthMode(mode); setFeedback("已切换栏宽，工具条按钮不会被压缩。"); }}
      feedback={feedback}
    >
      <Surface eyebrow="左侧 · 已整理" title="Luke 1 快捷入口" count={3} className="prototype-surface--left command-surface">
        <div className="command-section-rail" aria-label="路加福音一章快捷定位">
          {commandSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setFeedback(`已快速定位到 ${section.range}：${section.title}。`)}
            >
              <span>{section.range}</span>
              <strong>{section.title}</strong>
            </button>
          ))}
        </div>
        <CommandCard fixture={mediaCard} onFeedback={setFeedback} />
      </Surface>

      <Surface eyebrow="中间 · 当前章节" title="Luke.1.1–80" count={3} className="prototype-surface--center command-surface">
        <div className="command-primary-actions" aria-label="Luke 1 高频动作">
          {commandSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setFeedback(`已把 ${section.range} 加入快捷工具架：${section.cue}`)}
            >
              <span>{section.range}</span>
              <strong>{section.shortExcerpt}</strong>
            </button>
          ))}
        </div>
        {primaryFixtures.map((fixture) => (
          <CommandCard key={`${fixture.source}-${fixture.title}`} fixture={fixture} onFeedback={setFeedback} />
        ))}
      </Surface>

      <Surface eyebrow="右侧 · 资源浏览" title="Luke 1 综合解读" count={2} className="prototype-surface--right command-surface">
        <CommandCard fixture={studyCard} onFeedback={setFeedback} />
        <CommandCard fixture={mediaCard} onFeedback={setFeedback} />
      </Surface>
      <span className="prototype-replay-marker" aria-hidden="true" data-replay={replayKey} />
    </PrototypeFrame>
  );
}
