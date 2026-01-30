// In production, NEXT_PUBLIC_API_URL should be the full Render URL (e.g. https://api.render.com/api/v1)
// In development, it falls back to /api/v1 which is proxied via next.config.mjs
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;

    // Properly merge headers so Content-Type is always included
    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const defaultOptions: RequestInit = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers as Record<string, string> || {}),
        },
        credentials: 'include',
    };

    try {
        const response = await fetch(url, defaultOptions);
        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (jsonError) {
                // If not JSON, use the status text or code
                errorMessage = `${response.statusText || 'Error'} (Code: ${response.status})`;
            }
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error: any) {
        console.error('API Fetch Error:', error);
        // Ensure we throw a descriptive error even for network failures
        if (error.message === 'Failed to fetch') {
            throw new Error('System Offline: Could not connect to the medical server. Please check your connection.');
        }
        throw error;
    }
}
