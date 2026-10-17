/**
 * Helpers for reading untrusted URL query params.
 *
 * Query params come straight from a (possibly attacker-crafted) URL, so they
 * must be validated before they reach component state. Rendering still goes
 * through React's text escaping — never pass these values to
 * dangerouslySetInnerHTML, href, or inline event handlers.
 */

export const MAX_SEARCH_QUERY_LENGTH = 100;
export const MAX_PAGE_PARAM = 10_000;

// C0/C1 control characters, plus bidi overrides and zero-width chars that can
// be used to visually spoof rendered text.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Returns `value` only if it is one of `allowed`, otherwise `fallback`. */
export function parseEnumParam<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value != null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Parses a zero-based page index; anything that isn't a sane non-negative integer becomes 0. */
export function parsePageParam(value: string | null | undefined, max = MAX_PAGE_PARAM): number {
  if (value == null || !/^\d{1,6}$/.test(value)) return 0;
  const n = Number(value);
  return n <= max ? n : 0;
}

/** Strips control/invisible characters, trims, and caps the length of a free-text search param. */
export function sanitizeSearchParam(
  value: string | null | undefined,
  maxLength = MAX_SEARCH_QUERY_LENGTH,
): string {
  if (!value) return '';
  return value.replace(UNSAFE_CHARS, '').trim().slice(0, maxLength);
}

/**
 * Serialises data for an inline <script type="application/ld+json"> block.
 * JSON.stringify alone does not escape `<`, so a value containing
 * `</script>` would close the tag and let following markup execute.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
