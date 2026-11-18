import { ImageResponse } from 'next/og';

/**
 * Square PWA icons (#897). The manifest used to point both its 192x192 and
 * 512x512 entries at `parashield-logo-dark.png`, a 1680x600 wordmark — wrong
 * size and wrong aspect ratio for either. These render the same "PS" tile as
 * `app/apple-icon.tsx`, at exactly the size each manifest entry declares.
 */
export const PWA_ICON_SIZES = [192, 512] as const;
export type PwaIconSize = (typeof PWA_ICON_SIZES)[number];

export function pwaIconPath(size: PwaIconSize): string {
  return `/pwa-icon-${size}.png`;
}

export function renderPwaIcon(size: PwaIconSize): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: Math.round(size * 0.2),
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: Math.round(size * 0.44),
            fontWeight: 700,
            letterSpacing: -2,
          }}
        >
          PS
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
