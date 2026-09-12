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
 *   same picture. The workbench card is the editable source of truth, so its stable twin is
 *   dropped while the workbench card is present; if the workbench card is unsynced or
 *   excluded, the stable twin shows again as a fallback.
 */
export function mergeStableAndWorkbenchResources(
  stableResources: StudyResource[],
  workbenchResources: StudyResource[],
  excludedResourceIds: string[],
  workbenchTwinsOfStable: Readonly<Record<string, string>> = {},
): StudyResource[] {
  const excludedResourceIdSet = new Set(excludedResourceIds);
  const supersededStableIds = new Set(
    workbenchResources
      .map((resource) => workbenchTwinsOfStable[resource.id])
      .filter((stableId): stableId is string => stableId !== undefined),
  );
  const visibleStableResources = stableResources.filter((resource) => (
    !excludedResourceIdSet.has(resource.id) && !supersededStableIds.has(resource.id)
  ));
  return mergeResourcesById(visibleStableResources, workbenchResources);
}
