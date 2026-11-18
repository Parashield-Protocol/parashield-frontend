import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Listbox } from '../components/Listbox';

const OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'amount-high', label: 'Highest Amount' },
  { value: 'expiry', label: 'Expiring Soon' },
] as const;
type Value = (typeof OPTIONS)[number]['value'];

function Harness({ onChange = vi.fn() }: { onChange?: (v: Value) => void }) {
  const [value, setValue] = useState<Value>('newest');
  return (
    <Listbox
      value={value}
      options={OPTIONS}
      onChange={(v) => { setValue(v); onChange(v); }}
      label="Sort policies"
    />
  );
}

function setup() {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  const combobox = screen.getByRole('combobox', { name: 'Sort policies' });
  const key = (k: string) => fireEvent.keyDown(combobox, { key: k });
  const active = () => {
    const id = combobox.getAttribute('aria-activedescendant');
    return id ? document.getElementById(id)?.textContent : null;
  };
  return { combobox, key, active, onChange };
}

describe('Listbox keyboard pattern', () => {
  it('opens with ArrowDown on the selected option and exposes listbox semantics', () => {
    const { combobox, key, active } = setup();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveAttribute('aria-haspopup', 'listbox');

    key('ArrowDown');
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeVisible();
    expect(active()).toBe('Newest First');
    expect(screen.getByRole('option', { name: 'Newest First' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves with ArrowUp/ArrowDown and jumps with Home/End', () => {
    const { key, active } = setup();
    key('ArrowDown');
    key('ArrowDown');
    expect(active()).toBe('Oldest First');
    key('End');
    expect(active()).toBe('Expiring Soon');
    key('ArrowDown'); // clamps at the end
    expect(active()).toBe('Expiring Soon');
    key('ArrowUp');
    expect(active()).toBe('Highest Amount');
    key('Home');
    expect(active()).toBe('Newest First');
  });

  it('opens on the first / last option with Home / End while closed', () => {
    const { key, active } = setup();
    key('End');
    expect(active()).toBe('Expiring Soon');
    key('Escape');
    key('Home');
    expect(active()).toBe('Newest First');
  });

  it('selects with Enter and closes', () => {
    const { combobox, key, onChange } = setup();
    key('ArrowDown');
    key('ArrowDown');
    key('Enter');
    expect(onChange).toHaveBeenCalledWith('oldest');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(combobox).toHaveTextContent('Oldest First');
  });

  it('Escape closes without changing the value', () => {
    const { combobox, key, onChange } = setup();
    key('ArrowDown');
    key('End');
    key('Escape');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(onChange).not.toHaveBeenCalled();
    expect(combobox).toHaveTextContent('Newest First');
  });

  it('jumps to an option by typing its first letter', () => {
    const { key, active } = setup();
    key('ArrowDown');
    key('h');
    expect(active()).toBe('Highest Amount');
  });

  it('still works with the mouse', () => {
    const { combobox, onChange } = setup();
    fireEvent.click(combobox);
    fireEvent.click(screen.getByRole('option', { name: 'Expiring Soon' }));
    expect(onChange).toHaveBeenCalledWith('expiry');
  });
});
