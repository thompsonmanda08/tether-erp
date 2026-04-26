"use server";

import { APIResponse } from "@/types";
import { handleError, fromBackend, NO_CACHE_HEADERS } from "./api-config";
import authenticatedApiClient from "./api-config";

export interface AuditEvent {
  id: string;
  organizationId: string;
  documentId: string;
  documentType: string;
  userId: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  changes?: Record<string, { old?: unknown; new?: unknown }>;
  details?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Fetch audit events for a specific document.
 * Route: GET /api/v1/audit-events?entityType=<type>&entityId=<id>
 */
export async function getAuditEvents(
  entityType: string,
  entityId: string,
  page = 1,
  limit = 100,
): Promise<APIResponse> {
  const params = new URLSearchParams({
    entityType,
    entityId,
    page: String(page),
    limit: String(limit),
  });

  try {
    const response = await authenticatedApiClient({
      method: "GET",
      url: `/api/v1/audit-events?${params.toString()}`,
      headers: NO_CACHE_HEADERS,
    });
    return fromBackend(response);
  } catch (error) {
    return handleError(error, "GET", `/api/v1/audit-events`);
  }
}
