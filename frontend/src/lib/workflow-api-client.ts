/**
 * Workflow API Client
 * Centralized API client for workflow operations with proper error handling and revalidation
 */

import { toast } from "sonner";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface ClaimTaskRequest {
  // No body needed for claim
}

interface ApproveTaskRequest {
  signature: string;
  comment: string;
  expectedVersion?: number;
}

interface RejectTaskRequest {
  signature: string;
  reason: string;
  expectedVersion?: number;
}

class WorkflowApiClient {
  private baseUrl = "/api/v1";

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `HTTP ${response.status}`
        );
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ==================== WORKFLOW TASK OPERATIONS ====================

  /**
   * Claim a workflow task for exclusive access
   */
  async claimTask(taskId: string): Promise<ApiResponse> {
    return this.makeRequest(`/approvals/tasks/${taskId}/claim`, {
      method: "POST",
    });
  }

  /**
   * Release a claimed workflow task
   */
  async unclaimTask(taskId: string): Promise<ApiResponse> {
    return this.makeRequest(`/approvals/tasks/${taskId}/unclaim`, {
      method: "POST",
    });
  }

  /**
   * Approve a workflow task
   */
  async approveTask(
    taskId: string,
    request: ApproveTaskRequest
  ): Promise<ApiResponse> {
    return this.makeRequest(`/approvals/${taskId}/approve`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Reject a workflow task
   */
  async rejectTask(
    taskId: string,
    request: RejectTaskRequest
  ): Promise<ApiResponse> {
    return this.makeRequest(`/approvals/${taskId}/reject`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  /**
   * Get workflow status for a document
   */
  async getWorkflowStatus(documentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/documents/${documentId}/approval-status`);
  }

  /**
   * Get approval history for a document
   */
  async getApprovalHistory(documentId: string): Promise<ApiResponse> {
    return this.makeRequest(`/documents/${documentId}/approval-history`);
  }

  /**
   * Get available approvers for a document type
   */
  async getAvailableApprovers(
    documentType: string,
    entityId?: string
  ): Promise<ApiResponse> {
    const params = new URLSearchParams({ documentType });
    if (entityId) params.append("entityId", entityId);

    return this.makeRequest(
      `/approvals/available-approvers?${params.toString()}`
    );
  }

  // ==================== DOCUMENT OPERATIONS ====================

  /**
   * Get documents with workflow information
   */
  async getDocuments(
    documentType: string,
    filters?: {
      status?: string;
      assignedToMe?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.assignedToMe) params.append("assigned_to_me", "true");
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const endpoint = `/${documentType}${params.toString() ? `?${params.toString()}` : ""}`;
    return this.makeRequest(endpoint);
  }

  /**
   * Get single document with workflow status
   */
  async getDocument(
    documentType: string,
    documentId: string
  ): Promise<ApiResponse> {
    return this.makeRequest(`/${documentType}/${documentId}`);
  }

  // ==================== TESTING UTILITIES ====================

  /**
   * Test all workflow endpoints for a given document
   */
  async testWorkflowEndpoints(
    documentId: string,
    documentType: string
  ): Promise<{
    results: Array<{
      endpoint: string;
      success: boolean;
      error?: string;
      duration: number;
    }>;
    summary: { total: number; passed: number; failed: number };
  }> {
    const results: Array<{
      endpoint: string;
      success: boolean;
      error?: string;
      duration: number;
    }> = [];

    const testEndpoint = async (
      name: string,
      testFn: () => Promise<ApiResponse>
    ) => {
      const start = Date.now();
      try {
        const result = await testFn();
        const duration = Date.now() - start;
        results.push({
          endpoint: name,
          success: result.success,
          error: result.error,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - start;
        results.push({
          endpoint: name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          duration,
        });
      }
    };

    // Test workflow status endpoints
    await testEndpoint("GET workflow-status", () =>
      this.getWorkflowStatus(documentId)
    );
    await testEndpoint("GET approval-history", () =>
      this.getApprovalHistory(documentId)
    );
    await testEndpoint("GET available-approvers", () =>
      this.getAvailableApprovers(documentType, documentId)
    );

    // Test document endpoints
    await testEndpoint("GET document", () =>
      this.getDocument(documentType, documentId)
    );

    // Note: We don't test claim/approve/reject in automated tests as they modify state
    // These should be tested manually or in a test environment

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    return { results, summary };
  }

  /**
   * Test basic connectivity to all workflow endpoints
   */
  async testConnectivity(): Promise<{
    results: Array<{
      endpoint: string;
      success: boolean;
      error?: string;
      duration: number;
    }>;
    summary: { total: number; passed: number; failed: number };
  }> {
    const results: Array<{
      endpoint: string;
      success: boolean;
      error?: string;
      duration: number;
    }> = [];

    const testEndpoint = async (
      endpoint: string,
      options: RequestInit = {}
    ) => {
      const start = Date.now();
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        const duration = Date.now() - start;
        const success = response.status < 500; // Accept 4xx as "connected" but not 5xx

        results.push({
          endpoint: `${options.method || "GET"} ${endpoint}`,
          success,
          error: success ? undefined : `HTTP ${response.status}`,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - start;
        results.push({
          endpoint: `${options.method || "GET"} ${endpoint}`,
          success: false,
          error: error instanceof Error ? error.message : "Network error",
          duration,
        });
      }
    };

    // Test all workflow endpoints
    await testEndpoint(
      "/approvals/available-approvers?documentType=requisition"
    );
    await testEndpoint("/approvals/tasks/test-id/claim", { method: "POST" });
    await testEndpoint("/approvals/tasks/test-id/unclaim", { method: "POST" });
    await testEndpoint("/approvals/test-id/approve", { method: "POST" });
    await testEndpoint("/approvals/test-id/reject", { method: "POST" });
    await testEndpoint("/documents/test-id/approval-status");
    await testEndpoint("/documents/test-id/approval-history");

    // Test document type endpoints
    const documentTypes = [
      "requisitions",
      "budgets",
      "purchase-orders",
      "payment-vouchers",
      "grns",
    ];
    for (const docType of documentTypes) {
      await testEndpoint(`/${docType}`);
      await testEndpoint(`/${docType}/test-id`);
    }

    const summary = {
      total: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    return { results, summary };
  }
}

// Export singleton instance
export const workflowApi = new WorkflowApiClient();

// Export types for use in components
export type {
  ApiResponse,
  ClaimTaskRequest,
  ApproveTaskRequest,
  RejectTaskRequest,
};
