'use client';

import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useAllOracleReadings } from '@/hooks/useOracle';
import { SkeletonTable } from '@/components/Skeleton';
import { Badge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatOracleValue, formatDateTime } from '@/lib/format';
import { oracleKeyLabel, confidenceLabel, confidenceColour, confidenceIcon } from '@/lib/oracle';

const PAGE_SIZE = 50;
const SCROLL_THRESHOLD = 200;

type DataTypeFilter = 'all' | 'weather' | 'flight' | 'defi';
type SortKey = 'timestamp' | 'confidence' | 'dataType';

const DATA_TYPES: DataTypeFilter[] = ['all', 'weather', 'flight', 'defi'];

export default function OraclePage() {
  const { readings, loading, error, refetch } = useAllOracleReadings();
  const lastSuccessRef = useRef<Date | null>(null);
  const isStale = error !== null && readings.length > 0;
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!error && readings.length > 0) {
      lastSuccessRef.current = new Date();
    }
  }, [readings, error]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const [displayedItems, setDisplayedItems] = useState(PAGE_SIZE);
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortAsc, setSortAsc] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const tableEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }, [sortKey]);

  const filteredReadings = useMemo(() => {
    let result = readings;
    if (dataTypeFilter !== 'all') {
      result = result.filter((r) => r.dataType === dataTypeFilter);
    }
    const dir = sortAsc ? 1 : -1;
    return [...result].sort((a, b) => {
      switch (sortKey) {
        case 'timestamp':
          return (a.timestamp - b.timestamp) * dir;
        case 'confidence':
          return (a.confidence - b.confidence) * dir;
        case 'dataType':
          return a.dataType.localeCompare(b.dataType) * dir;
        default:
          return 0;
      }
    });
  }, [readings, dataTypeFilter, sortKey, sortAsc]);

  const displayedReadings = useMemo(() => {
    return filteredReadings.slice(0, displayedItems);
  }, [filteredReadings, displayedItems]);

  const hasMore = displayedItems < filteredReadings.length;

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortAsc ? ' ↑' : ' ↓';
  };

  // Reset displayed items when filter changes
  useEffect(() => {
    setDisplayedItems(PAGE_SIZE);
  }, [dataTypeFilter]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setLoadingMore(true);
          setTimeout(() => {
            setDisplayedItems((prev) => Math.min(prev + PAGE_SIZE, filteredReadings.length));
            setLoadingMore(false);
          }, 300);
        }
      },
      { rootMargin: `${SCROLL_THRESHOLD}px` }
    );

    if (tableEndRef.current) {
      observer.observe(tableEndRef.current);
    }

    observerRef.current = observer;
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, filteredReadings.length]);

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
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:border-white/20 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {refreshing ? <LoadingSpinner size="sm" /> : null}
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

      {!loading && !error && readings.length > 0 && filteredReadings.length === 0 && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-gray-400">
          No readings match the selected filter.
        </div>
      )}

      {readings.length > 0 && (
        <>
          {/* Filter pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {DATA_TYPES.map((dt) => (
              <button
                key={dt}
                onClick={() => setDataTypeFilter(dt)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  dataTypeFilter === dt
                    ? 'bg-teal-500 text-white'
                    : 'border border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {dt === 'all' ? 'All types' : dt.charAt(0).toUpperCase() + dt.slice(1)}
              </button>
            ))}
          </div>

          <div className={`mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-400">
                <th className="p-4">Key</th>
                <th className="p-4">
                  <button
                    type="button"
                    onClick={() => handleSort('dataType')}
                    className={`inline-flex items-center gap-1 transition-colors hover:text-white ${sortKey === 'dataType' ? 'text-white' : ''}`}
                  >
                    Type{sortIndicator('dataType')}
                  </button>
                </th>
                <th className="p-4">Value</th>
                <th className="p-4">
                  <button
                    type="button"
                    onClick={() => handleSort('confidence')}
                    className={`inline-flex items-center gap-1 transition-colors hover:text-white ${sortKey === 'confidence' ? 'text-white' : ''}`}
                  >
                    Confidence{sortIndicator('confidence')}
                  </button>
                </th>
                <th className="p-4">Source</th>
                <th className="p-4">
                  <button
                    type="button"
                    onClick={() => handleSort('timestamp')}
                    className={`inline-flex items-center gap-1 transition-colors hover:text-white ${sortKey === 'timestamp' ? 'text-white' : ''}`}
                  >
                    Timestamp{sortIndicator('timestamp')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedReadings.map((r) => (
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
          {loadingMore && (
            <div className="flex items-center justify-center border-t border-white/10 px-4 py-4">
              <LoadingSpinner size="sm" />
            </div>
          )}
          <div ref={tableEndRef} />
          {!hasMore && displayedReadings.length > 0 && (
            <div className="border-t border-white/10 px-4 py-3 text-center text-xs text-gray-400">
              Showing all {filteredReadings.length} readings
            </div>
          )}
        </div>
        </>
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
