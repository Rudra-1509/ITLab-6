import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach bearer token if present in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dms_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling and 401 management
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Don't auto-clear if this was a login attempt failure
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('dms_token');
        localStorage.removeItem('dms_user');
        window.dispatchEvent(new CustomEvent('dms:session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

// Helper for extracting clean error message
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.error?.message) {
      return apiError.error.message;
    }
    if (error.response?.status === 403) {
      return 'You are not authorized to perform this action.';
    }
    if (error.response?.status === 404) {
      return 'The requested resource was not found.';
    }
    if (error.response?.status === 409) {
      return 'Conflict: Operation cannot be completed due to conflicting state.';
    }
    if (error.message === 'Network Error') {
      return 'Unable to connect to the server. Please verify the backend API is running.';
    }
    return error.message || 'An unexpected error occurred.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

export async function request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data;
}
