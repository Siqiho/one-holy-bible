import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { BibleVerse } from "../domain/bible";
import type { VerseId } from "../domain/verse";
import { createVerseTextLookup, type VerseTextLookup } from "../lib/cuvVerseLookup";

const VersePreviewContext = createContext<VerseTextLookup | null>(null);

export function VersePreviewProvider({
  verses,
  children,
}: {
  verses: readonly Pick<BibleVerse, "id" | "text">[];
  children: ReactNode;
}) {
  const lookup = useMemo(() => createVerseTextLookup(verses), [verses]);
  return <VersePreviewContext.Provider value={lookup}>{children}</VersePreviewContext.Provider>;
}

export function useVerseTextLookup(): VerseTextLookup | null {
  return useContext(VersePreviewContext);
}

export function useVerseText(verseId: VerseId | null | undefined): string | undefined {
  const lookup = useVerseTextLookup();
  if (!verseId || !lookup) return undefined;
  return lookup.get(verseId);
}
