/**
 * Authentication and Account Types
 * Note: Core User, Organization, Permission types moved to core.ts
 */

// Import core types first
import type { User, Organization, Permission, UserRole, UserType } from './core';

// Re-export core types
export type { User, Organization, Permission, UserRole, UserType } from './core';

export interface AuthSession {
  access_token: string;
  refresh_token?: string; // Add refresh token support
  user: User;
  role?: UserRole;
  user_id?: string;
  change_password?: boolean;
  mfa_required?: boolean;
  institution_id?: string;
  organization_id?: string;
  expiresAt?: Date | string;
  expiresIn?: number; // Add expiresIn field for token refresh logic
  permissions?: Permission[];
}



export interface SessionResponse {
  success: boolean;
  message: string;
  data?: any;
  status?: number;
  statusText?: string;
}



export interface RegistrationResponse {
  user: User;
  organization: Organization;
}
