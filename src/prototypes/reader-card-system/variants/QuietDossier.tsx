import { ChevronDown, Copy, MoreHorizontal, Pencil, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";
import {
  LukeNarrativePreview,
  mediaCard,
  noteCard,
  PrototypeFrame,
  type PrototypeCardFixture,
  studyCard,
  Surface,
  useLukeChapterOne,
  type WidthMode,
} from "../shared";

type QuietDossierProps = { replayKey: number };

const dossierFixtures = [noteCard, studyCard, mediaCard];

type FolioListProps = {
  items: PrototypeCardFixture[];
  activeTitle: string;
  onSelect: (fixture: PrototypeCardFixture) => void;
};

function FolioList({ items, activeTitle, onSelect }: FolioListProps) {
  return (
    <div className="folio-list">
      {items.map((fixture) => (
        <button
          key={`${fixture.source}-${fixture.title}`}
          type="button"
          className="folio-row"
          data-active={activeTitle === fixture.title ? "" : undefined}
          aria-pressed={activeTitle === fixture.title}
          onClick={() => onSelect(fixture)}
        >
          <span>{fixture.source}</span>
          <strong>{fixture.title}</strong>
          <small>{fixture.references[0]}</small>
        </button>
      ))}
    </div>
  );
}

export function QuietDossier({ replayKey }: QuietDossierProps) {
  const [widthMode, setWidthMode] = useState<WidthMode>("wide");
  const [feedback, setFeedback] = useState("");
  const [activeFixture, setActiveFixture] = useState(noteCard);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(noteCard.title);
  const [draftTitle, setDraftTitle] = useState(noteCard.title);
  const { sections, versesBySection, status } = useLukeChapterOne();
  const primarySections = sections.slice(0, 3);
  const activeReference = activeFixture.references[0] ?? "Luke.1.1–80";

  const selectFixture = (fixture: PrototypeCardFixture) => {
    setActiveFixture(fixture);
    setTitle(fixture.title);
    setDraftTitle(fixture.title);
    setVisible(true);
    setCollapsed(false);
    setMenuOpen(false);
    setFeedback(`已把“${fixture.title}”放到阅读卷宗中央。`);
  };

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(activeFixture.body);
      setFeedback(`已复制“${title}”正文。`);
    } catch {
      setFeedback(`“${title}”已进入原型复制反馈；浏览器未开放剪贴板权限。`);
    }
  };

  return (
    <PrototypeFrame
      name="静读卷宗"
      axis="渐进显隐与阅读沉浸"
      description="正文先出现，工具后出现；侧栏像索引，中央像正在阅读的卷宗。"
      widthMode={widthMode}
      onWidthModeChange={(mode) => { setWidthMode(mode); setFeedback(`已切换栏宽，正文优先级保持不变。`); }}
      feedback={feedback}
    >
      <Surface eyebrow="左侧 · 已整理" title="卷宗索引" count={3} className="prototype-surface--left quiet-surface">
        <FolioList items={dossierFixtures} activeTitle={activeFixture.title} onSelect={selectFixture} />
      </Surface>

      <Surface eyebrow="中间 · 当前章节" title="Luke 1 阅读卷宗" count={3} className="prototype-surface--center quiet-surface quiet-surface--lead">
        {visible ? (
          <article className="dossier-card">
            <header className="dossier-card__header">
              <div className="dossier-card__meta">
                <span>{activeFixture.source}</span>
                <small>{activeReference}</small>
              </div>
              {editing ? (
                <div className="dossier-card__edit">
                  <label>
                    <span className="sr-only">编辑卷宗标题</span>
                    <input value={draftTitle} autoFocus onChange={(event) => setDraftTitle(event.target.value)} />
                  </label>
                  <button type="button" onClick={() => { setTitle(draftTitle.trim() || activeFixture.title); setEditing(false); setFeedback("卷宗标题已在案例中保存。"); }}>保存</button>
                  <button type="button" aria-label="取消编辑" onClick={() => { setDraftTitle(title); setEditing(false); setFeedback("已取消编辑。"); }}><X aria-hidden="true" size={16} /></button>
                </div>
              ) : <h3>{title}</h3>}

              <button
                type="button"
                className="dossier-card__more"
                aria-label="更多卡片操作"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal aria-hidden="true" size={20} />
              </button>

              {menuOpen ? (
                <div className="dossier-card__menu" role="toolbar" aria-label="卷宗操作">
                  <button type="button" onClick={() => { setCollapsed((value) => !value); setFeedback(collapsed ? "正文已展开。" : "正文已折叠。"); }}>
                    <ChevronDown aria-hidden="true" size={16} /> {collapsed ? "展开" : "折叠"}
                  </button>
                  <button type="button" onClick={() => { setEditing(true); setMenuOpen(false); setFeedback("正在编辑卷宗标题。"); }}>
                    <Pencil aria-hidden="true" size={16} /> 编辑
                  </button>
                  <button type="button" onClick={copyBody}>
                    <Copy aria-hidden="true" size={16} /> 复制
                  </button>
                  <button type="button" className="is-danger" onClick={() => { setVisible(false); setMenuOpen(false); setFeedback(`已从卷宗中移除“${title}”。`); }}>
                    <Trash2 aria-hidden="true" size={16} /> 移除
                  </button>
                </div>
              ) : null}
            </header>

            {!collapsed ? (
              <div className="dossier-card__body">
                <p>{activeFixture.body}</p>
                <div className="dossier-section-flow" aria-label="Luke 1 阅读卷宗主线">
                  {primarySections.map((section) => (
                    <LukeNarrativePreview
                      key={section.id}
                      section={section}
                      verses={versesBySection.get(section.id)}
                      status={status}
                      compact
                    />
                  ))}
                </div>
                <div className="dossier-card__references" aria-label="相关引用">
                  {activeFixture.references.map((reference) => <button type="button" key={reference} onClick={() => setFeedback(`已定位到引用 ${reference}。`)}>{reference}</button>)}
                </div>
              </div>
            ) : <p className="dossier-card__collapsed-note">正文已收起，卷宗标题仍保持可辨识。</p>}
          </article>
        ) : (
          <div className="dossier-card dossier-card--undo" role="status">
            <p>卷宗已暂时移除。</p>
            <button type="button" onClick={() => { setVisible(true); setFeedback(`已撤销移除“${title}”。`); }}><Undo2 aria-hidden="true" size={16} /> 撤销</button>
          </div>
        )}
      </Surface>

      <Surface eyebrow="右侧 · 资源浏览" title="Luke 1 相关卷宗" count={3} className="prototype-surface--right quiet-surface">
        <FolioList items={dossierFixtures} activeTitle={activeFixture.title} onSelect={selectFixture} />
      </Surface>
      <span className="prototype-replay-marker" aria-hidden="true" data-replay={replayKey} />
    </PrototypeFrame>
  );
}
