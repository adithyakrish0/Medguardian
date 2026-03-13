"use client";

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export interface User {
    id: number;
    username: string;
    email: string;
    role: 'senior' | 'caregiver';
    phone?: string;
    full_name?: string;
    camera_auto_accept?: boolean;
    created_at: string;
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/users/me');
            if (response.success) {
                setUser(response.data);
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch user profile';
            // If session expired / not authenticated, redirect to login
            if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('unauthenticated')) {
                window.location.href = '/login';
                return;
            }
            setError(msg);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return { user, loading, error, refresh: fetchUser };
}
