import { ArrowLeftRight, BookOpen, Columns3, RotateCcw, Save, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BibleVersion } from "../domain/bible";
import { defaultWorkbenchLayout, type DockSide, type ResourceModuleLayout, type WorkbenchLayout } from "../domain/layout";
import type { StudyResource } from "../domain/resources";
import type { VerseId } from "../domain/verse";
import { resourcesForVerse } from "../lib/backlinks";
import { searchBibleText } from "../lib/bibleSearch";

const layoutStorageKey = "bible-study-reader-layout";

interface WorkbenchProps {
  versions: BibleVersion[];
  resources: StudyResource[];
  initialLayout: WorkbenchLayout;
  onSaveLayout?: (layout: WorkbenchLayout) => void;
}

function storedLayout(initialLayout: WorkbenchLayout): WorkbenchLayout {
  try {
    const raw = localStorage.getItem(layoutStorageKey);
    return raw ? { ...initialLayout, ...JSON.parse(raw) } : initialLayout;
  } catch (error) {
    console.warn("[workbench] layout restore failed", error);
    return initialLayout;
  }
}

function moduleResources(moduleId: ResourceModuleLayout["id"], resources: StudyResource[]) {
  if (moduleId === "commentary") {
    return resources.filter((resource) => resource.type === "commentary" || resource.type === "link");
  }
  if (moduleId === "media") {
    return resources.filter((resource) => ["html", "image", "video"].includes(resource.type));
  }
  if (moduleId === "notes") {
    return resources.filter((resource) => resource.type === "note");
  }
  return resources;
}

function renderResource(resource: StudyResource) {
  return (
    <article className={`resource-card resource-card--${resource.type}`} key={resource.id}>
      <header className="resource-card__header">
        <span className="drag-handle">::::</span>
        <h3>{resource.title}</h3>
      </header>
      <div className="resource-card__body">
        {resource.type === "html" ? (
          <div className="html-preview">互动 HTML：词语关系图 / 时间轴 / 小测验</div>
        ) : resource.type === "video" ? (
          <div className="video-preview">播放：{resource.title}</div>
        ) : resource.type === "image" ? (
          <div className="image-preview">图片 / 地图 / 图表</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{resource.body}</ReactMarkdown>
        )}
      </div>
    </article>
  );
}

export function Workbench({ versions, resources, initialLayout, onSaveLayout }: WorkbenchProps) {
  const [layout, setLayout] = useState(() => storedLayout(initialLayout));
  const [selectedVerseId, setSelectedVerseId] = useState<VerseId>("Gen.1.1");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("工作台已加载");

  const cuv = versions.find((version) => version.id === "cuv");
  const kjv = versions.find((version) => version.id === "kjv");
  const visibleVersions = versions.filter((version) => {
    if (version.id === "cuv") return layout.showCuv;
    if (version.id === "kjv") return layout.showKjv;
    return true;
  });
  const currentResources = useMemo(() => resourcesForVerse(resources, selectedVerseId), [resources, selectedVerseId]);
  const searchResults = useMemo(() => searchBibleText(versions, query), [query, versions]);

  useEffect(() => {
    console.info("[workbench] selected verse changed", {
      selectedVerseId,
      resourceIds: currentResources.map((resource) => resource.id),
    });
  }, [currentResources, selectedVerseId]);

  function selectVerse(verseId: VerseId) {
    setSelectedVerseId(verseId);
    setStatus(`已选择 ${verseId}`);
  }

  function changeLayout(nextLayout: WorkbenchLayout) {
    setLayout(nextLayout);
    localStorage.setItem(layoutStorageKey, JSON.stringify(nextLayout));
  }

  function moveModule(moduleId: ResourceModuleLayout["id"], side: DockSide) {
    const nextLayout = {
      ...layout,
      modules: layout.modules.map((module) => (module.id === moduleId ? { ...module, side } : module)),
    };
    changeLayout(nextLayout);
    setStatus(`已移动 ${moduleId} 到${side === "left" ? "左侧" : "右侧"}`);
  }

  function saveLayout() {
    localStorage.setItem(layoutStorageKey, JSON.stringify(layout));
    onSaveLayout?.(layout);
    console.info("[workbench] layout saved", layout);
    setStatus("布局已保存");
  }

  function resetLayout() {
    changeLayout(defaultWorkbenchLayout);
    setStatus("布局已重置");
  }

  function renderBibleColumn(version: BibleVersion) {
    const isKjv = version.id === "kjv";
    return (
      <section className={`bible-column ${isKjv ? "bible-column--kjv" : "bible-column--cuv"}`} key={version.id}>
        <h2>{version.label} / {isKjv ? "Genesis" : "创世记"} 1</h2>
        <div className="verse-list">
          {version.verses.map((verse) => (
            <button
              aria-current={verse.id === selectedVerseId ? "true" : undefined}
              className="verse-button"
              data-testid={`${version.id}-${verse.id}`}
              key={`${version.id}-${verse.id}`}
              onClick={() => selectVerse(verse.id)}
              type="button"
            >
              <strong>{verse.verse}</strong> {verse.text}
            </button>
          ))}
        </div>
      </section>
    );
  }

  function renderDock(side: DockSide) {
    const modules = layout.modules.filter((module) => module.side === side && module.visible);
    const targetSide = side === "left" ? "right" : "left";

    return (
      <aside className={`resource-dock resource-dock--${side}`}>
        <div className="resource-dock__title">
          <span>{side === "left" ? "左侧资源" : "右侧资源"}</span>
          <span>{selectedVerseId}</span>
        </div>
        {modules.map((module) => {
          const resourcesForModule = moduleResources(module.id, currentResources);
          return (
            <section className="resource-module" key={module.id}>
              <header className="resource-module__header">
                <span>{module.title}</span>
                <button type="button" onClick={() => moveModule(module.id, targetSide)}>
                  <ArrowLeftRight size={14} />
                  移动 {module.title} 到{targetSide === "left" ? "左侧" : "右侧"}
                </button>
              </header>
              {resourcesForModule.length > 0 ? (
                resourcesForModule.map(renderResource)
              ) : (
                <p className="resource-dock__empty">当前经节还没有资源。</p>
              )}
            </section>
          );
        })}
      </aside>
    );
  }

  return (
    <main className="workbench">
      <header className="toolbar">
        <button className="toolbar-button" type="button">
          <BookOpen size={16} />
          创世记
        </button>
        <button className="toolbar-button" type="button">
          第 1 章
        </button>
        <button
          className="toolbar-button"
          type="button"
          onClick={() => changeLayout({ ...layout, showCuv: !layout.showCuv })}
        >
          <Columns3 size={16} />
          和合本
        </button>
        <button
          className="toolbar-button"
          type="button"
          onClick={() => changeLayout({ ...layout, showKjv: !layout.showKjv })}
        >
          <Columns3 size={16} />
          KJV
        </button>
        <div className="bible-search">
          <Search size={16} />
          <input
            placeholder="搜索经文"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query.trim() ? (
            <div className="bible-search__results">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button key={`${result.versionId}-${result.verseId}`} type="button" onClick={() => selectVerse(result.verseId)}>
                    {result.versionLabel} {result.verseId} {result.text}
                  </button>
                ))
              ) : (
                <p>没有经文结果。</p>
              )}
            </div>
          ) : null}
        </div>
        <button className="toolbar-button" type="button" onClick={saveLayout}>
          <Save size={16} />
          保存布局
        </button>
        <button className="toolbar-button" type="button" onClick={resetLayout}>
          <RotateCcw size={16} />
          重置
        </button>
      </header>

      <div
        className="workbench-grid"
        style={{ gridTemplateColumns: `${layout.leftWidth}px minmax(520px, 1fr) ${layout.rightWidth}px` }}
      >
        {renderDock("left")}
        <section className="reader-pane">
          {visibleVersions.map(renderBibleColumn)}
          {!cuv && !kjv ? <p>没有可显示的圣经版本。</p> : null}
        </section>
        {renderDock("right")}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </main>
  );
}
