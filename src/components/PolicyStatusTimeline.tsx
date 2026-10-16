'use client';

import { useId, useState } from 'react';
import type { Policy } from '@/types';
import { formatDate } from '@/lib/format';

interface PolicyStatusTimelineProps {
  policy: Policy;
  className?: string;
  /**
   * Opt-in collapsed mode (#700): only the current step is rendered until the
   * user expands the timeline. Off by default, so existing callers are unchanged.
   */
  collapsible?: boolean;
  /** Initial state when `collapsible` is set. Defaults to collapsed. */
  defaultCollapsed?: boolean;
}

interface TimelineEvent {
  label: string;
  date: string;
  done: boolean;
  cancelled?: boolean;
}

export function getPolicyTimelineEvents(policy: Policy): TimelineEvent[] {
  const isCancelled = policy.status === 'Cancelled';

  // Merge "Policy purchased" + "Coverage active" into one step since they share
  // the same timestamp (instant activation model — issue #68).
  const events: TimelineEvent[] = [
    {
      label: 'Policy purchased & coverage activated',
      date: formatDate(policy.startTime),
      done: true,
    },
  ];

  if (isCancelled) {
    // Issue #67: show a distinct cancelled terminal step; omit the normal flow steps.
    events.push({
      label: 'Policy cancelled',
      date: (policy as Policy & { cancelledAt?: number }).cancelledAt
        ? formatDate((policy as Policy & { cancelledAt?: number }).cancelledAt!)
        : '',
      done: true,
      cancelled: true,
    });
  } else {
    events.push(
      {
        label: 'Oracle monitoring',
        date: 'Continuous',
        done: policy.status === 'Active' || policy.status === 'Claimed' || policy.status === 'Expired',
      },
      {
        label: policy.status === 'Claimed' ? 'Claim paid out' : 'Policy expires',
        date: formatDate(policy.endTime),
        done: policy.status === 'Claimed' || policy.status === 'Expired',
      },
    );
  }

  return events;
}

/**
 * When the policy's status last changed (#591), in epoch seconds. Prefers the
 * backend's updatedAt, otherwise falls back to the timestamp of the transition
 * that produced the current status. Returns null when that isn't known (a
 * Claimed policy without updatedAt carries no claim-payout time).
 */
export function getPolicyLastUpdated(policy: Policy): number | null {
  if (policy.updatedAt != null) return policy.updatedAt;
  switch (policy.status) {
    case 'Active':    return policy.startTime;
    case 'Expired':   return policy.endTime;
    case 'Cancelled': return policy.cancelledAt ?? null;
    default:          return null;
  }
}

/** Index of the step the policy is currently at: the last completed one. */
export function getCurrentTimelineIndex(events: TimelineEvent[]): number {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].done) return i;
  }
  return 0;
}

export function PolicyStatusTimeline({
  policy,
  className,
  collapsible = false,
  defaultCollapsed = true,
}: PolicyStatusTimelineProps) {
  const events = getPolicyTimelineEvents(policy);
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  const listId = useId();

  const isCollapsed = collapsible && collapsed;
  const currentIndex = getCurrentTimelineIndex(events);
  // When collapsed, only the current step is put in the DOM at all (#700);
  // keep each step's original index so numbering doesn't change.
  const visible = events
    .map((event, i) => ({ event, i }))
    .filter(({ i }) => !isCollapsed || i === currentIndex);

  return (
    <div className={`relative ${className ?? ''}`}>
      {/* The toggle sits above the list, so expanding/collapsing grows or
          shrinks content below it and never shifts it under the cursor. */}
      {collapsible && events.length > 1 && (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!isCollapsed}
          aria-controls={listId}
          className="mb-4 rounded text-xs font-medium text-teal-400 transition-colors hover:text-teal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          {isCollapsed ? `Show all ${events.length} steps` : 'Show current step only'}
        </button>
      )}
      <div className="relative">
        <div className="absolute left-3 top-0 h-full w-px bg-white/10" />
        <ol id={listId} className="space-y-6">
          {visible.map(({ event, i }) => (
            <li
              key={i}
              className={`relative flex items-start gap-4 pl-8 ${
                collapsible ? 'motion-safe:animate-[timelineStepIn_200ms_ease-out]' : ''
              }`}
            >
              <div
                className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  event.cancelled
                    ? 'bg-red-500 text-white'
                    : event.done
                      ? 'bg-teal-500 text-white'
                      : 'border border-white/20 text-gray-400 bg-gray-950'
                }`}
              >
                {event.done ? '✓' : i + 1}
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    event.cancelled
                      ? 'text-red-400'
                      : event.done
                        ? 'text-white'
                        : 'text-gray-400'
                  }`}
                >
                  {event.label}
                </p>
                {event.date && <p className="text-xs text-gray-400">{event.date}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
