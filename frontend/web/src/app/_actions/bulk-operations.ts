'use server'

import authenticatedApiClient from './api-config'

interface BulkApproveRequest {
  taskIds: string[]
  remarks?: string
  userId: string
}

interface BulkRejectRequest {
  taskIds: string[]
  remarks: string
  userId: string
}

interface BulkReassignRequest {
  taskIds: string[]
  newApproverId: string
  newApproverName: string
  reason?: string
  userId: string
}

/**
 * Bulk approve multiple tasks
 * Calls: POST /api/v1/approvals/bulk/approve
 */
export async function bulkApproveTasks(request: BulkApproveRequest) {
  if (!request.taskIds || request.taskIds.length === 0) {
    return { success: false, error: 'No tasks selected for approval' }
  }

  try {
    const response = await authenticatedApiClient({
      method: 'POST',
      url: '/api/v1/approvals/bulk/approve',
      data: {
        taskIds: request.taskIds,
        remarks: request.remarks,
      },
    })

    const data = response.data?.data || {}
    const successCount = data.approved ?? request.taskIds.length
    const failedCount = data.failed ?? 0

    return {
      success: true,
      data: {
        approved: successCount,
        failed: failedCount,
        message: `Successfully approved ${successCount} task${successCount !== 1 ? 's' : ''}`,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to bulk approve tasks',
    }
  }
}

/**
 * Bulk reject multiple tasks
 * Calls: POST /api/v1/approvals/bulk/reject
 */
export async function bulkRejectTasks(request: BulkRejectRequest) {
  if (!request.taskIds || request.taskIds.length === 0) {
    return { success: false, error: 'No tasks selected for rejection' }
  }
  if (!request.remarks || request.remarks.trim() === '') {
    return { success: false, error: 'Rejection reason is required' }
  }

  try {
    const response = await authenticatedApiClient({
      method: 'POST',
      url: '/api/v1/approvals/bulk/reject',
      data: {
        taskIds: request.taskIds,
        remarks: request.remarks,
      },
    })

    const data = response.data?.data || {}
    const rejectedCount = data.rejected ?? request.taskIds.length
    const failedCount = data.failed ?? 0

    return {
      success: true,
      data: {
        rejected: rejectedCount,
        failed: failedCount,
        message: `Successfully rejected ${rejectedCount} task${rejectedCount !== 1 ? 's' : ''}`,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to bulk reject tasks',
    }
  }
}

/**
 * Bulk reassign multiple tasks to a different approver
 * Calls: POST /api/v1/approvals/bulk/reassign
 */
export async function bulkReassignTasks(request: BulkReassignRequest) {
  if (!request.taskIds || request.taskIds.length === 0) {
    return { success: false, error: 'No tasks selected for reassignment' }
  }
  if (!request.newApproverId) {
    return { success: false, error: 'No target approver selected' }
  }

  try {
    const response = await authenticatedApiClient({
      method: 'POST',
      url: '/api/v1/approvals/bulk/reassign',
      data: {
        taskIds: request.taskIds,
        newApproverId: request.newApproverId,
        newApproverName: request.newApproverName,
        reason: request.reason,
      },
    })

    const data = response.data?.data || {}
    const reassignedCount = data.reassigned ?? request.taskIds.length
    const failedCount = data.failed ?? 0

    return {
      success: true,
      data: {
        reassigned: reassignedCount,
        failed: failedCount,
        newApprover: request.newApproverName,
        message: `Successfully reassigned ${reassignedCount} task${reassignedCount !== 1 ? 's' : ''} to ${request.newApproverName}`,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to bulk reassign tasks',
    }
  }
}

/**
 * Get analytics metrics
 * Calls: GET /api/v1/approvals/stats
 */
export async function getAnalyticsMetrics(_userId: string) {
  try {
    const response = await authenticatedApiClient({
      method: 'GET',
      url: '/api/v1/approvals/stats',
    })

    const data = response.data?.data || {}

    return {
      success: true,
      data: {
        totalPending: data.totalPending ?? 0,
        totalApproved: data.totalApproved ?? 0,
        totalRejected: data.totalRejected ?? 0,
        avgApprovalTime: data.avgApprovalTime ?? 'N/A',
        slaCompliance: data.slaCompliance ?? 0,
        bottleneckStage: data.bottleneckStage ?? null,
        bottleneckDays: data.bottleneckDays ?? null,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch analytics',
    }
  }
}

/**
 * Get workflow trends over time
 * Calls: GET /api/v1/analytics/approvals/metrics
 */
export async function getWorkflowTrends(_userId?: string) {
  try {
    const response = await authenticatedApiClient({
      method: 'GET',
      url: '/api/v1/analytics/approvals/metrics',
    })

    const data = response.data?.data || []

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch trends',
    }
  }
}

/**
 * Get stage bottleneck analysis
 * Calls: GET /api/v1/analytics/approvals/metrics
 */
export async function getBottleneckAnalysis() {
  try {
    const response = await authenticatedApiClient({
      method: 'GET',
      url: '/api/v1/analytics/approvals/metrics',
    })

    const data = response.data?.data?.bottlenecks || []

    return {
      success: true,
      data,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch bottleneck analysis',
    }
  }
}
