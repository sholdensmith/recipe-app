/**
 * Recipe extraction from web pages.
 *
 * Most recipe sites embed a schema.org Recipe as JSON-LD, so we can usually
 * import without an AI call. The API route falls back to Claude when a page
 * has no usable structured data.
 */

import type { ParsedRecipe } from './ai/parse-recipe';
import { parsedRecipeSchema } from './validation';

/** Converts an ISO-8601 duration ("PT1H30M") to whole minutes. */
export function isoDurationToMinutes(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!match) return undefined;
  const [, days, hours, minutes, seconds] = match;
  const total =
    (Number(days) || 0) * 24 * 60 +
    (Number(hours) || 0) * 60 +
    (Number(minutes) || 0) +
    (Number(seconds) || 0) / 60;
  const rounded = Math.round(total);
  return rounded > 0 ? rounded : undefined;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  deg: '°',
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z0-9]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/** Crude but effective HTML → plain text for the AI fallback path. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const text = decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    return text || undefined;
  }
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return asText(value[0]);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return asText(obj.name ?? obj.text ?? obj['@value']);
  }
  return undefined;
}

function typeMatches(node: Record<string, unknown>, type: string): boolean {
  const t = node['@type'];
  if (typeof t === 'string') return t.toLowerCase() === type.toLowerCase();
  if (Array.isArray(t)) return t.some((x) => typeof x === 'string' && x.toLowerCase() === type.toLowerCase());
  return false;
}

/** Depth-first search for the first schema.org Recipe node in a JSON-LD value. */
export function findRecipeNode(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || !value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const node = value as Record<string, unknown>;
  if (typeMatches(node, 'Recipe')) return node;
  if (node['@graph']) return findRecipeNode(node['@graph'], depth + 1);
  return null;
}

function extractInstructions(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === 'string') {
    // A single blob of text: split on newlines or numbered steps
    return value
      .split(/\n+|(?<=\.)\s+(?=\d+[.)]\s)/)
      .map((s) => asText(s) ?? '')
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractInstructions(item, depth + 1));
  }
  if (typeof value === 'object') {
    const node = value as Record<string, unknown>;
    if (typeMatches(node, 'HowToSection')) {
      const heading = asText(node.name);
      const steps = extractInstructions(node.itemListElement, depth + 1);
      return heading ? [`${heading}:`, ...steps] : steps;
    }
    const text = asText(node.text ?? node.name);
    return text ? [text] : [];
  }
  return [];
}

function extractImageUrl(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return extractImageUrl(value[0]);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url;
  }
  return undefined;
}

export interface ExtractedRecipe extends ParsedRecipe {
  image_url?: string;
  author?: string;
}

/**
 * Extracts a recipe from a page's JSON-LD blocks.
 * Returns null when no valid schema.org Recipe is present.
 */
export function extractRecipeFromJsonLd(html: string): ExtractedRecipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const node = findRecipeNode(data);
    if (!node) continue;

    const ingredients = (Array.isArray(node.recipeIngredient)
      ? node.recipeIngredient
      : Array.isArray(node.ingredients)
        ? node.ingredients
        : []
    )
      .map((i: unknown) => asText(i) ?? '')
      .filter(Boolean);

    const instructions = extractInstructions(node.recipeInstructions);

    const candidate = {
      name: asText(node.name) ?? '',
      description: asText(node.description),
      prep_time: isoDurationToMinutes(node.prepTime),
      cook_time: isoDurationToMinutes(node.cookTime),
      total_time: isoDurationToMinutes(node.totalTime),
      servings: asText(node.recipeYield),
      recipe_category: asText(node.recipeCategory)?.toLowerCase(),
      recipe_cuisine: asText(node.recipeCuisine),
      ingredients,
      instructions,
    };

    const result = parsedRecipeSchema.safeParse(candidate);
    if (!result.success) continue;

    return {
      ...result.data,
      image_url: extractImageUrl(node.image),
      author: asText(node.author),
    };
  }

  return null;
}

/** Blocks obvious SSRF targets; the fetch happens server-side. */
export function isAllowedImportUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  // Literal IPv4 in private/reserved ranges, or any IPv6 literal
  if (host.includes(':')) return false;
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) {
      return false;
    }
  }
  return true;
}
