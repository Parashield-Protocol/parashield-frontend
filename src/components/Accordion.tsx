'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Expandable section (#781). The toggle is a real <button>, so Tab focuses it
 * and Enter/Space activate it natively, and it reports its state through
 * aria-expanded/aria-controls. Use this instead of a clickable <div>.
 */
export function Accordion({ title, children, defaultOpen = false, className }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  return (
    <div className={className}>
      <h3>
        <button
          type="button"
          id={buttonId}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 rounded-lg py-3 text-left text-sm font-semibold text-gray-950 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        >
          {title}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h3>
      {/* Always rendered (hidden when closed) so aria-controls never points at
          a missing element (same reasoning as NavBar's mobile menu, #692). */}
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="pb-3">
        {children}
      </div>
    </div>
  );
}
