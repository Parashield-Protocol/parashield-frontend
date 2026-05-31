import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const api = axios.create({ baseURL: API_URL });

// ── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id:          string;
  name:        string;
  category:    string;
  triggerType: string;
  threshold:   string;
  comparison:  string;
  coverageMin: string;
  coverageMax: string;
  premiumRate: number;
  maxDuration: number;
  status:      string;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get<{ success: boolean; data: Product[] }>('/policies/products');
  return data.data;
}

// ── Policies ─────────────────────────────────────────────────────────────────

export interface Policy {
  id:           string;
  productId:    string;
  policyholder: string;
  coverage:     string;
  premiumPaid:  string;
  oracleKey:    string;
  startTime:    number;
  endTime:      number;
  status:       string;
}

export async function fetchUserPolicies(wallet: string): Promise<Policy[]> {
  const { data } = await api.get<{ success: boolean; data: Policy[] }>(`/policies?wallet=${wallet}`);
  return data.data;
}

// ── Claims ────────────────────────────────────────────────────────────────────

export interface ClaimStatus {
  id:            string;
  policyId:      string;
  triggerMet:    boolean;
  status:        string;
  processedAt:   number | null;
}

export async function submitClaim(claimant: string, policyId: string): Promise<string> {
  const { data } = await api.post<{ success: boolean; data: { claimId: string } }>('/claims', {
    claimant,
    policyId,
  });
  return data.data.claimId;
}

export async function fetchClaim(claimId: string): Promise<ClaimStatus | null> {
  try {
    const { data } = await api.get<{ success: boolean; data: ClaimStatus }>(`/claims/${claimId}`);
    return data.data;
  } catch {
    return null;
  }
}

// ── Oracle ────────────────────────────────────────────────────────────────────

export async function fetchRainfallPreview(
  lat: number, lng: number, year: number, month: number,
): Promise<{ value: string; confidence: number }> {
  const { data } = await api.get('/oracle/rainfall', {
    params: { lat, lng, year, month },
  });
  return data.data;
}
