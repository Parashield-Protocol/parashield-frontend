import {
  parseOracleKey,
  oracleKeyLabel,
  buildRainfallKey,
  buildFlightKey,
  confidenceLabel,
  confidenceColour,
} from '../lib/oracle';

describe('parseOracleKey', () => {
  it('parses rainfall keys', () => {
    const result = parseOracleKey('rainfall:-0.0917,34.7679:2026-06');
    expect(result.dataType).toBe('rainfall');
    expect(result.location).toBe('-0.0917,34.7679');
    expect(result.period).toBe('2026-06');
  });

  it('parses flight keys', () => {
    const result = parseOracleKey('flight:KQ100:2026-06-01');
    expect(result.dataType).toBe('flight');
    expect(result.flightNumber).toBe('KQ100');
    expect(result.period).toBe('2026-06-01');
  });

  it('keeps the date when a flight number itself contains a colon (issue #223)', () => {
    // "AB:12" as a flight number produces flight:AB:12:2026-06-01. A naive
    // split on ':' would drop the date; parsing from the last ':' preserves it.
    const key = buildFlightKey('AB:12', '2026-06-01');
    const result = parseOracleKey(key);
    expect(result.dataType).toBe('flight');
    expect(result.flightNumber).toBe('AB:12');
    expect(result.period).toBe('2026-06-01');
  });

  it('parses a flight key with no date segment', () => {
    const result = parseOracleKey('flight:KQ100');
    expect(result.dataType).toBe('flight');
    expect(result.flightNumber).toBe('KQ100');
    expect(result.period).toBeUndefined();
  });

  it('handles empty keys as unknown', () => {
    const result = parseOracleKey('');
    expect(result.dataType).toBe('unknown');
    expect(result.rawKey).toBe('');
  });

  it('handles unknown and unexpected keys as unknown', () => {
    expect(parseOracleKey('unknown:key').dataType).toBe('unknown');
    expect(parseOracleKey('rainfall').dataType).toBe('unknown');
    expect(parseOracleKey('weather:special:value').dataType).toBe('unknown');
  });

  it('parses defi keys', () => {
    const bare = parseOracleKey('defi');
    expect(bare.dataType).toBe('defi');
    expect(bare.defiKey).toBeUndefined();

    const keyed = parseOracleKey('defi:protocol-monitor');
    expect(keyed.dataType).toBe('defi');
    expect(keyed.defiKey).toBe('protocol-monitor');
  });
});

describe('buildRainfallKey', () => {
  it('builds the correct key format', () => {
    const key = buildRainfallKey(-0.0917, 34.7679, 2026, 6);
    expect(key).toBe('rainfall:-0.0917,34.7679:2026-06');
  });

  it('pads single-digit months', () => {
    const key = buildRainfallKey(0, 0, 2026, 3);
    expect(key).toContain('2026-03');
  });

  it('clamps coordinate precision so keys stay within the 32-char Soroban limit (issue #222)', () => {
    // Raw high-precision coordinates would blow past 32 chars; clamping to 4
    // decimals keeps the generated key comfortably within budget.
    const key = buildRainfallKey(-0.091712345678, 34.767912345678, 2026, 12);
    expect(key.length).toBeLessThanOrEqual(32);
    expect(key).toBe('rainfall:-0.0917,34.7679:2026-12');
  });

  it('does not pad short coordinates with trailing zeros', () => {
    expect(buildRainfallKey(0, 0, 2026, 6)).toBe('rainfall:0,0:2026-06');
  });

  it('handles coordinate and month boundary values', () => {
    expect(buildRainfallKey(90, 180, 2026, 1)).toBe('rainfall:90,180:2026-01');
    expect(buildRainfallKey(-90, -180, 2026, 12)).toBe('rainfall:-90,-180:2026-12');
    expect(buildRainfallKey(0, 0, 2026, 0)).toBe('rainfall:0,0:2026-00');
    expect(buildRainfallKey(0, 0, 2026, 13)).toBe('rainfall:0,0:2026-13');
  });
});

describe('buildFlightKey', () => {
  it('builds the correct flight key', () => {
    expect(buildFlightKey('KQ100', '2026-06-01')).toBe('flight:KQ100:2026-06-01');
  });

  it('handles an empty flight number without dropping the date', () => {
    const key = buildFlightKey('', '2026-06-01');
    const result = parseOracleKey(key);
    expect(result.dataType).toBe('flight');
    expect(result.flightNumber).toBe('');
    expect(result.period).toBe('2026-06-01');
  });
});

describe('oracleKeyLabel', () => {
  it('formats bare defi keys', () => {
    expect(oracleKeyLabel('defi')).toBe('DeFi Exploit Monitor');
  });

  it('formats keyed defi keys', () => {
    expect(oracleKeyLabel('defi:protocol-monitor')).toBe('DeFi · protocol-monitor');
  });
});

describe('confidenceLabel', () => {
  it('returns High for 90+', () => { expect(confidenceLabel(90)).toBe('High'); });
  it('returns Medium for 70-89', () => { expect(confidenceLabel(75)).toBe('Medium'); });
  it('returns Low for below 70', () => { expect(confidenceLabel(50)).toBe('Low'); });
});

describe('confidenceColour', () => {
  it('returns emerald for high confidence', () => {
    expect(confidenceColour(95)).toBe('text-emerald-400');
  });
  it('returns amber for medium confidence', () => {
    expect(confidenceColour(80)).toBe('text-amber-400');
  });
  it('returns red for low confidence', () => {
    expect(confidenceColour(60)).toBe('text-red-400');
  });
});
