/**
 * Authentication Constants
 * Shared constants for authentication-related functionality
 */

export const MIN_PASSWORD_LENGTH = 6

export const AUTH_PROVIDER_NAMES: Record<string, string> = {
  google: 'Google OAuth',
  email: 'Email i hasło',
  phone: 'Telefon',
} as const

export type AuthProvider = 'google' | 'email' | 'phone'
