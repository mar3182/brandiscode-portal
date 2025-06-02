import { User, Brand, IDP } from './types/schemas';

// API endpoints configuration
export const API_CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://api.brand-is-code.com' 
    : 'http://localhost:5000',
  endpoints: {
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
      me: '/api/auth/me',
    },
    users: {
      base: '/api/users',
      byId: (id: string) => `/api/users/${id}`,
    },
    brands: {
      base: '/api/brands',
      byId: (id: string) => `/api/brands/${id}`,
      pathway: (id: string) => `/api/brands/${id}/pathway`,
    },
  },
};

// API response types
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type AuthResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
  token: string;
};

// Error handling
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};
