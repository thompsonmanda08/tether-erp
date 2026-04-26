import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { SearchFilters, WorkflowDocument } from '@/types/workflow'
import { searchDocuments } from '@/app/_actions/search'

export const SEARCH_QUERY_KEYS = {
  all: ['search'] as const,
  documents: (filters: SearchFilters, page: number) => [...SEARCH_QUERY_KEYS.all, 'documents', filters, page] as const,
}

interface SearchResponse {
  documents: WorkflowDocument[]
  total: number
  totalPages: number
  page: number
  pageSize: number
}

/**
 * Hook to search documents with filters and pagination
 * Uses React Query to cache results and manage state
 *
 * @param filters - Search filters (documentNumber, documentType, status, dates)
 * @param page - Page number for pagination (1-based)
 * @param pageSize - Number of results per page (default: 10)
 * @param enabled - Whether the query should be enabled (default: true)
 * @returns Query result with documents, loading, error states
 */
export function useSearchDocuments(
  filters: SearchFilters,
  page: number = 1,
  pageSize: number = 10,
  enabled: boolean = true
): UseQueryResult<SearchResponse, Error> {
  return useQuery<SearchResponse, Error>({
    queryKey: SEARCH_QUERY_KEYS.documents(filters, page),
    queryFn: async () => {
      const result = await searchDocuments(filters, page, pageSize)

      if (!result.success) {
        throw new Error(result.message || 'Search failed')
      }

      return {
        documents: result.data || [],
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0,
        page: result.pagination?.page || page,
        pageSize: result.pagination?.limit || result.pagination?.pageSize || pageSize,
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to get all documents without filters
 * Useful for displaying a default list of all user's documents
 *
 * @param page - Page number for pagination (1-based)
 * @param pageSize - Number of results per page (default: 10)
 * @returns Query result with documents
 */
export function useAllDocuments(
  page: number = 1,
  pageSize: number = 10
): UseQueryResult<SearchResponse, Error> {
  return useSearchDocuments(
    {
      documentNumber: '',
      documentType: 'all',
      status: 'all',
      startDate: '',
      endDate: '',
    },
    page,
    pageSize
  )
}
