import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export const alt = 'Parashield — Parametric Insurance on Stellar';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #030712, #0f172a, #022c22)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90px',
            height: '90px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
            marginRight: '28px',
            boxShadow: '0 10px 15px -3px rgba(13, 148, 136, 0.3)',
          }}>
            <svg
              width="54"
              height="54"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ fontSize: '84px', fontWeight: 'bold', letterSpacing: '-0.05em', fontFamily: 'sans-serif' }}>
            <span style={{ color: '#2dd4bf' }}>Para</span>
            <span style={{ color: '#ffffff' }}>shield</span>
          </span>
        </div>
        <p style={{
          fontSize: '36px',
          color: '#9ca3af',
          textAlign: 'center',
          maxWidth: '900px',
          lineHeight: '1.4',
          margin: '0',
          fontWeight: '500',
          fontFamily: 'sans-serif',
        }}>
          Parametric insurance on Stellar. Pay out in seconds, not weeks.
        </p>
      </div>
    ),
    {
      ...size,
    }
  );
}
