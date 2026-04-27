'use client'

import { useEffect, useState, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

/**
 * Error Boundary Component
 * Catches errors and displays user-friendly error message
 * Prevents white screen of death
 */
export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    const handleError = (event: ErrorEvent) => {
      console.error('Error caught by boundary:', event.error)
      setError(event.error)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection caught by boundary:', event.reason)
      setError(new Error(event.reason?.message || 'An unexpected error occurred'))
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleRetry = () => {
    setError(null)
  }

  const handleReload = () => {
    window.location.reload()
  }

  if (error && isClient) {
    return (
      fallback?.(error, handleRetry) || (
        <div className="flex items-center justify-center min-h-screen bg-muted">
          <div className="w-full max-w-md px-4 py-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mt-2">
                {error.message || 'An unexpected error occurred. Please try again.'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                onClick={handleReload}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Page
              </Button>
            </div>

            <div className="mt-6 p-3 bg-muted rounded text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Error Details:</p>
              <p className="font-mono break-words">{error.message}</p>
            </div>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
