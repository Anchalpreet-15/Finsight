/**
 * api.js — HTTP service layer.
 * Vite proxies /api → localhost:8080 in dev.
 * Set VITE_API_URL in .env for production.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 600000,
})

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
    profile: profile || undefined,
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
