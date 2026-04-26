/**
 * Core API Types
 * Aligned with backend response structures
 * Note: Core types moved to core.ts to avoid duplication
 */

// Re-export core API types
export type {
  APIResponse,
  PaginationMeta,
  ListResponse,
  DetailResponse,
  MessageResponse,
  DocumentStatus,
  Priority,
  ApprovalStatus,
  PaymentMethod,
  UserRole,
  ApprovalRecord,
  ApprovalTask,
  ApproveTaskRequest,
  RejectTaskRequest,
  ReassignTaskRequest,
  ApproveDocumentRequest,
  RejectDocumentRequest,
  ReassignDocumentRequest
} from './core';

// ================== SPECIALIZED API TYPES ==================
// Import core types first
import type { ApprovalTask } from './core';

// ================== SPECIALIZED API TYPES ==================

export interface ApprovalTaskDetail {
  task: ApprovalTask;
  document: any; // Document-specific type
}