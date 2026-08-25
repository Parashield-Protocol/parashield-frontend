import {
  safeBigInt,
  stroopsToDisplay,
  displayToStroops,
  formatUSDC,
  shortenAddress,
  formatDate,
  formatDateTime,
  basisPointsToPercent,
  formatOracleValue,
  timeLeft,
  estimatePremium,
} from '../lib/format';

describe('stroopsToDisplay', () => {
  it('converts exact USDC amounts', () => {
    expect(stroopsToDisplay('10000000')).toBe('1.00');
    expect(stroopsToDisplay('100000000')).toBe('10.00');
    expect(stroopsToDisplay('0')).toBe('0.00');
  });

  it('handles bigint input', () => {
    expect(stroopsToDisplay(50000000n)).toBe('5.00');
  });

  it('respects decimal precision', () => {
    expect(stroopsToDisplay('12345678', 4)).toBe('1.2345');
  });

  it('returns — for empty string', () => {
    expect(stroopsToDisplay('')).toBe('—');
  });

  it('returns — for whitespace string', () => {
    expect(stroopsToDisplay('   ')).toBe('—');
  });

  it('returns — for null', () => {
    expect(stroopsToDisplay(null as unknown as string)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(stroopsToDisplay(undefined as unknown as string)).toBe('—');
  });

  it('returns — for non-numeric string', () => {
    expect(stroopsToDisplay('N/A')).toBe('—');
    expect(stroopsToDisplay('abc')).toBe('—');
  });

  it('truncates rather than rounds at a decimal boundary (#451, intentional -- see doc comment)', () => {
    // 19999999 stroops = 1.9999999 — truncated to 2 decimals should be 1.99, not 2.00
    expect(stroopsToDisplay('19999999')).toBe('1.99');
  });
});

describe('displayToStroops', () => {
  it('converts display amounts to stroops', () => {
    expect(displayToStroops('1')).toBe(10000000n);
    expect(displayToStroops('10.5')).toBe(105000000n);
    expect(displayToStroops('0.0000001')).toBe(1n);
  });

  it('handles amounts without decimals', () => {
    expect(displayToStroops('100')).toBe(1000000000n);
  });

  it('throws on negative input', () => {
    expect(() => displayToStroops('-500')).toThrow(TypeError);
    expect(() => displayToStroops('-0.5')).toThrow(TypeError);
  });

  it('throws on empty string', () => {
    expect(() => displayToStroops('')).toThrow(TypeError);
  });

  it('throws on non-numeric string', () => {
    expect(() => displayToStroops('N/A')).toThrow(TypeError);
  });
});

describe('formatUSDC', () => {
  it('appends USDC symbol by default', () => {
    expect(formatUSDC('10000000')).toBe('1.00 USDC');
  });

  it('omits symbol when showSymbol is false', () => {
    expect(formatUSDC('10000000', false)).toBe('1.00');
  });
});

describe('shortenAddress', () => {
  const ADDR = 'GDYJWQZFBFZD6FMXF5Y5XJFZJZ5XFZJZ5XFZJZ5X';

  it('truncates long addresses', () => {
    const result = shortenAddress(ADDR);
    expect(result).toContain('…');
    expect(result.length).toBeLessThan(ADDR.length);
  });

  it('returns short addresses unchanged', () => {
    expect(shortenAddress('GABC')).toBe('GABC');
  });

  it('uses symmetric leading and trailing truncation by default', () => {
    expect(shortenAddress(ADDR)).toBe(`${ADDR.slice(0, 4)}…${ADDR.slice(-4)}`);
  });
});

describe('basisPointsToPercent', () => {
  it('converts basis points correctly', () => {
    expect(basisPointsToPercent(500)).toBe('5.00%');
    expect(basisPointsToPercent(100)).toBe('1.00%');
    expect(basisPointsToPercent(250, 1)).toBe('2.5%');
  });
});

describe('formatDate', () => {
  it('formats a valid epoch', () => {
    expect(formatDate(1700000000)).toMatch(/Nov 2023/);
  });

  it('returns — for null', () => {
    expect(formatDate(null as unknown as number)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatDate(undefined as unknown as number)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('returns — for null', () => {
    expect(formatDateTime(null as unknown as number)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatDateTime(undefined as unknown as number)).toBe('—');
  });
});

describe('formatOracleValue', () => {
  it('formats rainfall in mm', () => {
    const result = formatOracleValue('324000000', 'weather');
    expect(result).toContain('mm');
    expect(result).toContain('32.40');
  });

  it('formats flight delay in minutes', () => {
    const result = formatOracleValue('1200000000', 'flight');
    expect(result).toContain('120');
    expect(result).toContain('min');
  });

  it('handles large values without precision loss', () => {
    // 9,007,199,254,740,991.4740991 mm rainfall
    const result = formatOracleValue('90071992547409914740991', 'weather');
    expect(result).toContain('9007199254740991.47');
  });

  it('formats defi exploit detected (n === 1)', () => {
    // 1 * 1e7 = 10000000
    expect(formatOracleValue('10000000', 'defi')).toBe('Exploit detected');
  });

  it('formats defi no exploit (n === 0)', () => {
    expect(formatOracleValue('0', 'defi')).toBe('No exploit');
  });

  it('formats defi unknown value', () => {
    // 42 * 1e7 = 420000000
    expect(formatOracleValue('420000000', 'defi')).toBe('Unknown (42)');
  });

  it('returns — for null', () => {
    expect(formatOracleValue(null as unknown as string, 'weather')).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(formatOracleValue(undefined as unknown as string, 'weather')).toBe('—');
  });
});

describe('estimatePremium', () => {
  it('matches on-chain integer calculation for edge case 1', () => {
    // 9999.99 coverage, 500 bps (5%)
    expect(estimatePremium('9999.99', 500)).toBe('499.99');
  });

  it('matches on-chain integer calculation for edge case 2', () => {
    // 1000.01 coverage, 333 bps (3.33%)
    expect(estimatePremium('1000.01', 333)).toBe('33.30');
  });

  it('matches on-chain integer calculation for edge case 3', () => {
    // 0.05 coverage, 100 bps (1%)
    expect(estimatePremium('0.05', 100)).toBe('0.00');
  });
});

describe('safeBigInt', () => {
  it('converts valid numeric strings', () => {
    expect(safeBigInt('10000000')).toBe(10000000n);
    expect(safeBigInt('0')).toBe(0n);
    expect(safeBigInt('-42')).toBe(-42n);
  });

  it('passes through bigint values', () => {
    expect(safeBigInt(123n)).toBe(123n);
  });

  it('returns 0n for empty string', () => {
    expect(safeBigInt('')).toBe(0n);
  });

  it('returns 0n for whitespace', () => {
    expect(safeBigInt('   ')).toBe(0n);
  });

  it('returns 0n for null', () => {
    expect(safeBigInt(null)).toBe(0n);
  });

  it('returns 0n for undefined', () => {
    expect(safeBigInt(undefined)).toBe(0n);
  });

  it('returns 0n for non-numeric strings', () => {
    expect(safeBigInt('N/A')).toBe(0n);
    expect(safeBigInt('abc')).toBe(0n);
    expect(safeBigInt('12.5')).toBe(0n);
  });
});
