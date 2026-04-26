/**
 * Department Type Definitions
 */

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  manager_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description: string;
  manager_name: string;
  is_active?: boolean;
}

export interface UpdateDepartmentRequest {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  manager_name?: string;
  is_active?: boolean;
}