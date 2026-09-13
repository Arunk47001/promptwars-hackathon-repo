export interface HotspotRow {
  id: string;
  district: string;
  category: string;
  demand_volume: number;
  demand_volume_raw: number;
  infra_gap_score: number;
  investment_offset: number;
  composite_score: number;
  submission_count: number;
  duplicate_count: number;
  is_actioned: boolean;
  actioned_at: string | null;
  computation_wave: string;
  computed_at: string;
}

export interface CleanSubmissionRow {
  id: string;
  created_at: string;
  channel: string;
  category: string;
  description: string;
  urgency: string;
  sentiment: string | null;
  state: string | null;
  district: string;
  block: string | null;
  village: string | null;
  is_likely_duplicate: boolean;
  is_burst_flagged: boolean;
  score_weight: number;
  extraction_path: string;
}

export interface AnonymizationSample {
  source: string;
  before: {
    phoneNumber: string;
    rawText: string | null;
    preciseLat: number | null;
    preciseLng: number | null;
  };
  after: {
    phoneHash: string;
    description: string;
    district: string;
    block: string | null;
    village: string | null;
  };
}

export interface ImpactComparison {
  district: string;
  category: string;
  actionedAt: string | null;
  preActionScore: number | null;
  postActionScore: number | null;
  reengagementRecipientCount: number;
}
