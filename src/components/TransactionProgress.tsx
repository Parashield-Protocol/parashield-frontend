'use client';

import { Check } from 'lucide-react';
import { ButtonSpinner } from './LoadingSpinner';

export interface TransactionStep {
  id:     string;
  /** Short name shown in the step list. */
  label:  string;
  /** Status text shown while this step is the current one. */
  status: string;
}

/** Sentinel for `current` once every step has finished. */
export const TX_COMPLETE = 'complete';

interface TransactionProgressProps {
  steps:          TransactionStep[];
  /** Id of the in-flight step, or TX_COMPLETE. */
  current:        string;
  completeText?:  string;
  className?:     string;
}

/**
 * Step-by-step feedback for multi-stage on-chain operations (purchase, claim)
 * so users can tell a slow step from a stuck one.
 */
export function TransactionProgress({
  steps,
  current,
  completeText = 'Complete!',
  className,
}: TransactionProgressProps) {
  const complete     = current === TX_COMPLETE;
  const currentIndex = complete ? steps.length : Math.max(0, steps.findIndex((s) => s.id === current));
  const statusText   = complete ? completeText : steps[currentIndex]?.status;

  return (
    <div className={`space-y-3 ${className ?? ''}`} data-testid="transaction-progress">
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`text-sm font-medium ${complete ? 'text-emerald-400' : 'text-gray-950 dark:text-white'}`}
      >
        {statusText}
      </p>
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending';
          return (
            <li key={step.id} data-state={state} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  state === 'done'   ? 'bg-teal-500 text-white' :
                  state === 'active' ? 'border-2 border-teal-500' :
                  'border border-gray-300 dark:border-white/10'
                }`}
              >
                {state === 'done' && <Check className="h-3 w-3" />}
                {state === 'active' && <ButtonSpinner className="h-3 w-3 border-teal-500/30 border-t-teal-400" />}
              </span>
              <span
                className={
                  state === 'active' ? 'text-gray-950 dark:text-white' :
                  state === 'done'   ? 'text-gray-500 dark:text-gray-300' :
                  'text-gray-400'
                }
              >
                {step.label}
                <span className="sr-only">
                  {state === 'done' ? ' — completed' : state === 'active' ? ' — in progress' : ' — pending'}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
