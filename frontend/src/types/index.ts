export type PlantId = 'PLANT-01' | 'PLANT-02' | 'PLANT-03' | 'ALL';
export type Severity = 'high' | 'medium' | 'low';
export type AnomalyStatus = 'open' | 'investigating' | 'resolved';
export type ActionTrackingStatus = 'pending_verification' | 'verified' | 'not_resolved';

export interface Plant {
  id: string;
  name: string;
  location: string;
  lines: Line[];
}

export interface Line {
  id: string;
  name: string;
  plantId: string;
  machines: Machine[];
  targetCostPerUnit: number;
}

export interface Machine {
  id: string;
  name: string;
  lineId: string;
  plantId: string;
  machineType: string;
  status: 'optimal' | 'warning' | 'critical' | 'maintenance';
  currentTelemetry: {
    energyKwh: number;
    temperatureC: number;
    vibrationMmS: number;
    pressureBar: number;
    oeePct: number;
  };
}

export interface CostSummary {
  plantId: string;
  lineId: string;
  costPerUnit: number;
  baselineCostPerUnit: number;
  variancePct: number;
  totalMonthlyCost: number;
  projectedMonthlyCost: number;
  totalUnitsProduced: number;
  breakdown: {
    materialCost: number;
    energyCost: number;
    laborCost: number;
    allocatedOverhead: number;
  };
  trend: {
    timestamp: string;
    actualCost: number;
    baselineCost: number;
    units: number;
    variance: number;
  }[];
}

export interface Anomaly {
  anomalyId: string;
  assetId: string;
  assetName: string;
  plantId: string;
  lineId: string;
  metric: string;
  unit: string;
  currentValue: number;
  baselineValue: number;
  anomalyScore: number; // 0.0 - 1.0
  detectedAt: string;
  severity: Severity;
  status: AnomalyStatus;
  estimatedCostImpactPerDay: number;
  telemetryHistory: {
    timestamp: string;
    value: number;
    upperBound: number;
    lowerBound: number;
    baseline: number;
    isAnomaly?: boolean;
  }[];
}

export interface SHAPDriver {
  driver: string;
  category: 'Maintenance' | 'Environment' | 'Operational' | 'Material';
  correlationStrength: number; // 0.0 - 1.0
  contributionPct: number; // percentage
  shapValue: number;
  description: string;
  recommendedFix: string;
}

export interface RootCauseAnalysis {
  anomalyId: string;
  assetId: string;
  assetName: string;
  metric: string;
  detectedAt: string;
  confidence: number; // 0.0 - 1.0
  correlationStrength: number;
  historicalAccuracy: number;
  dataCompleteness: number;
  drillDownPath: string[]; // ["PLANT-01", "LINE-03", "EXTRUDER-01", "Chiller filter clogging"]
  rankedDrivers: SHAPDriver[];
  llmSummary: string;
}

export interface WhatIfCandidateAction {
  id: string;
  action: string;
  description: string;
  estimatedCost: number;
  downtimeHours: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  projectedSavingsQuarter: number;
  paybackDays: number;
  energyReductionPct: number;
  throughputImpactPct: number;
  feasible: boolean;
  constraintViolations?: string[];
  rank: number;
}

export interface Recommendation {
  recommendationId: string;
  rootCauseId?: string;
  anomalyId?: string;
  assetId: string;
  assetName: string;
  title: string;
  action: string;
  category: 'Energy' | 'Maintenance' | 'Process' | 'Material';
  projectedSavings: number;
  implementationCost: number;
  paybackDays: number;
  confidence: number;
  createdAt: string;
  status: 'open' | 'implemented' | 'verified';
  evidence: {
    anomalyId?: string;
    driver?: string;
    correlationStrength?: number;
    shapContribution?: number;
    historicalCaseId?: string;
  };
}

export interface ActionLog {
  actionId: string;
  recommendationId: string;
  recommendationTitle: string;
  assetId: string;
  implementedBy: string;
  implementedAt: string;
  notes: string;
  trackingStatus: ActionTrackingStatus;
  verificationDue: string;
  projectedSavings: number;
  verifiedSavings?: number;
  verifiedAt?: string;
  variancePct?: number;
  recalibrationModelId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  toolCalls?: {
    tool: string;
    args: Record<string, any>;
    status: 'running' | 'completed';
  }[];
  evidenceCard?: {
    type: 'anomaly' | 'root_cause' | 'recommendation' | 'whatif';
    title: string;
    confidence: number;
    projectedSavings?: number;
    driver?: string;
    recommendationId?: string;
    data?: any;
  };
}

export interface FilterState {
  plantId: PlantId;
  lineId: string;
  dateRange: '7d' | '30d' | '90d' | 'ytd';
  currency: 'INR' | 'USD';
  currencySymbol: '₹' | '$';
  currencyRate: number; // 1 for INR, 0.012 for USD
}
