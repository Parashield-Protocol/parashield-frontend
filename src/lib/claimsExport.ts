import type { Claim } from '@/types';
import { formatUSDC, formatDateTime } from '@/lib/format';

const CSV_HEADERS = [
  'Claim ID',
  'Policy ID',
  'Status',
  'Trigger Met',
  'Payout Amount',
  'Submitted',
  'Processed',
  'Transaction Hash',
];

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function claimToRow(claim: Claim): string[] {
  return [
    claim.id,
    claim.policyId,
    claim.status,
    claim.triggerMet ? 'Yes' : 'No',
    claim.payoutAmount ? formatUSDC(claim.payoutAmount) : '',
    formatDateTime(claim.submittedAt),
    claim.processedAt ? formatDateTime(claim.processedAt) : '',
    claim.txHash ?? '',
  ];
}

export function claimsToCSV(claims: Claim[]): string {
  const rows = [CSV_HEADERS.map(escapeCSV).join(',')];
  for (const claim of claims) {
    rows.push(claimToRow(claim).map(escapeCSV).join(','));
  }
  return rows.join('\n');
}

export function claimsToJSON(claims: Claim[]): string {
  return JSON.stringify(
    claims.map((c) => ({
      claimId: c.id,
      policyId: c.policyId,
      status: c.status,
      triggerMet: c.triggerMet,
      payoutAmount: c.payoutAmount ? formatUSDC(c.payoutAmount) : null,
      submittedAt: formatDateTime(c.submittedAt),
      processedAt: c.processedAt ? formatDateTime(c.processedAt) : null,
      txHash: c.txHash ?? null,
    })),
    null,
    2,
  );
}

function download(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadClaimsCSV(claims: Claim[]) {
  const timestamp = new Date().toISOString().slice(0, 10);
  download(claimsToCSV(claims), `parashield-claims-${timestamp}.csv`, 'text/csv');
}

export function downloadClaimsJSON(claims: Claim[]) {
  const timestamp = new Date().toISOString().slice(0, 10);
  download(claimsToJSON(claims), `parashield-claims-${timestamp}.json`, 'application/json');
}
