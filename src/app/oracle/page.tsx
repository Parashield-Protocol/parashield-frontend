'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { useAllOracleReadings } from '@/hooks/useOracle';
import { SkeletonTable } from '@/components/Skeleton';
import { Badge } from '@/components/Badge';
import { formatOracleValue, formatDateTime } from '@/lib/format';
import { oracleKeyLabel, confidenceLabel, confidenceColour, confidenceIcon } from '@/lib/oracle';

const PAGE_SIZE = 50;

export default function OraclePage() {
  const { readings, loading, error, refetch } = useAllOracleReadings();
  const lastSuccessRef = useRef<Date | null>(null);
  if (!error && readings.length > 0) lastSuccessRef.current = new Date();
  const isStale = error !== null && readings.length > 0;

  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(readings.length / PAGE_SIZE);
  const tableEndRef = useRef<HTMLDivElement>(null);
  const prevReadingsLen = useRef(readings.length);

  // Sort by timestamp descending (newest first)
  const sortedReadings = useMemo(
    () => [...readings].sort((a, b) => b.timestamp - a.timestamp),
    [readings],
  );

  const paginatedReadings = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedReadings.slice(start, start + PAGE_SIZE);
  }, [sortedReadings, page]);

  // Auto-scroll to newest readings when data updates
  useEffect(() => {
    if (readings.length > prevReadingsLen.current) {
      setPage(0);
      if (tableEndRef.current) {
        tableEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    prevReadingsLen.current = readings.length;
  }, [readings.length]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Oracle Status</h1>
          <p className="mt-1 text-sm text-gray-400">
            Live data feeds from Open-Meteo, AviationStack, and on-chain monitors
          </p>
        </div>
        <button
          onClick={refetch}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:border-white/20 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && readings.length === 0 && (
        <div className="mt-8">
          <SkeletonTable rows={5} />
        </div>
      )}

      {error && (
        <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
          <p>{error}</p>
          {isStale && lastSuccessRef.current && (
            <p className="mt-2 text-xs text-red-300">
              Showing data last updated {formatDateTime(Math.floor(lastSuccessRef.current.getTime() / 1000))} — refresh failed.
            </p>
          )}
        </div>
      )}

      {!loading && !error && readings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-gray-400">
          No oracle readings available. The oracle worker may not have run yet.
        </div>
      )}

      {readings.length > 0 && (
        <div className={`mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="p-4">Key</th>
                <th className="p-4">Type</th>
                <th className="p-4">Value</th>
                <th className="p-4">Confidence</th>
                <th className="p-4">Source</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReadings.map((r) => (
                <tr key={r.key} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4 font-mono text-xs text-gray-300 max-w-[200px] truncate">
                    {oracleKeyLabel(r.key)}
                  </td>
                  <td className="p-4">
                    <Badge label={r.dataType} variant="teal" />
                  </td>
                  <td className="p-4 font-semibold text-white">
                    {formatOracleValue(r.value, r.dataType)}
                  </td>
                  <td className={`p-4 text-xs font-semibold ${confidenceColour(r.confidence)}`}>
                    <span aria-hidden="true">{confidenceIcon(r.confidence)}</span> {r.confidence}% · {confidenceLabel(r.confidence)}
                  </td>
                  <td className="p-4 text-xs text-gray-400">{r.source}</td>
                  <td className="p-4 text-xs text-gray-400">{formatDateTime(r.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={tableEndRef} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <p className="text-xs text-gray-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, readings.length)} of {readings.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 text-sm font-semibold text-white">Data Sources</h2>
        <ul className="space-y-2 text-sm text-gray-400">
          <li><span className="font-mono text-teal-400">open-meteo</span> — Free weather API. Rainfall and temperature for any lat/lng. Updated hourly.</li>
          <li><span className="font-mono text-teal-400">aviationstack</span> — Flight delay data. Keyed by flight number and departure date.</li>
          <li><span className="font-mono text-teal-400">on-chain</span> — Stellar network events. DeFi exploit flags submitted by protocol monitors.</li>
        </ul>
      </div>
    </main>
  );
}
