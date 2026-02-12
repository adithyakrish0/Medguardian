/**
 * Explainability API Client
 * 
 * TypeScript client for SHAP-based model explanations.
 */

import { apiFetch } from './api';

// Types

export interface FeatureContribution {
    name: string;
    value: number;
    contribution: number;
    direction: 'increases_adherence' | 'decreases_adherence';
    impact: 'positive' | 'negative';
}

export interface PredictionExplanation {
    prediction: number;
    risk_level: 'High' | 'Medium' | 'Low';
    base_value: number;
    contributions: FeatureContribution[];
    waterfall_plot: string | null;  // base64 image
}

export interface ExplainPredictionResponse {
    success: boolean;
    patient_id: number;
    features_used: {
        hour: number;
        day_of_week: number;
        is_weekend: number;
        priority: number;
    };
    prediction: number;
    risk_level: string;
    base_value: number;
    contributions: FeatureContribution[];
    waterfall_plot: string | null;
    error?: string;
}

export interface GlobalFeature {
    rank: number;
    feature: string;
    importance: number;
    percentage: number;
}

export interface GlobalExplanationResponse {
    success: boolean;
    features: GlobalFeature[];
    summary_plot: string | null;
    samples_analyzed: number;
    error?: string;
}

export interface ComparisonResponse {
    success: boolean;
    high_risk: PredictionExplanation;
    low_risk: PredictionExplanation;
    key_differences: Array<{
        feature: string;
        high_risk_contribution: number;
        low_risk_contribution: number;
        difference: number;
        insight: string;
    }>;
    error?: string;
}

export interface ExplainerStatusResponse {
    success: boolean;
    model_loaded: boolean;
    explainer_ready: boolean;
    features: string[];
    model_type: string | null;
}

// API Functions

/**
 * Get SHAP explanation for a patient's prediction
 */
export async function explainPatientPrediction(patientId: number): Promise<ExplainPredictionResponse> {
    return apiFetch(`/explain/prediction/${patientId}`);
}

/**
 * Get SHAP explanation for a specific medication
 */
export async function explainMedicationPrediction(medicationId: number): Promise<ExplainPredictionResponse> {
    return apiFetch(`/explain/medication/${medicationId}`);
}

/**
 * Get global feature importance
 */
export async function getGlobalExplanation(samples: number = 200): Promise<GlobalExplanationResponse> {
    return apiFetch(`/explain/global?samples=${samples}`);
}

/**
 * Compare high-risk vs low-risk predictions
 */
export async function compareScenarios(
    highRisk: { hour: number; day_of_week: number; is_weekend: number; priority: number },
    lowRisk: { hour: number; day_of_week: number; is_weekend: number; priority: number }
): Promise<ComparisonResponse> {
    return apiFetch('/explain/compare', {
        method: 'POST',
        body: JSON.stringify({ high_risk: highRisk, low_risk: lowRisk })
    });
}

/**
 * Check explainer status
 */
export async function getExplainerStatus(): Promise<ExplainerStatusResponse> {
    return apiFetch('/explain/status');
}

// Utility Functions

/**
 * Get color for contribution (positive = blue, negative = red)
 */
export function getContributionColor(contribution: number): { text: string; bg: string } {
    if (contribution > 0) {
        return { text: 'text-blue-500', bg: 'bg-blue-500/20' };
    }
    return { text: 'text-red-500', bg: 'bg-red-500/20' };
}

/**
 * Format contribution for display
 */
export function formatContribution(contribution: number): string {
    const sign = contribution > 0 ? '+' : '';
    return `${sign}${(contribution * 100).toFixed(1)}%`;
}

/**
 * Get risk level styling
 */
export function getRiskLevelStyle(riskLevel: string) {
    switch (riskLevel) {
        case 'High':
            return { text: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/30' };
        case 'Medium':
            return { text: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
        case 'Low':
            return { text: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/30' };
        default:
            return { text: 'text-gray-500', bg: 'bg-gray-500/20', border: 'border-gray-500/30' };
    }
}

/**
 * Convert feature value to human-readable format
 */
export function formatFeatureValue(name: string, value: number): string {
    if (name.toLowerCase().includes('hour')) {
        return `${value}:00`;
    }
    if (name.toLowerCase().includes('weekend')) {
        return value ? 'Yes' : 'No';
    }
    if (name.toLowerCase().includes('priority')) {
        return value ? 'High' : 'Normal';
    }
    if (name.toLowerCase().includes('day')) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return days[value] || String(value);
    }
    return String(value);
}
