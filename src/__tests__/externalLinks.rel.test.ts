import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// #707: belt-and-braces with the react/jsx-no-target-blank lint rule. Every
// JSX element in src/ that opens a new tab must also cut window.opener.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

describe('target="_blank" links (#707)', () => {
  const root = join(__dirname, '..');

  it('all carry rel="noopener noreferrer"', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(root)) {
      const src = readFileSync(file, 'utf8');
      // Each JSX opening tag that contains target="_blank" / target='_blank'.
      for (const tag of src.match(/<[A-Za-z][^<>]*target=\{?["']_blank["']\}?[^<>]*>/g) ?? []) {
        const rel = tag.match(/rel=\{?["']([^"']*)["']/)?.[1].split(/\s+/) ?? [];
        if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
          offenders.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('finds the TransactionLink anchor (sanity check that the scan works)', () => {
    const src = readFileSync(join(root, 'components', 'TransactionLink.tsx'), 'utf8');
    expect(src).toMatch(/target="_blank"/);
  });
});
