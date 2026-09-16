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

export interface VerseResourceIndex {
  /** Same relation as `resourceMentionsVerse`: anchor, covered verses, or a wiki link in the body. */
  mentioning(verseId: VerseId): StudyResource[];
  /** Anchor or covered verses only, ignoring wiki-link mentions. */
  touching(verseId: VerseId): StudyResource[];
  /** Union of `mentioning` over several verses, in original resource order. */
  mentioningAny(verseIds: readonly VerseId[]): StudyResource[];
}

const noResources: StudyResource[] = [];

/**
 * Builds the verse → resources relation once so chapter/verse lookups are O(hits)
 * instead of re-scanning every resource body per verse on each navigation.
 * Per-verse lists preserve the order of `resources`.
 */
export function createVerseResourceIndex(resources: StudyResource[]): VerseResourceIndex {
  const mentioningByVerse = new Map<VerseId, StudyResource[]>();
  const touchingByVerse = new Map<VerseId, StudyResource[]>();
  const orderByResource = new Map<StudyResource, number>();

  function push(map: Map<VerseId, StudyResource[]>, verseId: VerseId, resource: StudyResource) {
    const bucket = map.get(verseId);
    if (!bucket) {
      map.set(verseId, [resource]);
    } else if (bucket[bucket.length - 1] !== resource) {
      bucket.push(resource);
    }
  }

  resources.forEach((resource, order) => {
    orderByResource.set(resource, order);
    const direct = new Set<VerseId>(resource.verses);
    if (resource.primaryAnchor) direct.add(resource.primaryAnchor);
    for (const verseId of direct) {
      push(touchingByVerse, verseId, resource);
      push(mentioningByVerse, verseId, resource);
    }
    for (const match of resource.body.matchAll(wikiLinkPattern)) {
      try {
        const verseId = normalizeVerseRef(match[1]!);
        if (!direct.has(verseId)) push(mentioningByVerse, verseId, resource);
      } catch {
        // Not a scripture reference; ignore like resourceMentionsVerse does.
      }
    }
  });

  return {
    mentioning: (verseId) => mentioningByVerse.get(verseId) ?? noResources,
    touching: (verseId) => touchingByVerse.get(verseId) ?? noResources,
    mentioningAny: (verseIds) => {
      const hits = new Set<StudyResource>();
      for (const verseId of verseIds) {
        for (const resource of mentioningByVerse.get(verseId) ?? noResources) hits.add(resource);
      }
      return Array.from(hits).sort((a, b) => orderByResource.get(a)! - orderByResource.get(b)!);
    },
  };
}

export function resourcesForBookIntro(resources: StudyResource[], book: string): StudyResource[] {
  return resources.filter((resource) => resource.bookIntro === book);
}
