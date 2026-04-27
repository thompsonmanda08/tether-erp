/**
 * User Types
 * Aligned with backend User model and responses
 * Note: Core User and Organization types moved to core.ts
 */

// Import core types first
import type { User, Organization, UserRole } from './core';

// Re-export core types
export type { User, Organization, UserRole } from './core';

// ================== AUTH TYPES ==================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;        // Legacy JWT token
  accessToken?: string;  // New access token
  refreshToken?: string; // New refresh token
  expiresIn?: number;    // Token expiration in seconds
  user?: User;
  organization?: Organization;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user?: User;
  error?: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

// ================== PASSWORD TYPES ==================

export interface PasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  oldPassword?: string;        // Alias for currentPassword
  newPassword: string;
  confirmPassword?: string;    // For UI validation
}

export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ErrorState {
  general?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// ================== TOKEN TYPES ==================

export interface RefreshTokenRequest {
  refreshToken: string;
  token?: string; // Legacy support
}

export interface VerifyTokenRequest {
  token: string;
}