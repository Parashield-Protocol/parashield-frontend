import {
  STROOPS_PER_UNIT,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  STATUS_COLOURS,
  TOAST_DEFAULT_DURATION_MS,
  POLLING_INTERVAL_MS,
  WALLET_STORAGE_KEY,
  ADDRESS_STORAGE_KEY,
} from '../lib/constants';

describe('constants', () => {
  it('STROOPS_PER_UNIT is 10_000_000', () => {
    expect(STROOPS_PER_UNIT).toBe(10_000_000n);
  });

  it('CATEGORY_ICONS covers expected categories', () => {
    for (const cat of ['crop', 'flight', 'disaster', 'health', 'defi'] as Array<keyof typeof CATEGORY_ICONS>) {
      expect(CATEGORY_ICONS[cat]).toBeTruthy();
    }
  });

  it('CATEGORY_LABELS covers expected categories', () => {
    expect(CATEGORY_LABELS['crop']).toBe('Crop Insurance');
    expect(CATEGORY_LABELS['flight']).toBe('Flight Delay');
    expect(CATEGORY_LABELS['defi']).toBe('DeFi Cover');
  });

  it('STATUS_COLOURS maps known statuses', () => {
    expect(STATUS_COLOURS['Active']).toBe('emerald');
    expect(STATUS_COLOURS['Expired']).toBe('gray');
    expect(STATUS_COLOURS['Paid']).toBe('emerald');
    expect(STATUS_COLOURS['Rejected']).toBe('red');
  });

  it('TOAST_DEFAULT_DURATION_MS is a positive number', () => {
    expect(TOAST_DEFAULT_DURATION_MS).toBeGreaterThan(0);
  });

  it('POLLING_INTERVAL_MS is at least 10 seconds', () => {
    expect(POLLING_INTERVAL_MS).toBeGreaterThanOrEqual(10_000);
  });

  it('storage keys are defined strings', () => {
    expect(typeof WALLET_STORAGE_KEY).toBe('string');
    expect(typeof ADDRESS_STORAGE_KEY).toBe('string');
    expect(WALLET_STORAGE_KEY).not.toBe(ADDRESS_STORAGE_KEY);
  });
});
