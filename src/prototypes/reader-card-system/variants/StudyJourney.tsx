import { ArrowUpRight, BookmarkPlus, Check, CircleDot, Eye, Plus, Undo2, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  LukeNarrativePreview,
  lukeChapterSections,
  PrototypeFrame,
  Surface,
  useLukeChapterOne,
  type LukeChapterSection,
  type WidthMode,
} from "../shared";
import "./study-journey.css";

type StudyJourneyProps = { replayKey: number };
type StageId = LukeChapterSection["id"];

type StudyStage = {
  id: StageId;
  label: string;
  hint: string;
  prompt: string;
  section: LukeChapterSection;
};

type ReviewItem = {
  id: string;
  stageId: StageId;
  title: string;
};

const stages: StudyStage[] = lukeChapterSections.map((section) => ({
  id: section.id,
  label: section.title,
  hint: section.movement,
  prompt: section.cue,
  section,
}));

function stageById(stageId: StageId) {
  return stages.find((stage) => stage.id === stageId) ?? stages[0];
}

function sameReviewTarget(left: ReviewItem, right: ReviewItem) {
  return left.id === right.id || left.stageId === right.stageId;
}

function withSingleTerminalPunctuation(text: string) {
  const trimmed = text.trim();
  const terminalMatch = trimmed.match(/[。！？.!?]+$/u);
  if (!terminalMatch) return `${trimmed}。`;
  return `${trimmed.slice(0, -terminalMatch[0].length)}${terminalMatch[0][0]}`;
}

export function StudyJourney({ replayKey }: StudyJourneyProps) {
  const { versesBySection, status } = useLukeChapterOne();
  const [widthMode, setWidthMode] = useState<WidthMode>("wide");
  const [activeStageId, setActiveStageId] = useState<StageId>(stages[0].id);
  const [completed, setCompleted] = useState<Set<StageId>>(() => new Set());
  const [queue, setQueue] = useState<ReviewItem[]>([
    { id: "q-john-announced", stageId: "john-announced", title: "回看：祷告被听见与静默记号" },
    { id: "q-mary-elizabeth", stageId: "mary-elizabeth", title: "回看：尊主颂里的翻转动词" },
  ]);
  const [removedItem, setRemovedItem] = useState<ReviewItem | null>(null);
  const [feedback, setFeedback] = useState("");

  const activeStage = useMemo(() => stageById(activeStageId), [activeStageId]);
  const isComplete = completed.has(activeStage.id);
  const queued = queue.some((item) => item.stageId === activeStage.id);

  const selectStage = (stageId: StudyStage["id"]) => {
    const nextStage = stageById(stageId);
    setActiveStageId(stageId);
    setFeedback(`已切换到“${nextStage.label}”：${withSingleTerminalPunctuation(nextStage.hint)}`);
  };

  const toggleComplete = () => {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(activeStage.id)) {
        next.delete(activeStage.id);
        setFeedback(`已把“${activeStage.label}”恢复为进行中。`);
      } else {
        next.add(activeStage.id);
        setFeedback(`已完成“${activeStage.label}”，可以继续下一步。`);
      }
      return next;
    });
  };

  const addToQueue = () => {
    if (queued) {
      setFeedback(`“${activeStage.label}”已经在稍后回看中。`);
      return;
    }
    const nextItem: ReviewItem = {
      id: `q-${activeStage.id}`,
      stageId: activeStage.id,
      title: `回看：${activeStage.section.range} ${activeStage.section.shortExcerpt}`,
    };
    setQueue((items) => (
      items.some((item) => sameReviewTarget(item, nextItem)) ? items : [...items, nextItem]
    ));
    setRemovedItem((current) => (
      current && sameReviewTarget(current, nextItem) ? null : current
    ));
    setFeedback(`已把“${activeStage.label}”加入稍后回看。`);
  };

  const removeQueueItem = (item: ReviewItem) => {
    setQueue((items) => items.filter((candidate) => candidate.id !== item.id));
    setRemovedItem(item);
    setFeedback(`已从回看列表移除“${item.title}”。`);
  };

  const restoreQueueItem = () => {
    if (!removedItem) return;
    const itemToRestore = removedItem;
    const alreadyQueued = queue.some((item) => sameReviewTarget(item, itemToRestore));
    if (!alreadyQueued) {
      setQueue((items) => [...items, itemToRestore]);
    }
    setFeedback(alreadyQueued ? `“${itemToRestore.title}”已在回看列表中。` : `已恢复“${itemToRestore.title}”。`);
    setRemovedItem(null);
  };

  return (
    <PrototypeFrame
      name="灵修行程桌"
      axis="Luke 1 narrative stages"
      description="把路加福音 1 章六段叙事变成可完成、可回看的研读行程，从确据一路走到清晨日光。"
      widthMode={widthMode}
      onWidthModeChange={(mode) => {
        setWidthMode(mode);
        setFeedback(`已切换到${mode === "wide" ? "宽" : mode === "medium" ? "中" : "窄"}栏行程演示。`);
      }}
      feedback={feedback}
    >
      <Surface eyebrow="左侧 · Luke 1 sections" title="六段行程" count={completed.size} className="journey-surface journey-surface--stages prototype-surface--left">
        <ol className="journey-stage-list" aria-label="路加福音 1 章六段研读阶段">
          {stages.map((stage, index) => {
            const active = activeStage.id === stage.id;
            const done = completed.has(stage.id);
            return (
              <li key={stage.id}>
                <button
                  type="button"
                  data-active={active ? "" : undefined}
                  data-complete={done ? "" : undefined}
                  aria-current={active ? "step" : undefined}
                  onClick={() => selectStage(stage.id)}
                >
                  <span className="journey-stage-list__marker" aria-hidden="true">
                    {done ? <Check size={14} /> : index + 1}
                  </span>
                  <span>
                    <strong>{stage.label}</strong>
                    <small>{stage.section.range}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Surface>

      <Surface eyebrow="中间 · 当前段落" title={activeStage.label} className="journey-surface journey-surface--focus prototype-surface--center">
        <article className="journey-focus-card">
          <header>
            <div>
              <span>{activeStage.section.range}</span>
              <h3>{activeStage.section.shortExcerpt}</h3>
            </div>
            <CircleDot aria-hidden="true" size={20} />
          </header>

          <div className="journey-focus-card__prompt">
            <span>此刻的提示</span>
            <p>{activeStage.prompt}</p>
          </div>

          <LukeNarrativePreview
            section={activeStage.section}
            verses={versesBySection.get(activeStage.id) ?? []}
            status={status}
          />
          <p className="journey-focus-card__excerpt">
            {activeStage.section.summary} 研读焦点：{activeStage.section.movement}
          </p>

          <div className="journey-focus-card__references" aria-label="相关引用">
            {[activeStage.section.range, ...activeStage.section.refs.map((ref) => `Luke.1.${ref}`)].map((reference) => (
              <button type="button" key={reference} onClick={() => setFeedback(`已聚焦引用 ${reference}。`)}>
                {reference}
              </button>
            ))}
          </div>

          <footer className="journey-focus-card__actions">
            <button type="button" aria-pressed={isComplete} onClick={toggleComplete}>
              <Check aria-hidden="true" size={16} /> {isComplete ? "已完成" : "完成此步"}
            </button>
            <button type="button" aria-pressed={queued} onClick={addToQueue}>
              <BookmarkPlus aria-hidden="true" size={16} /> {queued ? "已在回看" : "加入回看"}
            </button>
            <button type="button" onClick={() => setFeedback(`已把阅读焦点带回 ${activeStage.section.range}。`)}>
              <Eye aria-hidden="true" size={16} /> 查看经文
            </button>
          </footer>
        </article>
      </Surface>

      <Surface eyebrow="右侧 · 稍后回看" title="回看队列" count={queue.length} className="journey-surface journey-surface--queue prototype-surface--right">
        <aside className="journey-current-focus" aria-label="当前研读焦点">
          <span>当前焦点</span>
          <strong>{activeStage.label}</strong>
          <p>{activeStage.section.range} · {activeStage.hint}</p>
          <button
            type="button"
            aria-pressed={queued}
            aria-label={queued ? `${activeStage.label} 已在稍后回看中` : `把 ${activeStage.label} 加入稍后回看`}
            onClick={addToQueue}
          >
            {queued ? "已在回看" : "加入回看"}
          </button>
        </aside>

        <div className="journey-queue" aria-label="稍后回看卡片">
          {queue.map((item) => {
            const stage = stageById(item.stageId);
            return (
              <article key={item.id}>
                <button type="button" className="journey-queue__open" onClick={() => selectStage(item.stageId)}>
                  <span>{stage.label}</span>
                  <strong>{item.title}</strong>
                  <ArrowUpRight aria-hidden="true" size={15} />
                </button>
                <button type="button" className="journey-queue__remove" aria-label={`移除 ${item.title}`} onClick={() => removeQueueItem(item)}>
                  <X aria-hidden="true" size={15} />
                </button>
              </article>
            );
          })}
          {queue.length === 0 ? <p className="journey-queue__empty">暂时没有待回看的内容。</p> : null}
        </div>
        {removedItem ? (
          <button type="button" className="journey-queue__undo" onClick={restoreQueueItem}>
            <Undo2 aria-hidden="true" size={15} /> 撤销移除
          </button>
        ) : null}
        <button type="button" className="journey-queue__add" onClick={addToQueue}>
          <Plus aria-hidden="true" size={16} /> 把当前步骤加入回看
        </button>
      </Surface>
      <span className="prototype-replay-marker" aria-hidden="true" data-replay={replayKey} />
    </PrototypeFrame>
  );
}
