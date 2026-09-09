import {
  mockCostSummary,
  mockAnomalies,
  mockRootCauses,
  mockWhatIfScenarios,
  mockRecommendations,
  mockActionLogs,
  mockPlants,
} from '../mock/mockData';
import {
  CostSummary,
  Anomaly,
  RootCauseAnalysis,
  WhatIfCandidateAction,
  Recommendation,
  ActionLog,
  Plant,
} from '../types';
import { API_BASE } from '../config';

const USE_MOCK = false; // Fallback to high-fidelity mock if backend is not yet started

// The documented contract (08_API_Integration_Architecture.md) takes ISO `from`/`to`
// dates on GET /api/cost/summary, while the UI works in date-range shorthands.
// Convert here so the live request matches the contract.
function rangeToDates(dateRange: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  if (dateRange === '7d') from.setDate(from.getDate() - 7);
  else if (dateRange === '90d') from.setDate(from.getDate() - 90);
  else if (dateRange === 'ytd') from.setMonth(0, 1);
  else from.setDate(from.getDate() - 30); // '30d' default
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export const api = {
  getPlants: async (): Promise<Plant[]> => {
    if (USE_MOCK) return mockPlants;
    const res = await fetch(`${API_BASE}/api/plants`);
    return res.json();
  },

  getCostSummary: async (
    plantId = 'PLANT-01',
    lineId = 'LINE-03',
    dateRange = '30d'
  ): Promise<CostSummary> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200)); // simulate fast network
      return {
        ...mockCostSummary,
        plantId,
        lineId,
      };
    }
    const { from, to } = rangeToDates(dateRange);
    const res = await fetch(`${API_BASE}/api/cost/summary?plant_id=${plantId}&line_id=${lineId}&from=${from}&to=${to}`);
    const raw = await res.json();
    // Backend contract (08_API_Integration_Architecture.md 3.1) returns snake_case
    // fields; map into the app's internal camelCase CostSummary shape. Fields the
    // documented response doesn't carry (trend, totals) default safely.
    return {
      plantId: raw.plant_id,
      lineId: raw.line_id,
      costPerUnit: raw.cost_per_unit,
      baselineCostPerUnit: raw.baseline_cost_per_unit,
      variancePct: raw.variance_pct,
      totalMonthlyCost: raw.total_monthly_cost ?? 0,
      projectedMonthlyCost: raw.projected_monthly_cost ?? 0,
      totalUnitsProduced: raw.total_units_produced ?? 0,
      breakdown: {
        materialCost: raw.breakdown?.material_cost ?? 0,
        energyCost: raw.breakdown?.energy_cost ?? 0,
        laborCost: raw.breakdown?.labor_cost ?? 0,
        allocatedOverhead: raw.breakdown?.allocated_overhead ?? 0,
      },
      // Each trend point is also snake_case (actual_cost/baseline_cost) — this
      // was passed straight through unmapped, so CostTrendChart's
      // item.actualCost/baselineCost read as undefined, multiplied out to
      // NaN, and the line series silently rendered nothing (blank chart).
      trend: (raw.trend ?? []).map((t: any) => ({
        timestamp: t.timestamp,
        actualCost: t.actual_cost,
        baselineCost: t.baseline_cost,
        units: t.units,
        variance: t.variance,
      })),
    };
  },

  getAnomalies: async (
    severity?: string,
    status?: string,
    plantId?: string
  ): Promise<Anomaly[]> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockAnomalies.filter((a) => {
        if (severity && severity !== 'ALL' && a.severity !== severity) return false;
        if (status && status !== 'ALL' && a.status !== status) return false;
        return true;
      });
    }
    const params = new URLSearchParams();
    if (plantId) params.set('plant_id', plantId);
    if (severity && severity !== 'ALL') params.set('severity', severity);
    if (status && status !== 'ALL') params.set('status', status);
    const res = await fetch(`${API_BASE}/api/anomalies?${params.toString()}`);
    const raw: any[] = await res.json();
    // Backend contract (08 3.2) only guarantees anomaly_id/asset_id/metric/
    // anomaly_score/detected_at/severity/status; map field names and default
    // the richer fields the UI wants until the backend enriches its response.
    return raw.map((a) => ({
      anomalyId: a.anomaly_id,
      assetId: a.asset_id,
      assetName: a.asset_name ?? a.asset_id,
      plantId: a.plant_id ?? '',
      lineId: a.line_id ?? '',
      metric: a.metric,
      unit: a.unit ?? '',
      currentValue: a.current_value ?? 0,
      baselineValue: a.baseline_value ?? 0,
      anomalyScore: a.anomaly_score,
      detectedAt: a.detected_at,
      severity: a.severity,
      status: a.status,
      estimatedCostImpactPerDay: a.estimated_cost_impact_per_day ?? 0,
      // Same snake_case gap as trend above: upper_bound/lower_bound/is_anomaly
      // were never mapped, so the telemetry band never rendered and the
      // anomalous point was never highlighted or reported correctly.
      telemetryHistory: (a.telemetry_history ?? []).map((t: any) => ({
        timestamp: t.timestamp,
        value: t.value,
        upperBound: t.upper_bound,
        lowerBound: t.lower_bound,
        baseline: t.baseline,
        isAnomaly: t.is_anomaly,
      })),
    }));
  },

  getRootCause: async (anomalyId: string): Promise<RootCauseAnalysis> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 250));
      const rca = mockRootCauses[anomalyId] || mockRootCauses['AN-20260830-0134'];
      return rca;
    }
    const res = await fetch(`${API_BASE}/api/rootcause/${anomalyId}`);
    const raw = await res.json();
    // Backend contract (08 3.3): ranked_drivers[{driver, correlation_strength,
    // contribution_pct}], drill_down_path, confidence. Map field names to SHAPDriver[].
    const rankedDrivers = (raw.ranked_drivers ?? []).map((d: any) => ({
      driver: d.driver,
      category: d.category ?? 'Operational',
      correlationStrength: d.correlation_strength,
      contributionPct: d.contribution_pct,
      shapValue: d.shap_value ?? 0,
      description: d.description ?? '',
      recommendedFix: d.recommended_fix ?? '',
    }));
    return {
      anomalyId: raw.anomaly_id,
      assetId: raw.asset_id ?? '',
      assetName: raw.asset_name ?? '',
      metric: raw.metric ?? '',
      detectedAt: raw.detected_at ?? '',
      confidence: raw.confidence,
      correlationStrength: rankedDrivers[0]?.correlationStrength ?? 0,
      historicalAccuracy: raw.historical_accuracy ?? 0,
      dataCompleteness: raw.data_completeness ?? 0,
      drillDownPath: raw.drill_down_path ?? [],
      rankedDrivers,
      llmSummary: raw.llm_summary ?? '',
    };
  },

  runWhatIf: async (
    assetId: string,
    actions: Partial<WhatIfCandidateAction>[]
  ): Promise<{ rankedScenarios: WhatIfCandidateAction[] }> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return { rankedScenarios: mockWhatIfScenarios };
    }
    const res = await fetch(`${API_BASE}/api/whatif`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Backend contract (08 3.4) expects candidate_actions[{action, cost, downtime_hours}].
      body: JSON.stringify({
        asset_id: assetId,
        candidate_actions: actions.map((a) => ({
          action: a.action,
          cost: a.estimatedCost,
          downtime_hours: a.downtimeHours,
        })),
      }),
    });
    const raw = await res.json();
    // Backend returns snake_case ranked_scenarios; map into camelCase WhatIfCandidateAction[].
    const rankedScenarios: WhatIfCandidateAction[] = (raw.ranked_scenarios ?? []).map(
      (s: any, idx: number) => ({
        id: s.id ?? `${s.action}-${idx}`,
        action: s.action,
        description: s.description ?? '',
        estimatedCost: s.cost ?? 0,
        downtimeHours: s.downtime_hours ?? 0,
        riskLevel: s.risk_level ?? 'Low',
        projectedSavingsQuarter: s.projected_savings_quarter,
        paybackDays: s.payback_days,
        energyReductionPct: s.energy_reduction_pct ?? 0,
        throughputImpactPct: s.throughput_impact_pct ?? 0,
        feasible: s.feasible,
        constraintViolations: s.constraint_violations,
        rank: s.rank,
      })
    );
    return { rankedScenarios };
  },

  getRecommendations: async (status?: string): Promise<Recommendation[]> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 150));
      return mockRecommendations.filter((r) => !status || r.status === status);
    }
    const res = await fetch(`${API_BASE}/api/recommendations?status=${status || ''}`);
    const raw: any[] = await res.json();
    // Backend contract (08 3.5): recommendation_id, action, projected_savings,
    // confidence, evidence{anomaly_id}. Map field names and default extras.
    return raw.map((r) => ({
      recommendationId: r.recommendation_id,
      assetId: r.asset_id ?? '',
      assetName: r.asset_name ?? '',
      title: r.title ?? r.action,
      action: r.action,
      category: r.category ?? 'Process',
      projectedSavings: r.projected_savings,
      implementationCost: r.implementation_cost ?? 0,
      paybackDays: r.payback_days ?? 0,
      confidence: r.confidence,
      createdAt: r.created_at ?? new Date().toISOString(),
      status: r.status ?? (status as Recommendation['status']) ?? 'open',
      evidence: {
        anomalyId: r.evidence?.anomaly_id,
        driver: r.evidence?.driver,
        correlationStrength: r.evidence?.correlation_strength,
        shapContribution: r.evidence?.shap_contribution,
        historicalCaseId: r.evidence?.historical_case_id,
      },
    }));
  },

  implementAction: async (
    recommendationId: string,
    implementedBy: string,
    notes: string
  ): Promise<ActionLog> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      const targetRec = mockRecommendations.find(
        (r) => r.recommendationId === recommendationId
      );
      if (targetRec) targetRec.status = 'implemented';

      const newAction: ActionLog = {
        actionId: `ACT-${Math.floor(1000 + Math.random() * 9000)}`,
        recommendationId,
        recommendationTitle: targetRec?.title || 'Action Implementation',
        assetId: targetRec?.assetId || 'ASSET-01',
        implementedBy,
        implementedAt: new Date().toISOString(),
        notes,
        trackingStatus: 'pending_verification',
        verificationDue: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        projectedSavings: targetRec?.projectedSavings || 100000,
      };

      mockActionLogs.unshift(newAction);
      return newAction;
    }

    const res = await fetch(`${API_BASE}/api/actions/${recommendationId}/implement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ implemented_by: implementedBy, notes }),
    });
    const raw = await res.json();
    // fetch() only rejects on network failure, not on a 404/409/500 response,
    // so a failed implement (e.g. unknown/already-implemented recommendation)
    // was being parsed as if it succeeded — the caller then navigated to
    // /actions as though an action log had been created, when none had.
    if (!res.ok) {
      throw new Error(raw.detail || `Failed to implement action (HTTP ${res.status})`);
    }
    // Backend contract (08 3.6) only returns action_id/recommendation_id/
    // implemented_at/tracking_status/verification_due; map field names and
    // fill the rest from the request itself.
    return {
      actionId: raw.action_id,
      recommendationId: raw.recommendation_id,
      recommendationTitle: raw.recommendation_title ?? '',
      assetId: raw.asset_id ?? '',
      implementedBy,
      implementedAt: raw.implemented_at,
      notes,
      trackingStatus: raw.tracking_status,
      verificationDue: raw.verification_due,
      projectedSavings: raw.projected_savings ?? 0,
    };
  },

  getActionLogs: async (): Promise<ActionLog[]> => {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return [...mockActionLogs];
    }
    // NOTE: 08_API_Integration_Architecture.md does not document a GET list
    // endpoint for action logs (only POST /api/actions/{id}/implement). This
    // assumes the backend exposes one at the same /api/actions prefix.
    const res = await fetch(`${API_BASE}/api/actions`);
    return res.json();
  },

  // Auth always talks to the real backend (not USE_MOCK) — a login has to be
  // genuinely persisted for a fresh sign-up to be usable to log back in.
  signup: async (email: string, password: string): Promise<{ userId: string; email: string }> => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw.detail || 'Sign up failed');
    return { userId: raw.user_id, email: raw.email };
  },

  login: async (email: string, password: string): Promise<{ userId: string; email: string }> => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const raw = await res.json();
    if (!res.ok) throw new Error(raw.detail || 'Sign in failed');
    return { userId: raw.user_id, email: raw.email };
  },
};
