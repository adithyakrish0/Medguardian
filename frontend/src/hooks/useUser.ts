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
            setError(err.message || 'Failed to fetch user profile');
            // If fetching user fails, assume guest or senior for safety (but usually redirect to login)
            setUser({ id: 0, username: 'Senior', email: '', role: 'senior' } as User);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return { user, loading, error, refresh: fetchUser };
}
