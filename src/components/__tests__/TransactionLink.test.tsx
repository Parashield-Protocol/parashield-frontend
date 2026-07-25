import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { TransactionLink } from '../TransactionLink';

const TESTNET_URL = 'https://stellar.expert/explorer/testnet/tx/';
const PUBLIC_URL = 'https://stellar.expert/explorer/public/tx/';
const TX_HASH = 'abc123def456789012345678901234567890abcdef1234567890abcdef12345678';

describe('TransactionLink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('links to testnet explorer by default', () => {
    render(<TransactionLink txHash={TX_HASH} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `${TESTNET_URL}${TX_HASH}`);
  });

  it('links to public explorer when STELLAR_NETWORK is PUBLIC', async () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'PUBLIC');
    vi.resetModules();
    const { TransactionLink: PublicLink } = await import('../TransactionLink');
    render(<PublicLink txHash={TX_HASH} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `${PUBLIC_URL}${TX_HASH}`);
  });

  it('has rel="noopener noreferrer"', () => {
    render(<TransactionLink txHash={TX_HASH} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens in a new tab', () => {
    render(<TransactionLink txHash={TX_HASH} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('displays truncated tx hash as default label', () => {
    render(<TransactionLink txHash={TX_HASH} />);
    const expected = `${TX_HASH.slice(0, 8)}\u2026${TX_HASH.slice(-6)}`;
    expect(screen.getByText(expected, { exact: false })).toBeInTheDocument();
  });

  it('displays custom label when provided', () => {
    render(<TransactionLink txHash={TX_HASH} label="View on Explorer" />);
    expect(screen.getByText('View on Explorer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TransactionLink txHash={TX_HASH} className="my-custom-class" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('my-custom-class');
  });
});
