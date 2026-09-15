import { useLayoutEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/** Keep a failed resource recognizable and retryable, including inside image buttons. */
export function ResourceImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <ResourceImageAttempt key={props.src} {...props} />;
}

function ResourceImageAttempt({ alt = "", className, onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  const [insideButton, setInsideButton] = useState(false);
  const fallbackRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!failed) return;
    const parent = fallbackRef.current?.parentElement?.closest("button, a, [role='button']");
    setInsideButton(Boolean(parent));
    if (!parent) return;
    const retry = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      setFailed(false);
    };
    parent.addEventListener("click", retry, true);
    parent.addEventListener("keydown", retry, true);
    return () => {
      parent.removeEventListener("click", retry, true);
      parent.removeEventListener("keydown", retry, true);
    };
  }, [failed]);

  if (failed) return (
    <span
      ref={fallbackRef}
      className={`resource-image-error ${className ?? ""}`}
      role={insideButton ? undefined : "button"}
      tabIndex={insideButton ? undefined : 0}
      aria-label={insideButton ? undefined : `重试加载图片：${alt}`}
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); setFailed(false); }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault(); event.stopPropagation(); setFailed(false);
      }}
    >
      <span>图片暂时无法加载</span>
      <small>{alt} · 点击重试</small>
    </span>
  );

  return <img {...props} alt={alt} className={className} onError={(event) => {
    setFailed(true);
    onError?.(event);
  }} />;
}
