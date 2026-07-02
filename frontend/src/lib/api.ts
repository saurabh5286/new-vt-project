import axios from 'axios'
import { useAuth } from '@/store/useAuth'

const normalizeBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim()
  const fallbackProdUrl = 'https://new-vt-project-1.vercel.app/api/v1'

  if (!configuredUrl) {
    return import.meta.env.PROD ? fallbackProdUrl : 'http://localhost:5002/api/v1'
  }

  if (configuredUrl.startsWith('/')) {
    return configuredUrl
  }

  const trimmedUrl = configuredUrl.replace(/\/$/, '')

  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    try {
      const parsed = new URL(trimmedUrl)
      const hostname = parsed.hostname.toLowerCase()

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${hostname}:5002/api/v1`
      }

      if (!hostname.includes('.')) {
        parsed.hostname = `${hostname}.vercel.app`
      }

      if (!parsed.pathname.includes('/api/v1')) {
        parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/api/v1`
      }

      return parsed.toString().replace(/\/$/, '')
    } catch {
      return fallbackProdUrl
    }
  }

  const normalizedValue = trimmedUrl.replace(/^https?:\/\//i, '')

  if (normalizedValue === 'localhost' || normalizedValue === '127.0.0.1') {
    return `http://${normalizedValue}:5002/api/v1`
  }

  if (!normalizedValue.includes('.') && !normalizedValue.includes('/') && !normalizedValue.includes(':')) {
    return `https://${normalizedValue}.vercel.app/api/v1`
  }

  return `https://${normalizedValue}`.replace(/\/$/, '')
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
