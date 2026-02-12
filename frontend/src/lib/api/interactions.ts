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
        critical: '#ef4444', // red-500
        major: '#f97316',    // orange-500
        moderate: '#eab308', // yellow-500
        minor: '#22c55e'     // green-500
    };
    return colors[severity] || '#6b7280';
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
            bg: 'bg-red-500/20',
            text: 'text-red-500',
            border: 'border-red-500'
        },
        major: {
            bg: 'bg-orange-500/20',
            text: 'text-orange-500',
            border: 'border-orange-500'
        },
        moderate: {
            bg: 'bg-yellow-500/20',
            text: 'text-yellow-500',
            border: 'border-yellow-500'
        },
        minor: {
            bg: 'bg-green-500/20',
            text: 'text-green-500',
            border: 'border-green-500'
        }
    };
    return classes[severity] || { bg: 'bg-gray-500/20', text: 'text-gray-500', border: 'border-gray-500' };
}

/**
 * Get risk level description
 */
export function getRiskLevelInfo(riskLevel: RiskLevel): {
    label: string;
    emoji: string;
    description: string;
    color: string;
} {
    const info: Record<RiskLevel, { label: string; emoji: string; description: string; color: string }> = {
        critical: {
            label: 'Critical Risk',
            emoji: '🚨',
            description: 'Contact your doctor immediately',
            color: 'text-red-500'
        },
        high: {
            label: 'High Risk',
            emoji: '⚠️',
            description: 'Schedule an urgent appointment',
            color: 'text-orange-500'
        },
        moderate: {
            label: 'Moderate Risk',
            emoji: '⚡',
            description: 'Discuss at next visit',
            color: 'text-yellow-500'
        },
        low: {
            label: 'Low Risk',
            emoji: 'ℹ️',
            description: 'Be aware, no action needed',
            color: 'text-blue-500'
        },
        safe: {
            label: 'Safe',
            emoji: '✅',
            description: 'No interactions detected',
            color: 'text-green-500'
        }
    };
    return info[riskLevel] || info.safe;
}
