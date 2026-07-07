/**
 * Client-side ingredient scaling.
 *
 * Scales the leading quantity of an ingredient line ("2 1/4 cups flour",
 * "½ tsp salt", "2-3 cloves garlic") by a factor, formatting results as
 * kitchen-friendly fractions. Lines with no leading quantity pass through
 * unchanged.
 */

const UNICODE_FRACTIONS: Record<string, number> = {
  '¼': 1 / 4,
  '½': 1 / 2,
  '¾': 3 / 4,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('');

// One quantity: "1 1/2", "1½", "1/2", "½", "1.5", "2"
const QTY = `(?:\\d+\\s+\\d+\\s*\\/\\s*\\d+|\\d+\\s*[${FRACTION_CHARS}]|\\d+\\s*\\/\\s*\\d+|[${FRACTION_CHARS}]|\\d*\\.\\d+|\\d+)`;

// Leading quantity, optionally a range ("2-3", "2 to 3")
const LEADING_QTY_RE = new RegExp(`^\\s*(${QTY})(\\s*(?:-|–|—|to)\\s*)?(${QTY})?`);

export function parseQuantity(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;

  // "1 1/2" or "1/2"
  const fractionMatch = text.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const whole = Number(fractionMatch[1] ?? 0);
    const denominator = Number(fractionMatch[3]);
    if (denominator === 0) return null;
    return whole + Number(fractionMatch[2]) / denominator;
  }

  // "1½" or "½"
  const unicodeMatch = text.match(new RegExp(`^(?:(\\d+)\\s*)?([${FRACTION_CHARS}])$`));
  if (unicodeMatch) {
    return Number(unicodeMatch[1] ?? 0) + UNICODE_FRACTIONS[unicodeMatch[2]];
  }

  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Formats a number as a kitchen-friendly quantity ("1 1/2", "3/4", "2"). */
export function formatQuantity(value: number): string {
  if (value <= 0) return '0';

  const whole = Math.floor(value);
  const frac = value - whole;

  // Close enough to a whole number
  if (frac < 0.03 || frac > 0.97) {
    return String(Math.round(value));
  }

  const candidates: Array<[number, string]> = [
    [1 / 8, '1/8'],
    [1 / 6, '1/6'],
    [1 / 4, '1/4'],
    [1 / 3, '1/3'],
    [3 / 8, '3/8'],
    [1 / 2, '1/2'],
    [5 / 8, '5/8'],
    [2 / 3, '2/3'],
    [3 / 4, '3/4'],
    [7 / 8, '7/8'],
  ];

  let best: [number, string] | null = null;
  for (const candidate of candidates) {
    if (!best || Math.abs(candidate[0] - frac) < Math.abs(best[0] - frac)) {
      best = candidate;
    }
  }

  if (best && Math.abs(best[0] - frac) < 0.04) {
    return whole > 0 ? `${whole} ${best[1]}` : best[1];
  }

  // No nice fraction — fall back to a trimmed decimal
  return String(Math.round(value * 100) / 100);
}

export function scaleIngredient(line: string, factor: number): string {
  if (factor === 1) return line;

  const match = line.match(LEADING_QTY_RE);
  if (!match || !match[1]) return line;

  const first = parseQuantity(match[1]);
  if (first == null) return line;

  let replacement = formatQuantity(first * factor);
  let consumed = match[1];

  const second = match[3] ? parseQuantity(match[3]) : null;
  if (match[3] && second != null) {
    replacement += `${match[2] ?? '-'}${formatQuantity(second * factor)}`;
    consumed = match[0].trimStart();
  }

  const leadingWhitespace = match[0].length - match[0].trimStart().length;
  return (
    line.slice(0, leadingWhitespace) +
    replacement +
    line.slice(leadingWhitespace + consumed.length)
  );
}
