import axios from 'axios';
import { API_CONFIG, AuthResponse, User, ApiError } from 'shared';

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message;
    const statusCode = error.response?.status || 500;
    return Promise.reject(new ApiError(message, statusCode));
  }
);

// Auth services
export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_CONFIG.endpoints.auth.login, { email, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(API_CONFIG.endpoints.auth.register, {
      name,
      email,
      password,
    });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  logout: (): void => {
    localStorage.removeItem('token');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>(API_CONFIG.endpoints.auth.me);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(API_CONFIG.endpoints.auth.forgotPassword, { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(API_CONFIG.endpoints.auth.resetPassword, {
      token,
      password,
    });
    return response.data;
  },
};

export default api;
