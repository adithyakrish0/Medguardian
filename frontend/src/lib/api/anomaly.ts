/**
 * Anomaly Detection API Client
 * 
 * TypeScript client for medication adherence anomaly detection.
 */

import { apiFetch } from './api';

// Types

export type AnomalyType = 'unusual_timing' | 'skipping_pattern' | 'adherence_drop';
export type Sensitivity = 'high' | 'medium' | 'low';

export interface AnomalyResult {
    is_anomaly: boolean;
    anomaly_score: number;
    anomaly_type: AnomalyType | null;
    alert: string;
    details: {
        primary_anomaly?: {
            type: AnomalyType;
            score: number;
            details: Record<string, any>;
        };
        all_anomalies?: Array<{
            type: AnomalyType;
            score: number;
            details: Record<string, any>;
        }>;
        baseline?: PatientBaseline;
        threshold?: number;
        error?: string;
    };
    detected_at: string;
}

export interface PatientBaseline {
    patient_id: number;
    mean_hour: number;
    std_hour: number;
    mean_adherence_rate: number;
    weekday_pattern: Record<number, number>;
    sensitivity: Sensitivity;
    sample_count: number;
    trained_at: string;
}

export interface TrainResponse {
    success: boolean;
    model_saved: boolean;
    patient_id: number;
    threshold: number;
    sensitivity: Sensitivity;
    training_samples: number;
    baseline: PatientBaseline;
    error?: string;
}

export interface DetectResponse {
    success: boolean;
    patient_id: number;
    is_anomaly: boolean;
    anomaly_score: number;
    anomaly_type: AnomalyType | null;
    alert: string;
    details: Record<string, any>;
    detected_at: string;
    error?: string;
}

export interface HistoryResponse {
    success: boolean;
    patient_id: number;
    has_baseline: boolean;
    baseline?: PatientBaseline;
    anomalies: Array<{
        date: string;
        type: AnomalyType;
        score: number;
        description: string;
    }>;
    logs_analyzed?: number;
    error?: string;
}

export interface DemoTriggerResponse {
    success: boolean;
    demo_mode: boolean;
    patient_id: number;
    patient_name: string;
    alert_sent: boolean;
    is_anomaly: boolean;
    anomaly_score: number;
    anomaly_type: AnomalyType | null;
    alert: string;
    details: Record<string, any>;
    detected_at: string;
}

export interface AnomalyAlert {
    patient_id: number;
    patient_name: string;
    anomaly_type: AnomalyType;
    anomaly_score: number;
    alert_message: string;
    details: Record<string, any>;
    detected_at: string;
    action_required: boolean;
}

// API Functions

/**
 * Train a baseline model for a patient
 */
export async function trainAnomalyBaseline(
    patientId: number,
    sensitivity: Sensitivity = 'medium'
): Promise<TrainResponse> {
    return apiFetch('/anomaly/train', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId, sensitivity })
    });
}

/**
 * Run anomaly detection on a patient's recent logs
 */
export async function detectAnomaly(patientId: number): Promise<DetectResponse> {
    return apiFetch('/anomaly/detect', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId })
    });
}

/**
 * Get anomaly history for a patient
 */
export async function getAnomalyHistory(patientId: number): Promise<HistoryResponse> {
    return apiFetch(`/anomaly/history/${patientId}`);
}

/**
 * Configure detection sensitivity
 */
export async function configureAnomalySensitivity(
    patientId: number,
    sensitivity: Sensitivity
): Promise<{ success: boolean; sensitivity: Sensitivity; threshold: number }> {
    return apiFetch('/anomaly/configure', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId, sensitivity })
    });
}

/**
 * Trigger demo detection (for live presentations)
 */
export async function triggerDemoDetection(patientId: number): Promise<DemoTriggerResponse> {
    return apiFetch(`/anomaly/trigger-demo/${patientId}`);
}

/**
 * Run batch detection for all patients (admin)
 */
export async function runBatchDetection(): Promise<{
    success: boolean;
    patients_checked: number;
    anomalies_found: number;
    alerts_sent: number;
    results: AnomalyResult[];
}> {
    return apiFetch('/anomaly/batch-detect', { method: 'POST' });
}

// Utility Functions

/**
 * Get display info for anomaly type
 */
export function getAnomalyTypeInfo(type: AnomalyType | null) {
    const info: Record<AnomalyType, { label: string; icon: string; color: string; bgColor: string }> = {
        unusual_timing: {
            label: 'Unusual Timing',
            icon: '⏰',
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10'
        },
        skipping_pattern: {
            label: 'Skipping Pattern',
            icon: '📅',
            color: 'text-yellow-500',
            bgColor: 'bg-yellow-500/10'
        },
        adherence_drop: {
            label: 'Adherence Drop',
            icon: '📉',
            color: 'text-red-500',
            bgColor: 'bg-red-500/10'
        }
    };

    return type ? info[type] : { label: 'Normal', icon: '✅', color: 'text-green-500', bgColor: 'bg-green-500/10' };
}

/**
 * Get severity level based on anomaly score
 */
export function getAnomalySeverity(score: number): {
    level: 'low' | 'moderate' | 'high' | 'critical';
    color: string;
    bgColor: string;
} {
    if (score >= 4) {
        return { level: 'critical', color: 'text-red-500', bgColor: 'bg-red-500/20' };
    } else if (score >= 3) {
        return { level: 'high', color: 'text-orange-500', bgColor: 'bg-orange-500/20' };
    } else if (score >= 2.5) {
        return { level: 'moderate', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' };
    }
    return { level: 'low', color: 'text-blue-500', bgColor: 'bg-blue-500/20' };
}

/**
 * Format timestamp for display
 */
export function formatAnomalyTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
