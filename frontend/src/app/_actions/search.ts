'use server'

import {
  APIResponse,
  SearchFilters,
  WorkflowDocument,
} from '@/types'
import authenticatedApiClient, {
  handleError,
  successResponse,
} from '@/app/_actions/api-config'

/**
 * Server action to search documents from the backend API
 * Connects to backend endpoint: GET /api/v1/documents/search
 */
export async function searchDocuments(
  filters: SearchFilters,
  page: number = 1,
  limit: number = 10
): Promise<APIResponse<WorkflowDocument[]>> {
  const url = '/api/v1/documents/search'

  try {
    // Build query parameters
    const params: Record<string, string> = {
      page: page.toString(),
      pageSize: limit.toString(),
    }

    if (filters.documentNumber) {
      params.documentNumber = filters.documentNumber
    }
    if (filters.documentType && filters.documentType !== 'ALL') {
      params.documentType = filters.documentType
    }
    if (filters.status && filters.status !== 'ALL') {
      params.status = filters.status
    }
    if (filters.startDate) {
      params.startDate = filters.startDate
    }
    if (filters.endDate) {
      params.endDate = filters.endDate
    }

    const response = await authenticatedApiClient({
      method: 'GET',
      url,
      params,
    })

    const responseData = response.data

    // Backend returns: { success, message, data: [...results], pagination: {...} }
    // Each result has { document: {...}, relevance, matches }
    const rawResults = responseData.data || []
    const pagination = responseData.pagination || {}

    // Transform backend Document to frontend WorkflowDocument format
    const documents = rawResults.map((result: any) => {
      // Handle both direct document and wrapped { document, relevance, matches } format
      const doc = result.document || result
      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        type: doc.documentType, // Map documentType to type
        status: doc.status,
        title: doc.title,
        description: doc.description,
        amount: doc.amount,
        currency: doc.currency,
        department: doc.department,
        createdBy: doc.createdBy,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        creator: doc.creator,
      }
    })

    return successResponse(documents, 'Search completed', {
      page: pagination.page || page,
      limit: pagination.pageSize || limit,
      total: pagination.total || 0,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || 0) / limit),
      hasNext: pagination.hasNext ?? false,
      hasPrev: pagination.hasPrev ?? false,
    })
  } catch (error: any) {
    return handleError(error, 'GET', url)
  }
}

/**
 * Server action to download a document as PDF
 * Connects to backend endpoint: GET /api/v1/documents/{documentId}/download
 */
export async function downloadDocumentPDF(
  documentId: string
): Promise<APIResponse<{ downloadUrl: string }>> {
  const url = `/api/v1/documents/${documentId}/download`

  try {
    const response = await authenticatedApiClient({
      url,
      responseType: 'arraybuffer',
    })

    // Convert binary data to base64 data URL for client consumption
    const base64 = Buffer.from(response.data).toString('base64')
    const downloadUrl = `data:application/pdf;base64,${base64}`

    return successResponse({ downloadUrl }, 'Download URL generated')
  } catch (error: any) {
    return handleError(error, 'GET', url)
  }
}
