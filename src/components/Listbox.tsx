'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

export interface ListboxOption<T extends string> {
  value: T;
  label: string;
}

interface ListboxProps<T extends string> {
  value:      T;
  options:    readonly ListboxOption<T>[];
  onChange:   (value: T) => void;
  /** Accessible name for the control (there is no visible label). */
  label:      string;
  className?: string;
}

/**
 * Custom dropdown following the WAI-ARIA "select-only combobox" pattern.
 * Focus stays on the trigger button the whole time; the highlighted option is
 * announced through aria-activedescendant.
 *
 * Closed: ArrowDown / ArrowUp / Enter / Space open it, Home / End open it on
 *         the first / last option.
 * Open:   ArrowDown / ArrowUp move, Home / End jump, Enter / Space select,
 *         Escape closes without changing the value, Tab closes, and typing a
 *         character jumps to the next option starting with it.
 */
export function Listbox<T extends string>({ value, options, onChange, label, className }: ListboxProps<T>) {
  const id = useId();
  const listId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const openAt = useCallback((index: number) => {
    setActiveIndex(index);
    setOpen(true);
  }, []);

  const commit = useCallback((index: number) => {
    setOpen(false);
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
  }, [options, value, onChange]);

  // Close on a click anywhere outside the control.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keep the highlighted option visible in a scrolled list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(activeIndex))}`);
    el?.scrollIntoView?.({ block: 'nearest' });
    // optionId is derived from the stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  function typeahead(char: string) {
    const lower = char.toLowerCase();
    for (let step = 1; step <= options.length; step++) {
      const index = (activeIndex + step) % options.length;
      if (options[index].label.toLowerCase().startsWith(lower)) return index;
    }
    return null;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;

    if (!open) {
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowUp':
        case 'Enter':
        case ' ':
          e.preventDefault();
          openAt(selectedIndex);
          return;
        case 'Home':
          e.preventDefault();
          openAt(0);
          return;
        case 'End':
          e.preventDefault();
          openAt(last);
          return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(last, i + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        return;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        return;
      case 'End':
        e.preventDefault();
        setActiveIndex(last);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeIndex);
        return;
      case 'Escape':
        // Stop it reaching document-level Escape handlers (e.g. a parent modal).
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        return;
      case 'Tab':
        setOpen(false);
        return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const match = typeahead(e.key);
      if (match !== null) setActiveIndex(match);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(activeIndex) : undefined}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
      >
        <span>{options[selectedIndex]?.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open}
        className="absolute right-0 z-30 mt-1 max-h-64 min-w-full overflow-auto rounded-xl border border-white/10 bg-gray-900 py-1 shadow-xl"
      >
        {options.map((option, i) => (
          <li
            key={option.value}
            id={optionId(i)}
            role="option"
            aria-selected={option.value === value}
            // Keep focus on the trigger when clicking an option.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit(i)}
            onMouseEnter={() => setActiveIndex(i)}
            className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm ${
              i === activeIndex ? 'bg-white/[0.08] text-white' : 'text-gray-300'
            } ${option.value === value ? 'font-semibold text-teal-400' : ''}`}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
