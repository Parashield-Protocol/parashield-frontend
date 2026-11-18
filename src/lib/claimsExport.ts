import type { Claim } from '@/types';
import { formatUSDC, formatDateTime, toDateInputValue } from '@/lib/format';

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

/**
 * Cells starting with one of these are evaluated as formulas by Excel, Google
 * Sheets and LibreOffice (OWASP "CSV injection"), so `=HYPERLINK(...)` in a
 * claim or policy id would run when the export is opened (#901). Tab and
 * carriage return are included because spreadsheets strip them before
 * checking for a formula prefix.
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCSV(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe.includes('\r')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
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
  const timestamp = toDateInputValue();
  download(claimsToCSV(claims), `parashield-claims-${timestamp}.csv`, 'text/csv');
}

export function downloadClaimsJSON(claims: Claim[]) {
  const timestamp = toDateInputValue();
  download(claimsToJSON(claims), `parashield-claims-${timestamp}.json`, 'application/json');
}
