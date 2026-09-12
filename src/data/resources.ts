import type { StudyResource } from "../domain/resources";

export function mergeResourcesById(...resourceGroups: StudyResource[][]): StudyResource[] {
  const resourcesById = new Map<string, StudyResource>();

  for (const resources of resourceGroups) {
    for (const resource of resources) {
      resourcesById.set(resource.id, resource);
    }
  }

  return Array.from(resourcesById.values());
}

/**
 * @param workbenchTwinsOfStable workbench resource id → stable resource id that carries the
 *   same picture. A workbench twin is dropped while its stable card is visible, so the same
 *   image is never shown twice; once the stable card is excluded the twin takes its place.
 */
export function mergeStableAndWorkbenchResources(
  stableResources: StudyResource[],
  workbenchResources: StudyResource[],
  excludedResourceIds: string[],
  workbenchTwinsOfStable: Readonly<Record<string, string>> = {},
): StudyResource[] {
  const excludedResourceIdSet = new Set(excludedResourceIds);
  const visibleStableResources = stableResources.filter((resource) => !excludedResourceIdSet.has(resource.id));
  const visibleStableIds = new Set(visibleStableResources.map((resource) => resource.id));
  const dedupedWorkbenchResources = workbenchResources.filter((resource) => {
    const stableTwinId = workbenchTwinsOfStable[resource.id];
    return stableTwinId === undefined || !visibleStableIds.has(stableTwinId);
  });
  return mergeResourcesById(visibleStableResources, dedupedWorkbenchResources);
}
