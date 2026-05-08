
const API_BASE_URL = 'https://4wt9b8zl-5000.use2.devtunnels.ms/api';

interface ApiFetchOptions extends RequestInit {}

// Helper to perform the refresh token call
const refreshToken = async (): Promise<string | null> => {
    const currentRefreshToken = localStorage.getItem('refreshToken');
    if (!currentRefreshToken) return null;

    try {
        console.log('🔄 Intentando refrescar token...');
        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'Authorization': `Bearer ${currentRefreshToken}`
            },
            body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        if (response.status === 403) {
            localStorage.clear();
            window.location.href = '/login';
            throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
            throw new Error('Refresh token failed');
        }

        const data = await response.json();
        const newAccessToken = data.accessToken || data.token;
        const newRefreshToken = data.refreshToken;

        if (!newAccessToken) {
            throw new Error('No access token received from refresh endpoint');
        }

        localStorage.setItem('accessToken', newAccessToken);
        if (newRefreshToken) {
             localStorage.setItem('refreshToken', newRefreshToken);
        }
        console.log('✅ Token refrescado exitosamente');
        return newAccessToken;
    } catch (error) {
        console.error("❌ Error al refrescar token:", error);
        // Clear tokens if refresh fails
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return null;
    }
};

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiFetch = async <T>(endpoint: string, options: ApiFetchOptions = {}, retries = 2, backoff = 300): Promise<T> => {
    const token = localStorage.getItem('accessToken');
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Header opcional para evitar la página de advertencia de algunos túneles de desarrollo
    headers.set('ngrok-skip-browser-warning', 'true');

    const fetchOptions: ApiFetchOptions = {
        ...options,
        headers,
    };

    try {
        let response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);

        // Handle 429 - Too Many Requests with exponential backoff
        if (response.status === 429 && retries > 0) {
            console.warn(`⚠️ 429 Rate Limited on ${endpoint}. Reintentando en ${backoff}ms...`);
            await sleep(backoff);
            return apiFetch<T>(endpoint, options, retries - 1, backoff * 2);
        }

        if (response.status === 401) {
            let errorBody: any = {};
            try {
                errorBody = await response.clone().json();
            } catch (e) {
                // Ignore
            }

            if (endpoint.includes('/auth/login')) {
                throw new Error(errorBody.message || 'Usuario o contraseña incorrectos.');
            }

            const isJwtExpired = errorBody.message === 'jwt expired' || errorBody.error === 'jwt expired';

            // Wait for any ongoing refresh
            if (isRefreshing && refreshPromise) {
                const newAccessToken = await refreshPromise;
                if (newAccessToken) {
                    headers.set('Authorization', `Bearer ${newAccessToken}`);
                    const retryOptions: ApiFetchOptions = { ...fetchOptions, headers };
                    response = await fetch(`${API_BASE_URL}${endpoint}`, retryOptions);
                }
            } else if (isJwtExpired || !isRefreshing) {
                console.warn(`⚠️ 401 Token expirado en ${endpoint}. Intentando refresh...`);
                isRefreshing = true;
                refreshPromise = refreshToken().finally(() => {
                    isRefreshing = false;
                    refreshPromise = null;
                });

                const newAccessToken = await refreshPromise;

                if (newAccessToken) {
                    headers.set('Authorization', `Bearer ${newAccessToken}`);
                    const retryOptions: ApiFetchOptions = { ...fetchOptions, headers };
                    response = await fetch(`${API_BASE_URL}${endpoint}`, retryOptions);
                }
            }

            // If retry also fails with 401, force logout
            if (response.status === 401) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                throw new Error("Session expired. Please log in again.");
            }
        }

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorBody = await response.clone().json();
                if (errorBody && errorBody.message) {
                    errorMessage = errorBody.message;
                } else if (typeof errorBody === 'string') {
                    errorMessage = errorBody;
                }
            } catch (e) {
                // Not JSON
            }
            
            if (
                response.status !== 404 && 
                response.status !== 403 && 
                !errorMessage.includes('No tiene los permisos') &&
                !errorMessage.includes('Error al obtener')
            ) {
                console.error(`❌ API Error en ${endpoint}:`, errorMessage);
            }
            
            throw new Error(errorMessage);
        }
        
        if (response.status === 204) {
            return {} as T;
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return data;
        }
        
        return {} as T;
    } catch (error: any) {
        let msg = error.message;
        if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Connection refused')) {
            msg = 'No se pudo conectar al servidor. Verifique la URL del backend y su conexión a internet.';
        }
        
        if (!msg.includes('403') && !msg.includes('404') && !msg.includes('No tiene los permisos') && !msg.includes('Error al obtener')) {
             console.warn(`🔥 Network/Fetch Error en ${endpoint}:`, msg);
        }
       
        throw new Error(msg);
    }
};
