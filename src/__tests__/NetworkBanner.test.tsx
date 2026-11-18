import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

async function renderBannerWithNetwork(network: string | undefined) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', network as string);
  const { NetworkBanner } = await import('../components/NetworkBanner');
  return renderToStaticMarkup(<NetworkBanner />);
}

describe('NetworkBanner', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('renders the testnet warning when the network is not PUBLIC', async () => {
    const html = await renderBannerWithNetwork('TESTNET');
    expect(html).toContain('Stellar Testnet');
    expect(html).toContain('Do not use real funds');
  });

  it('is hidden when the network is PUBLIC', async () => {
    const html = await renderBannerWithNetwork('PUBLIC');
    expect(html).toBe('');
  });

  it('defaults to showing the banner when no network env var is set', async () => {
    const html = await renderBannerWithNetwork(undefined);
    expect(html).toContain('Stellar Testnet');
  });
});
