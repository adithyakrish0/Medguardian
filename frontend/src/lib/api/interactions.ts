/**
 * Drug Interaction API Client
 * 
 * TypeScript client for the MedGuardian Interaction Risk Engine
 */

import { apiFetch } from '../api';

// =============================================================================
// Types
// =============================================================================

export type SeverityLevel = 'critical' | 'major' | 'moderate' | 'minor';
export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'safe';

export interface DrugInteraction {
    medication1: string;
    medication2: string;
    severity: SeverityLevel;
    category: string;
    description: string;
    recommendation: string;
    source: string;
    risk_factors: string[];
}

export interface SeverityBreakdown {
    critical: number;
    major: number;
    moderate: number;
    minor: number;
}

export interface GraphNode {
    id: string;
    label: string;
    hasInteraction: boolean;
    medication_id?: number;
    dosage?: string;
    frequency?: string;
}

export interface GraphEdge {
    source: string;
    target: string;
    severity: SeverityLevel;
    description: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface InteractionCheckResult {
    success: boolean;
    risk_score: number;
    risk_level: RiskLevel;
    total_interactions: number;
    interactions: DrugInteraction[];
    severity_breakdown: SeverityBreakdown;
    affected_categories: string[];
    medications_checked: string[];
    recommendation: string;
    graph_data: GraphData;
    checked_at?: string;
}

export interface QuickCheckResult {
    success: boolean;
    new_medication: string;
    existing_medications: string[];
    has_interactions: boolean;
    interaction_count: number;
    risk_score: number;
    risk_level: RiskLevel;
    interactions: DrugInteraction[];
    show_warning: boolean;
}

export interface InteractionStats {
    success: boolean;
    total_interactions: number;
    categories: string[];
    severity_levels: string[];
    version: string;
    last_updated: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Check all interactions for current user or specific patient
 */
export async function checkInteractions(params: {
    patientId?: number;
    seniorId?: number;
    medications?: string[];
}): Promise<InteractionCheckResult> {
    const body: Record<string, unknown> = {};

    if (params.patientId) body.patient_id = params.patientId;
    if (params.seniorId) body.senior_id = params.seniorId;
    if (params.medications) body.medications = params.medications;

    return apiFetch('/interactions/check', {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

/**
 * Get graph visualization data for a patient
 */
export async function getInteractionGraph(patientId?: number): Promise<{
    success: boolean;
    patient_id: number;
    medication_count: number;
    graph_data: GraphData;
}> {
    const endpoint = patientId
        ? `/interactions/graph/${patientId}`
        : '/interactions/graph';

    return apiFetch(endpoint);
}

/**
 * Quick check when adding a new medication
 * Returns warnings about potential interactions
 */
export async function quickCheckNewMedication(params: {
    newMedication: string;
    seniorId?: number;
}): Promise<QuickCheckResult> {
    return apiFetch('/interactions/quick-check', {
        method: 'POST',
        body: JSON.stringify({
            new_medication: params.newMedication,
            senior_id: params.seniorId
        })
    });
}

/**
 * Get interaction database statistics
 */
export async function getInteractionStats(): Promise<InteractionStats> {
    return apiFetch('/interactions/stats');
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get color for severity level (for UI styling)
 */
export function getSeverityColor(severity: SeverityLevel): string {
    const colors: Record<SeverityLevel, string> = {
        critical: '#EF4444', // critical
        major: '#F59E0B',    // warning
        moderate: '#F97316', // orange-500
        minor: '#10B981'     // success
    };
    return colors[severity] || '#6B7280';
}

/**
 * Get Tailwind classes for severity
 */
export function getSeverityClasses(severity: SeverityLevel): {
    bg: string;
    text: string;
    border: string;
} {
    const classes: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
        critical: {
            bg: 'bg-critical/10',
            text: 'text-critical',
            border: 'border-critical/30'
        },
        major: {
            bg: 'bg-warning/10',
            text: 'text-warning',
            border: 'border-warning/30'
        },
        moderate: {
            bg: 'bg-orange-500/10',
            text: 'text-orange-500',
            border: 'border-orange-500/30'
        },
        minor: {
            bg: 'bg-success/10',
            text: 'text-success',
            border: 'border-success/30'
        }
    };
    return classes[severity] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', border: 'border-gray-200 dark:border-gray-700' };
}

/**
 * Get risk level description
 */
export function getRiskLevelInfo(riskLevel: RiskLevel): {
    label: string;
    icon: string;
    description: string;
    color: string;
} {
    const info: Record<RiskLevel, { label: string; icon: string; description: string; color: string }> = {
        critical: {
            label: 'Critical Risk',
            icon: 'AlertCircle',
            description: 'Contact your doctor immediately',
            color: 'text-critical'
        },
        high: {
            label: 'High Risk',
            icon: 'AlertTriangle',
            description: 'Schedule an urgent appointment',
            color: 'text-warning'
        },
        moderate: {
            label: 'Moderate Risk',
            icon: 'Zap',
            description: 'Discuss at next visit',
            color: 'text-orange-600'
        },
        low: {
            label: 'Low Risk',
            icon: 'Info',
            description: 'Be aware, no action needed',
            color: 'text-primary-600'
        },
        safe: {
            label: 'Safe',
            icon: 'CheckCircle',
            description: 'No interactions detected',
            color: 'text-success'
        }
    };
    return info[riskLevel] || info.safe;
}
