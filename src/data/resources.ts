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

export function mergeStableAndWorkbenchResources(
  stableResources: StudyResource[],
  workbenchResources: StudyResource[],
  excludedResourceIds: string[],
): StudyResource[] {
  const excludedResourceIdSet = new Set(excludedResourceIds);
  const visibleStableResources = stableResources.filter((resource) => !excludedResourceIdSet.has(resource.id));
  return mergeResourcesById(visibleStableResources, workbenchResources);
}
