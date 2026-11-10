import { apiClient, isDemoModeActive, simulateDelay, simulateMutationDelay, notifyDemoMutation } from '@/services/api'
import { currentUser } from '@/mock/data'
import type { User } from '@/types'

const AUTH_TOKEN_KEY = 'cp_auth_token'
const REFRESH_TOKEN_KEY = 'cp_refresh_token'
const USER_KEY = 'cp_user'
const AUTH_FLAG_KEY = 'cp_auth'

interface LoginCredentials {
  email: string
  password: string
}

interface RegisterData {
  name: string
  email: string
  password: string
  organizationName?: string
}

interface AuthResponse {
  user: User
  token: string
  tokens?: {
    access: string
    refresh: string
  }
}

/**
 * User login.
 * Authenticates against Neon PostgreSQL via Django REST Framework.
 * Never creates dummy user or mock token in live mode.
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    const res = await apiClient.post<AuthResponse>('/auth/login/', {
      email: credentials.email,
      password: credentials.password,
    })

    if (res.data && res.data.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, res.data.token)
      if (res.data.tokens?.refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, res.data.tokens.refresh)
      }
      if (res.data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      }
      localStorage.setItem(AUTH_FLAG_KEY, 'true')
      return res.data
    }
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.response?.data?.detail ||
      (typeof err.response?.data === 'string' ? err.response.data : null) ||
      'Invalid email or password.'
    throw new Error(message)
  }

  // Only reached in explicit demo mode
  if (isDemoModeActive()) {
    await simulateDelay()
    notifyDemoMutation('Session Login', 'Authenticated via local demo session.')
    const demoToken = 'demo-token-active'
    localStorage.setItem(AUTH_TOKEN_KEY, demoToken)
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
    localStorage.setItem(AUTH_FLAG_KEY, 'true')
    return { user: currentUser, token: demoToken }
  }

  throw new Error('Authentication failed: No token returned from server.')
}

/**
 * User registration.
 * Registers against real Django backend and creates organization in PostgreSQL.
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  try {
    const res = await apiClient.post<AuthResponse>('/auth/register/', {
      name: data.name,
      email: data.email,
      password: data.password,
      organization_name: data.organizationName || `${data.name}'s Workspace`,
    })

    if (res.data && res.data.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, res.data.token)
      if (res.data.tokens?.refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, res.data.tokens.refresh)
      }
      if (res.data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user))
      }
      localStorage.setItem(AUTH_FLAG_KEY, 'true')
      return res.data
    }
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.response?.data?.detail ||
      (typeof err.response?.data === 'string' ? err.response.data : null) ||
      'Registration failed.'
    throw new Error(message)
  }

  if (isDemoModeActive()) {
    await simulateMutationDelay()
    notifyDemoMutation('User Registration', 'Created demo profile locally.')
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: data.name,
      email: data.email,
      role: 'owner',
      createdAt: new Date().toISOString(),
    }
    const demoToken = 'demo-token-active'
    localStorage.setItem(AUTH_TOKEN_KEY, demoToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    localStorage.setItem(AUTH_FLAG_KEY, 'true')
    return { user: newUser, token: demoToken }
  }

  throw new Error('Registration failed: No token returned from server.')
}

/**
 * Log out the current user.
 * Blacklists refresh token on Django backend and purges local credentials.
 */
export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (refreshToken) {
    try {
      await apiClient.post('/auth/logout/', { refresh: refreshToken })
    } catch {
      // Backend logout is best-effort
    }
  }

  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(AUTH_FLAG_KEY)
}

/**
 * Get the currently authenticated user.
 * Validates session against GET /auth/me/ on Django backend.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (!token) return null

  try {
    const res = await apiClient.get<User>('/auth/me/')
    if (res.data && res.data.id) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.data))
      return res.data
    }
  } catch {
    if (!isDemoModeActive()) {
      // Token is invalid or expired
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(AUTH_FLAG_KEY)
      return null
    }
  }

  if (isDemoModeActive()) {
    const cached = localStorage.getItem(USER_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        // fallback
      }
    }
    return currentUser
  }

  return null
}

/**
 * Check if the user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem(AUTH_TOKEN_KEY)
}

export const authService = {
  login,
  register,
  logout,
  getCurrentUser,
  isAuthenticated,
}

export default authService
