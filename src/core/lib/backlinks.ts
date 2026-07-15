import type { StudyResource } from "../domain/resources";
import type { VerseId } from "../domain/verse";
import { normalizeVerseRef } from "../domain/verse";

const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;

export function resourceMentionsVerse(resource: StudyResource, verseId: VerseId): boolean {
  if (resource.primaryAnchor === verseId || resource.verses.includes(verseId)) {
    return true;
  }

  return Array.from(resource.body.matchAll(wikiLinkPattern)).some((match) => {
    try {
      return normalizeVerseRef(match[1]) === verseId;
    } catch {
      return false;
    }
  });
}

export function resourcesForVerse(resources: StudyResource[], verseId: VerseId): StudyResource[] {
  return resources.filter((resource) => resourceMentionsVerse(resource, verseId));
}

export function resourcesForBookIntro(resources: StudyResource[], book: string): StudyResource[] {
  return resources.filter((resource) => resource.bookIntro === book);
}
