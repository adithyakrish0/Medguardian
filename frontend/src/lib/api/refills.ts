/**
 * Refills API Client
 * 
 * TypeScript client for refill prediction and alert management.
 */

import { apiFetch } from './api';

// Types

export interface RefillPrediction {
    medication_id: number;
    name: string;
    quantity_remaining: number;
    initial_quantity: number | null;
    avg_daily_consumption: number;
    consumption_variance: number;
    days_remaining: number;
    predicted_depletion_date: string;
    confidence_interval: [string, string];
    alert_level: 'critical' | 'warning' | 'info' | 'none';
    forecast_method: string;
    last_refill_date: string | null;
    days_of_history: number;
    is_prn: boolean;
}

export interface PredictionsResponse {
    success: boolean;
    patient_id: number;
    medications: RefillPrediction[];
    total_medications: number;
    total_alerts: number;
    generated_at: string;
}

export interface RefillAlert {
    id: number;
    patient_id: number;
    medication_id: number;
    medication_name: string;
    alert_level: 'critical' | 'warning' | 'info';
    days_remaining: number;
    predicted_depletion_date: string;
    confidence_low: string | null;
    confidence_high: string | null;
    avg_daily_consumption: number | null;
    forecast_method: string;
    created_at: string;
    acknowledged: boolean;
    acknowledged_at: string | null;
    auto_resolved: boolean;
}

export interface AlertsResponse {
    success: boolean;
    active_alerts: RefillAlert[];
    alert_history: RefillAlert[];
    total_active: number;
    total_acknowledged: number;
}

export interface RefillSummary {
    success: boolean;
    critical: number;
    warning: number;
    info: number;
    total: number;
    patients_with_alerts: Array<{
        patient_id: number;
        critical: number;
        warning: number;
        info: number;
    }>;
}

// API Functions

export async function getRefillPredictions(patientId: number): Promise<PredictionsResponse> {
    return apiFetch(`/refills/predictions/${patientId}`);
}

export async function triggerRefillCheck(patientId: number): Promise<{
    success: boolean;
    medications_checked: number;
    alerts_generated: number;
    alerts: Array<{ medication_name: string; alert_level: string; days_remaining: number }>;
}> {
    return apiFetch('/refills/trigger-check', {
        method: 'POST',
        body: JSON.stringify({ patient_id: patientId })
    });
}

export async function getRefillAlerts(patientId: number): Promise<AlertsResponse> {
    return apiFetch(`/refills/alerts/${patientId}`);
}

export async function acknowledgeAlert(alertId: number): Promise<{ success: boolean; acknowledged: boolean }> {
    return apiFetch(`/refills/acknowledge/${alertId}`, { method: 'POST' });
}

export async function updateMedicationQuantity(
    medicationId: number,
    quantity: number,
    action: 'refilled' | 'adjusted' = 'refilled'
): Promise<{ success: boolean; updated: boolean; auto_resolved_alerts: number }> {
    return apiFetch('/refills/update-quantity', {
        method: 'POST',
        body: JSON.stringify({ medication_id: medicationId, quantity_remaining: quantity, action })
    });
}

export async function getRefillSummary(): Promise<RefillSummary> {
    return apiFetch('/refills/summary');
}

// Utility Functions

export function getAlertLevelStyle(level: string) {
    switch (level) {
        case 'critical':
            return { text: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: '🔴' };
        case 'warning':
            return { text: 'text-yellow-500', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: '🟡' };
        case 'info':
            return { text: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: '🔵' };
        default:
            return { text: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: '🟢' };
    }
}

export function formatDaysRemaining(days: number): string {
    if (days <= 0) return 'Empty!';
    if (days === 1) return '1 day left';
    return `${days} days left`;
}

export function formatConfidenceInterval(interval: [string, string]): string {
    const low = new Date(interval[0]).toLocaleDateString();
    const high = new Date(interval[1]).toLocaleDateString();
    return `${low} - ${high}`;
}
