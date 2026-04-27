'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getUserSessions, revokeSession } from '@/app/_actions/settings'
import { AlertCircle, CheckCircle, Loader2, Globe, Smartphone, LogOut } from 'lucide-react'

interface Session {
  id: string
  // Fields from SessionWithMetadata (new backend)
  deviceType?: string
  browser?: string
  os?: string
  ipAddress?: string
  ip_address?: string
  isCurrent?: boolean
  is_current?: boolean
  isExpired?: boolean
  is_expired?: boolean
  createdAt?: string
  created_at?: string
  expiresAt?: string
  expires_at?: string
  updatedAt?: string
  updated_at?: string
  // Legacy fallback fields
  device?: string
  location?: string
  lastActive?: string
}

function normalizeSession(s: any): Session {
  return {
    ...s,
    isCurrent: s.isCurrent ?? s.is_current ?? false,
    isExpired: s.isExpired ?? s.is_expired ?? false,
    ipAddress: s.ipAddress ?? s.ip_address ?? '',
    createdAt: s.createdAt ?? s.created_at,
    expiresAt: s.expiresAt ?? s.expires_at,
    updatedAt: s.updatedAt ?? s.updated_at,
  }
}

function getDeviceLabel(s: Session): string {
  if (s.browser && s.os) return `${s.browser} on ${s.os}`
  if (s.browser) return s.browser
  if (s.os) return s.os
  if (s.device) return s.device
  if (s.deviceType) {
    const type = s.deviceType.toLowerCase()
    if (type === 'mobile') return 'Mobile Device'
    if (type === 'tablet') return 'Tablet'
    if (type === 'desktop') return 'Desktop'
    return s.deviceType
  }
  return 'Unknown Device'
}

export function SessionsManagement() {
  const [isLoading, setIsLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const result = await getUserSessions()
      if (result.success && result.data) {
        const raw = Array.isArray(result.data) ? result.data : []
        setSessions(raw.map(normalizeSession))
      } else {
        setError(result.message || 'Failed to load sessions')
      }
    } catch (err) {
      setError('An error occurred while loading sessions')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to revoke this session?')) {
      try {
        setRevoking(sessionId)
        const result = await revokeSession(sessionId)
        if (result.success) {
          setSessions((prev) => prev.filter((s) => s.id !== sessionId))
          setSuccess('Session revoked successfully')
        } else {
          setError(result.message || 'Failed to revoke session')
        }
      } catch (err) {
        setError('An error occurred while revoking session')
        console.error(err)
      } finally {
        setRevoking(null)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage your active login sessions and security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              View and manage your active login sessions. Revoke any sessions you don't recognize.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadSessions} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        {sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No active sessions</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {(session.deviceType === 'mobile' || session.device?.toLowerCase().includes('mobile')) ? (
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{getDeviceLabel(session)}</p>
                      {session.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current Session
                        </Badge>
                      )}
                    </div>
                    {session.ipAddress && (
                      <p className="text-xs text-muted-foreground font-mono">{session.ipAddress}</p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {session.createdAt && (
                        <p>Active since {formatDate(session.createdAt)}</p>
                      )}
                      {(session.updatedAt || session.lastActive) && (
                        <p>Last active {formatDate((session.updatedAt || session.lastActive)!)}</p>
                      )}
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revoking === session.id}
                    className="ml-4"
                    isLoading={revoking === session.id}
                    loadingText="Revoking..."
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
