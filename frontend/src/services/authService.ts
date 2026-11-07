import { simulateDelay, simulateMutationDelay } from '@/services/api'
import { currentUser } from '@/mock/data'
import type { User } from '@/types'

const AUTH_TOKEN_KEY = 'cp_auth_token'
const MOCK_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.mock-crimsonpulse-token'

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
}

/**
 * Simulate user login.
 * Accepts any email/password combo in mock mode.
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  await simulateDelay()

  // In mock mode, accept the demo credentials
  if (credentials.email === 'alex.rivera@crimsonpulse.io' || credentials.email === 'demo@crimsonpulse.io') {
    const token = MOCK_TOKEN
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    return { user: currentUser, token }
  }

  // Accept any valid-looking email for demo purposes
  if (credentials.email && credentials.password) {
    const token = MOCK_TOKEN
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    return {
      user: {
        ...currentUser,
        email: credentials.email,
        name: credentials.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      },
      token,
    }
  }

  throw new Error('Invalid email or password')
}

/**
 * Simulate user registration.
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  await simulateMutationDelay()

  if (!data.email || !data.password || !data.name) {
    throw new Error('All fields are required')
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name: data.name,
    email: data.email,
    role: 'owner',
    createdAt: new Date().toISOString(),
  }

  const token = MOCK_TOKEN
  localStorage.setItem(AUTH_TOKEN_KEY, token)

  return { user: newUser, token }
}

/**
 * Log out the current user.
 */
export async function logout(): Promise<void> {
  await simulateMutationDelay()
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

/**
 * Get the currently authenticated user.
 * Returns null if no valid session exists.
 */
export async function getCurrentUser(): Promise<User | null> {
  await simulateDelay(200, 500)

  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (!token) return null

  return currentUser
}

/**
 * Check if the user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  return !!localStorage.getItem(AUTH_TOKEN_KEY)
}
