// Use the current origin when the dashboard and API are deployed together
// (for example, on a single Render Web Service). A separate API can still be
// configured with VITE_API_URL at build time.
const configuredApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const API_URL = configuredApiUrl

export function apiUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_URL ? `${API_URL}${normalizedPath}` : normalizedPath
}
