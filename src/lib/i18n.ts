/**
 * Document locale for the <html lang> attribute (#807).
 * Resolved per-request from Accept-Language so screen readers pronounce
 * localized content correctly; falls back to the app's default language.
 */
export const DEFAULT_LOCALE = 'en';

export function resolveLocale(acceptLanguage: string | null | undefined): string {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const primary = acceptLanguage.split(',')[0]?.trim().split(';')[0];
  return primary || DEFAULT_LOCALE;
}
