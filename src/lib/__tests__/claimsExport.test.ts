import { describe, expect, it } from 'vitest';
import type { Claim } from '@/types';
import { claimsToCSV, escapeCSV } from '../claimsExport';

describe('escapeCSV formula injection (#901)', () => {
  it.each(['=HYPERLINK("http://evil","x")', '+1+1', '-2+3', '@SUM(A1)', '\t=1', '\r=1'])(
    'neutralises a cell starting with a formula character: %j',
    (value) => {
      const out = escapeCSV(value);
      const unquoted = out.startsWith('"') ? out.slice(1) : out;
      expect(unquoted.startsWith("'")).toBe(true);
    },
  );

  it('still quotes after prefixing when the value needs quoting', () => {
    expect(escapeCSV('=A1,B1')).toBe(`"'=A1,B1"`);
    expect(escapeCSV('=say "hi"')).toBe(`"'=say ""hi"""`);
  });

  it('leaves ordinary values unchanged', () => {
    expect(escapeCSV('claim-123')).toBe('claim-123');
    expect(escapeCSV('Approved')).toBe('Approved');
    expect(escapeCSV('a,b')).toBe('"a,b"');
  });

  it('neutralises a malicious id in a full export', () => {
    const claim = {
      id: '=HYPERLINK("http://evil.example","open")',
      policyId: 'policy-1',
      status: 'Pending',
      triggerMet: false,
      payoutAmount: null,
      submittedAt: '2026-01-01T00:00:00Z',
      processedAt: null,
      txHash: null,
    } as unknown as Claim;

    const [, row] = claimsToCSV([claim]).split('\n');
    expect(row.startsWith(`"'=HYPERLINK(`)).toBe(true);
  });
});
