const sentenceEndPattern = /[。！？；…」』”）】〉》]$/;
const bulletSectionPattern = /(?<=\S)\s*[•·]\s*/g;

function isCjkChar(char: string | undefined) {
  if (!char) return false;
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(char);
}

function joinSoftWrappedParagraphs(body: string) {
  const parts = body
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.replace(/\n+/g, "").trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  const merged: string[] = [parts[0]!];

  for (let index = 1; index < parts.length; index += 1) {
    const previous = merged[merged.length - 1]!;
    const next = parts[index]!;

    if (sentenceEndPattern.test(previous)) {
      merged.push(next);
      continue;
    }

    const previousLast = previous[previous.length - 1];
    const nextFirst = next[0];
    const needsSpace =
      Boolean(previousLast) &&
      Boolean(nextFirst) &&
      !isCjkChar(previousLast) &&
      !isCjkChar(nextFirst) &&
      previousLast !== " " &&
      nextFirst !== " ";

    merged[merged.length - 1] = needsSpace ? `${previous} ${next}` : `${previous}${next}`;
  }

  return merged.join("\n\n");
}

function separateBulletSections(body: string) {
  const normalized = body
    .replace(bulletSectionPattern, "\n\n• ")
    .replace(/^\s*[•·]\s*/, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function formatTextResourceBody(body: string) {
  if (!body.trim()) {
    return "";
  }

  return separateBulletSections(joinSoftWrappedParagraphs(body));
}
