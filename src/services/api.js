const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const API_URL = configuredApiUrl.replace(/\/$/, '')

export function apiUrl(path) {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
}
