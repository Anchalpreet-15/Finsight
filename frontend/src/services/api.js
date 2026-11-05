/**
 * api.js — HTTP service layer.
 * Vite proxies /api → http://127.0.0.1:8001 in dev (see vite.config.js).
 * Set VITE_API_URL in .env for production (Cloudflare Pages / Netlify / Vercel).
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 45000,   // 45s — long enough for a cold Groq call, short enough to not strand the user
})

// Attach the stored auth token (if any) to every outbound request.
apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('fs_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch { /* localStorage disabled */ }
  return config
})

// A 401 means the token is gone or expired — wipe it so the UI re-prompts on next guarded action.
apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      try {
        localStorage.removeItem('fs_token')
        localStorage.removeItem('fs_user')
      } catch { /* noop */ }
    }
    return Promise.reject(err)
  },
)

/**
 * Send a user message and receive an AI response.
 * @param {string} message
 * @param {string|null} sessionId
 * @param {object|null} profile  — onboarding answers (age, income, goal, challenge)
 */
export async function sendMessage(message, sessionId = null, profile = null) {
  const res = await apiClient.post('/api/chat', {
    message,
    session_id: sessionId || undefined,
    profile:    profile    || undefined,
  })
  return res.data
}

export async function fetchHistory(sessionId) {
  const res = await apiClient.get(`/api/history/${sessionId}`)
  return res.data
}

export async function registerUser(name, email, password) {
  const res = await apiClient.post('/api/auth/register', { name, email, password })
  return res.data
}

export async function loginUser(email, password) {
  const res = await apiClient.post('/api/auth/login', { email, password })
  return res.data
}
