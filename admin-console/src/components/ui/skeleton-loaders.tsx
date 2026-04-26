import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton Loading Components
 * Show while data is being fetched
 */

export function ApprovalCardSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

export function ApprovalListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <ApprovalCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function TaskDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      {/* Workflow Stages */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 flex-1" />
          ))}
        </div>
      </div>

      {/* Document Details */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>

      {/* Action Panel */}
      <div className="space-y-3 p-4 border rounded-lg">
        <Skeleton className="h-6 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    </div>
  )
}

export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export function ModalSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-4">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>

      <div className="flex gap-2 justify-end">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2 p-4 border rounded-lg">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}
