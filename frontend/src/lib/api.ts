import axios from 'axios'
import { useAuth } from '@/store/useAuth'

const normalizeBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim()

  if (!configuredUrl) {
    return import.meta.env.PROD ? '/api/v1' : 'http://localhost:5002/api/v1'
  }

  if (configuredUrl.startsWith('/')) {
    return configuredUrl
  }

  if (configuredUrl.startsWith('http://') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return configuredUrl.replace(/^http:\/\//i, 'https://')
  }

  if (!configuredUrl.startsWith('http://') && !configuredUrl.startsWith('https://')) {
    return `https://${configuredUrl}`.replace(/\/$/, '')
  }

  if (!configuredUrl.includes('/api/v1')) {
    return `${configuredUrl.replace(/\/$/, '')}/api/v1`
  }

  return configuredUrl.replace(/\/$/, '')
}

const api = axios.create({
  baseURL: normalizeBaseUrl(),
  withCredentials: true,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto logout on 401 only for truly invalid sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/') || error.config?.url?.includes('/login')
      if (!isAuthRoute) {
        useAuth.getState().logout()
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
