import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChapterReadingCanvas } from "./variants/ChapterReadingCanvas";
import { CommandShelf } from "./variants/CommandShelf";
import { QuietDossier } from "./variants/QuietDossier";
import { ScriptureMargin } from "./variants/ScriptureMargin";
import { StableGrid } from "./variants/StableGrid";
import { SourceAtlas } from "./variants/SourceAtlas";
import { StudyJourney } from "./variants/StudyJourney";

type VariantDefinition = {
  id: string;
  name: string;
  Component: (props: { replayKey: number }) => React.ReactNode;
};

const variants: VariantDefinition[] = [
  { id: "stable-grid", name: "稳态栅格", Component: StableGrid },
  { id: "quiet-dossier", name: "静读卷宗", Component: QuietDossier },
  { id: "command-shelf", name: "快捷工具架", Component: CommandShelf },
  { id: "scripture-margin", name: "经文边注台", Component: ScriptureMargin },
  { id: "source-atlas", name: "源流图谱桌", Component: SourceAtlas },
  { id: "study-journey", name: "灵修行程桌", Component: StudyJourney },
  { id: "chapter-reading-canvas", name: "章节阅读画布", Component: ChapterReadingCanvas },
];

function initialVariantIndex() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("variant");
  const idIndex = variants.findIndex((variant) => variant.id === id);
  if (idIndex >= 0) return idIndex;
  const value = Number.parseInt(params.get("v") ?? "1", 10);
  return Number.isInteger(value) && value >= 1 && value <= variants.length ? value - 1 : 0;
}

export function PrototypeApp() {
  const [current, setCurrent] = useState(initialVariantIndex);
  const [replayKey, setReplayKey] = useState(0);

  const setActive = useCallback((index: number) => {
    if (index < 0 || index >= variants.length) return;
    setCurrent(index);
    setReplayKey((value) => value + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    url.searchParams.set("variant", variants[index].id);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= variants.length) setActive(number - 1);
      else if (event.key === "ArrowRight") setActive((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") setActive((current - 1 + variants.length) % variants.length);
      else if (event.key === "r" || event.key === "R") setReplayKey((value) => value + 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [current, setActive]);

  const activeVariant = useMemo(() => variants[current], [current]);
  const ActiveComponent = activeVariant.Component;

  return (
    <>
      <div id="stage" key={`${current}-${replayKey}`}>
        <ActiveComponent replayKey={replayKey} />
      </div>

      <nav className="prototype-switcher" aria-label="Prototype variants">
        <button
          type="button"
          aria-label="上一个原型方案"
          onClick={() => setActive((current - 1 + variants.length) % variants.length)}
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>
        <span aria-live="polite" aria-atomic="true">
          <strong>{current + 1} / {variants.length}</strong>
          <em>{activeVariant.name}</em>
        </span>
        <button
          type="button"
          aria-label="下一个原型方案"
          onClick={() => setActive((current + 1) % variants.length)}
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
        <button
          type="button"
          className="prototype-switcher__replay"
          aria-label="重播当前方案动效 (R)"
          onClick={() => setReplayKey((value) => value + 1)}
        >
          <RotateCcw aria-hidden="true" size={15} />
        </button>
      </nav>
    </>
  );
}
