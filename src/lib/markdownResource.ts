import matter from "gray-matter";
import type { ResourceType, StudyResource } from "../domain/resources";
import type { VerseId } from "../domain/verse";

interface ResourceFrontmatter {
  id?: string;
  title?: string;
  type?: ResourceType;
  verses?: VerseId[];
  source?: string;
  assetPath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function parseMarkdownResource(markdown: string, path?: string): StudyResource {
  const parsed = matter(markdown);
  const data = parsed.data as ResourceFrontmatter;

  if (!data.id || !data.title || !data.type) {
    throw new Error("Markdown resource requires id, title, and type frontmatter.");
  }

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    verses: data.verses ?? [],
    source: data.source,
    assetPath: data.assetPath,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    path,
    body: parsed.content.trim(),
  };
}

export function serializeMarkdownResource(resource: StudyResource): string {
  const { body, path: _path, ...frontmatter } = resource;
  const cleanFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).filter(([, value]) => value !== undefined),
  );
  return matter.stringify(`${body.trim()}\n`, cleanFrontmatter);
}
