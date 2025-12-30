import axios from 'axios';
import { getCSRFToken } from './csrf';

/**
 * Shared axios client that automatically:
 * - prefixes requests with REACT_APP_API_URL in production
 * - sends cookies (session/CSRF) across domains
 * - attaches the CSRF token for unsafe HTTP methods
 */
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

apiClient.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  const needsCsrf = ['post', 'put', 'patch', 'delete'].includes(method);
  const csrfToken = getCSRFToken();

  if (needsCsrf && csrfToken) {
    config.headers = {
      ...config.headers,
      'X-CSRFToken': config.headers?.['X-CSRFToken'] || csrfToken,
    };
  }

  return config;
});

export default apiClient;
