import { useMemo, useState } from "react";
import {
  lukeChapterSections,
  PrototypeFrame,
  Surface,
  type LukeChapterSection,
  type PrototypeCardFixture,
  type WidthMode,
} from "../shared";
import "./source-atlas.css";

type SourceAtlasProps = { replayKey: number };

type SourceKind = PrototypeCardFixture["kind"];

type AtlasNodeKind = "verse" | "card" | "reference";

type AtlasNode = {
  id: string;
  kind: AtlasNodeKind;
  source: string;
  sourceKind?: SourceKind;
  sectionId?: LukeChapterSection["id"];
  title: string;
  summary: string;
  references: string[];
  path: string[];
};

const sourceLabels: Record<SourceKind, string> = {
  note: "用户笔记",
  study: "综合解读",
  media: "媒体",
};

const sourceFilters: Array<{ kind: SourceKind; label: string; hint: string }> = [
  { kind: "note", label: sourceLabels.note, hint: "个人标注与读经札记" },
  { kind: "study", label: sourceLabels.study, hint: "归纳、串珠与神学整理" },
  { kind: "media", label: sourceLabels.media, hint: "图像、数值与外部素材" },
];

const sectionSourceKinds: Record<string, SourceKind> = {
  preface: "note",
  "john-announced": "study",
  "jesus-announced": "study",
  "mary-elizabeth": "note",
  "john-born": "media",
  "zechariah-prophecy": "study",
};

const cardTitlesBySection: Record<string, string> = {
  preface: "序言如何建立可靠叙述",
  "john-announced": "约翰预告与以利亚式使命",
  "jesus-announced": "圣子王权与马利亚回应",
  "mary-elizabeth": "尊主颂中的翻转关系",
  "john-born": "命名事件的公共见证",
  "zechariah-prophecy": "清晨日光照亮平安路",
};

function sourceSummary(kind: SourceKind, section: LukeChapterSection) {
  if (kind === "note") {
    return `个人标注把 ${section.range} 读成可回看的观察：${section.summary}`;
  }
  if (kind === "media") {
    return `媒体节点把 ${section.range} 的场景、人物与社区反应收束为可视化叙事线：${section.movement}`;
  }
  return `综合解读把 ${section.range} 放进 Luke 1 的应许推进：${section.summary}`;
}

function cardNodeFromSection(section: LukeChapterSection): AtlasNode {
  const sourceKind = sectionSourceKinds[section.id] ?? "study";

  return {
    id: `card-${section.id}`,
    kind: "card",
    source: sourceLabels[sourceKind],
    sourceKind,
    sectionId: section.id,
    title: cardTitlesBySection[section.id] ?? section.title,
    summary: `${sourceSummary(sourceKind, section)} ${section.cue}`,
    references: [section.range, ...section.refs.map((ref) => `Luke.1.${ref}`)],
    path: ["Luke.1.1–80", section.range, sourceLabels[sourceKind]],
  };
}

const cardNodes = lukeChapterSections.map(cardNodeFromSection);

const rootNode: AtlasNode = {
  id: "verse-luke-1",
  kind: "verse",
  source: "经文",
  title: "Luke.1.1–80",
  summary: "Luke 1 从序言的确实之道推进到约翰的旷野成长；图谱把六段叙事、三类卡片来源与每段关键经文放在同一条可追踪关系链上。",
  references: cardNodes.map((node) => node.title),
  path: ["Luke.1.1–80"],
};

const referenceNodes: AtlasNode[] = cardNodes.map((node) => {
  const section = lukeChapterSections.find((candidate) => candidate.id === node.sectionId) ?? lukeChapterSections[0];
  const primaryReference = node.references[1] ?? section.range;

  return {
    id: `reference-${section.id}`,
    kind: "reference" as const,
    source: node.source,
    sourceKind: node.sourceKind,
    sectionId: section.id,
    title: `${section.range} · ${section.shortExcerpt}`,
    summary: `“${node.title}”把 ${section.range} 连接到 ${primaryReference}，并沿着“${section.movement}”保留经文段落、卡片来源与重点经节的可追踪路径。`,
    references: [node.title, rootNode.title, ...section.refs.map((ref) => `Luke.1.${ref}`)],
    path: [rootNode.title, section.range, node.source, primaryReference],
  };
});

const atlasNodes = [rootNode, ...cardNodes, ...referenceNodes];

function nodeMark(kind: AtlasNodeKind, sourceKind?: SourceKind) {
  if (kind === "verse") return "经";
  if (kind === "reference") return "引";
  if (sourceKind === "media") return "媒";
  if (sourceKind === "study") return "解";
  return "笔";
}

function nodeFeedback(node: AtlasNode) {
  if (node.kind === "verse") return "已聚焦根节点 Luke.1.1–80，右侧显示整章叙事源头。";
  if (node.kind === "reference") return `已打开引用节点 ${node.title}。`;
  return `已选中${node.source}卡片：“${node.title}”。`;
}

function widthLabel(mode: WidthMode) {
  if (mode === "wide") return "宽";
  if (mode === "medium") return "中";
  return "窄";
}

type AtlasNodeButtonProps = {
  node: AtlasNode;
  active: boolean;
  onSelect: (node: AtlasNode) => void;
};

function AtlasNodeButton({ node, active, onSelect }: AtlasNodeButtonProps) {
  return (
    <button
      type="button"
      className={`atlas-node atlas-node--${node.kind}${node.sourceKind ? ` atlas-node--${node.sourceKind}` : ""}`}
      aria-pressed={active}
      aria-label={`查看 ${node.title} 的源流细节`}
      onClick={() => onSelect(node)}
    >
      <span className="atlas-node__icon" aria-hidden="true">{nodeMark(node.kind, node.sourceKind)}</span>
      <span className="atlas-node__copy">
        <small>{node.source}</small>
        <strong>{node.title}</strong>
      </span>
    </button>
  );
}

type DetailPanelProps = {
  node: AtlasNode;
  onSelectReference: (reference: string, fromNode: AtlasNode) => void;
};

function DetailPanel({ node, onSelectReference }: DetailPanelProps) {
  return (
    <article className="atlas-detail" aria-live="polite">
      <div className="atlas-detail__badge">
        <span>{node.kind === "verse" ? "Root" : node.kind === "card" ? "Card" : "Reference"}</span>
        <strong>{node.source}</strong>
      </div>

      <h3>{node.title}</h3>
      <p>{node.summary}</p>

      <div className="atlas-detail__section">
        <h4>References</h4>
        <div className="atlas-detail__references" aria-label={`${node.title} 的引用`}>
          {node.references.map((reference) => (
            <button
              key={reference}
              type="button"
              aria-label={`从 ${node.title} 追踪到 ${reference}`}
              onClick={() => onSelectReference(reference, node)}
            >
              <span aria-hidden="true">↗</span> {reference}
            </button>
          ))}
        </div>
      </div>

      <div className="atlas-detail__section">
        <h4>Path</h4>
        <ol className="atlas-path" aria-label={`${node.title} 的源流路径`}>
          {node.path.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
    </article>
  );
}

export function SourceAtlas({ replayKey }: SourceAtlasProps) {
  const [widthMode, setWidthMode] = useState<WidthMode>("wide");
  const [feedback, setFeedback] = useState("");
  const [activeFilter, setActiveFilter] = useState<SourceKind | null>(null);
  const [activeNodeId, setActiveNodeId] = useState(rootNode.id);

  const visibleCards = useMemo(
    () => cardNodes.filter((node) => !activeFilter || node.sourceKind === activeFilter),
    [activeFilter],
  );

  const visibleReferences = useMemo(
    () => referenceNodes.filter((node) => !activeFilter || node.sourceKind === activeFilter),
    [activeFilter],
  );

  const activeNode = atlasNodes.find((node) => node.id === activeNodeId) ?? rootNode;
  const visibleNodeIds = new Set([rootNode.id, ...visibleCards.map((node) => node.id), ...visibleReferences.map((node) => node.id)]);
  const detailNode = visibleNodeIds.has(activeNode.id) ? activeNode : rootNode;

  const selectNode = (node: AtlasNode) => {
    setActiveNodeId(node.id);
    setFeedback(nodeFeedback(node));
  };

  const selectFilter = (kind: SourceKind) => {
    const nextFilter = activeFilter === kind ? null : kind;
    setActiveFilter(nextFilter);
    if (nextFilter) {
      const nextNode = cardNodes.find((node) => node.sourceKind === nextFilter) ?? rootNode;
      setActiveNodeId(nextNode.id);
      setFeedback(`只显示${sourceLabels[nextFilter]}源流；不对应的卡片节点已隐藏。`);
    } else {
      setActiveNodeId(rootNode.id);
      setFeedback("已恢复全部 source 节点。");
    }
  };

  const resolveDetailReference = (reference: string, fromNode: AtlasNode) => {
    const exactTitleNode = atlasNodes.find((node) => node.title === reference);
    if (exactTitleNode) return exactTitleNode;

    if (fromNode.kind === "card" && fromNode.sourceKind) {
      const referenceNode = referenceNodes.find(
        (node) => node.sectionId === fromNode.sectionId || (node.sourceKind === fromNode.sourceKind && node.title === reference),
      );
      if (referenceNode) return referenceNode;
    }

    if (fromNode.kind === "reference" && fromNode.sourceKind) {
      const parentCardNode = cardNodes.find(
        (node) => node.sourceKind === fromNode.sourceKind && node.title === reference,
      );
      if (parentCardNode) return parentCardNode;
    }

    const exactReferenceNode = referenceNodes.find((node) => node.title === reference);
    if (exactReferenceNode) return exactReferenceNode;

    return atlasNodes.find((node) => node.references.includes(reference));
  };

  const selectDetailReference = (reference: string, fromNode: AtlasNode) => {
    const nextNode = resolveDetailReference(reference, fromNode);
    if (nextNode) {
      if (activeFilter && nextNode.sourceKind && nextNode.sourceKind !== activeFilter) {
        setActiveFilter(nextNode.sourceKind);
      }
      setActiveNodeId(nextNode.id);
      setFeedback(`已从详情面板追踪到 ${reference}。`);
    } else {
      setFeedback(`已标记引用 ${reference}；此原型未展开更多层级。`);
    }
  };

  return (
    <PrototypeFrame
      name="源流图谱桌"
      axis="source / relationship traceability"
      description="把经文、卡片来源与引用路径放在同一张暖纸图谱上，先看关系，再打开细节。"
      widthMode={widthMode}
      onWidthModeChange={(mode) => { setWidthMode(mode); setFeedback(`已切换到${widthLabel(mode)}栏源流图谱。`); }}
      feedback={feedback}
    >
      <Surface eyebrow="左侧 · Source Ledger" title="来源筛选" count={visibleCards.length} className="prototype-surface--left source-atlas-surface">
        <div className="atlas-ledger">
          <div className="atlas-ledger__intro">
            <span className="atlas-ledger__mark" aria-hidden="true">源</span>
            <p>选择一个来源，只保留对应卡片与引用节点；再次点击恢复全量图谱。</p>
          </div>

          <div className="atlas-filter-list" role="group" aria-label="Source filter">
            {sourceFilters.map((filter) => (
              <button
                key={filter.kind}
                type="button"
                className="atlas-filter"
                aria-pressed={activeFilter === filter.kind}
                onClick={() => selectFilter(filter.kind)}
              >
                <span>{filter.label}</span>
                <small>{filter.hint}</small>
              </button>
            ))}
          </div>

          <div className="atlas-ledger__status" role="status" aria-live="polite">
            {activeFilter ? `当前只显示：${sourceLabels[activeFilter]}` : "当前显示：全部 source"}
          </div>
        </div>
      </Surface>

      <Surface eyebrow="中间 · 当前经文" title="Luke 1 源流图谱" count={1 + visibleCards.length + visibleReferences.length} className="prototype-surface--center source-atlas-surface source-atlas-surface--map">
        <div className={`atlas-map atlas-map--${widthMode}`} aria-label="Luke 1 source relationship map">
          <div className="atlas-map__column atlas-map__column--root" aria-label="经文根节点">
            <span className="atlas-map__column-label">经文</span>
            <AtlasNodeButton node={rootNode} active={detailNode.id === rootNode.id} onSelect={selectNode} />
          </div>

          <div className="atlas-map__column atlas-map__column--cards" aria-label="卡片来源节点">
            <span className="atlas-map__column-label">卡片</span>
            {visibleCards.map((node) => (
              <AtlasNodeButton key={node.id} node={node} active={detailNode.id === node.id} onSelect={selectNode} />
            ))}
          </div>

          <div className="atlas-map__column atlas-map__column--references" aria-label="引用节点">
            <span className="atlas-map__column-label">引用</span>
            {visibleReferences.map((node) => (
              <AtlasNodeButton key={node.id} node={node} active={detailNode.id === node.id} onSelect={selectNode} />
            ))}
          </div>
        </div>
      </Surface>

      <Surface eyebrow="右侧 · Detail" title="当前节点" className="prototype-surface--right source-atlas-surface">
        <DetailPanel node={detailNode} onSelectReference={selectDetailReference} />
      </Surface>
      <span className="prototype-replay-marker" aria-hidden="true" data-replay={replayKey} />
    </PrototypeFrame>
  );
}
