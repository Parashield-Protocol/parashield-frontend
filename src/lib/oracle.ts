export interface OracleKey {
  dataType: 'rainfall' | 'temperature' | 'flight' | 'defi' | 'unknown';
  location?: string;
  flightNumber?: string;
  period?: string;
  defiKey?: string;
  rawKey?: string;
}

export function parseOracleKey(key: string): OracleKey {
  if (key.startsWith('rainfall:')) {
    const [, coords, period] = key.split(':');
    return { dataType: 'rainfall', location: coords, period };
  }
  if (key.startsWith('temperature:')) {
    const [, coords, period] = key.split(':');
    return { dataType: 'temperature', location: coords, period };
  }
  if (key.startsWith('flight:')) {
    // The date is always the final segment. Splitting on every ':' would drop it
    // if the flight number itself contains a colon (e.g. "AB:12"), so isolate the
    // date from the last ':' and treat everything before it as the flight number.
    const rest = key.slice('flight:'.length);
    const lastColon = rest.lastIndexOf(':');
    if (lastColon === -1) {
      return { dataType: 'flight', flightNumber: rest };
    }
    return {
      dataType: 'flight',
      flightNumber: rest.slice(0, lastColon),
      period: rest.slice(lastColon + 1),
    };
  }
  if (key === 'defi') {
    return { dataType: 'defi' };
  }
  if (key.startsWith('defi:')) {
    const [, defiKey] = key.split(':', 2);
    return { dataType: 'defi', defiKey };
  }
  return { dataType: 'unknown', rawKey: key };
}

export function oracleKeyLabel(key: string): string {
  const parsed = parseOracleKey(key);
  switch (parsed.dataType) {
    case 'rainfall':
      return `Rainfall · ${parsed.location ?? ''} · ${parsed.period ?? ''}`;
    case 'temperature':
      return `Temperature · ${parsed.location ?? ''} · ${parsed.period ?? ''}`;
    case 'flight':
      return `Flight ${parsed.flightNumber ?? ''} · ${parsed.period ?? ''}`;
    case 'defi':
      if (parsed.defiKey) {
        return `DeFi · ${parsed.defiKey}`;
      }
      if (!parsed.rawKey || parsed.rawKey === 'defi') {
        return 'DeFi Exploit Monitor';
      }
      return parsed.rawKey;
    case 'unknown':
      return parsed.rawKey ?? key;
    default:
      return key;
  }
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'High';
  if (confidence >= 70) return 'Medium';
  return 'Low';
}

export function confidenceColour(confidence: number): string {
  if (confidence >= 90) return 'text-emerald-400';
  if (confidence >= 70) return 'text-amber-400';
  return 'text-red-400';
}

export function confidenceIcon(confidence: number): string {
  if (confidence >= 90) return '●';
  if (confidence >= 70) return '◐';
  return '○';
}

export function buildRainfallKey(lat: number, lng: number, year: number, month: number): string {
  const monthStr = String(month).padStart(2, '0');
  // Clamp coordinate precision to 4 decimals (~11m). Without a cap, values like
  // parseFloat('-0.09171234567') produce long keys that can blow past Soroban's
  // 32-char limit. toFixed(4) keeps keys well within budget (issue #222).
  const latStr = clampCoord(lat);
  const lngStr = clampCoord(lng);
  return `rainfall:${latStr},${lngStr}:${year}-${monthStr}`;
}

// Format a coordinate to at most 4 decimals without trailing-zero padding,
// so whole numbers stay short ("0") and precise values are capped ("-0.0917").
function clampCoord(value: number): string {
  return String(Number(value.toFixed(4)));
}

export function buildFlightKey(flightNumber: string, date: string): string {
  return `flight:${flightNumber}:${date}`;
}
