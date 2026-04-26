'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Download } from 'lucide-react'
import { useActivityLogs, type ActivityLog } from '@/hooks/use-activity-logs-queries'

interface ActivityLogsClientProps {
  userId: string
  userRole: string
}

const ACTION_COLORS: Record<string, string> = {
  created: 'default',
  approved: 'secondary',
  rejected: 'destructive',
  submitted: 'default',
  edited: 'outline',
  viewed: 'outline',
  deleted: 'destructive',
}

const STATUS_COLORS: Record<string, string> = {
  success: 'default',
  failed: 'destructive',
  pending: 'outline',
}

export function ActivityLogsClient({ userId, userRole }: ActivityLogsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Fetch activity logs with filters
  const { data: logsData, isLoading } = useActivityLogs({
    searchTerm,
    action: selectedAction,
    status: selectedStatus,
    startDate,
    endDate,
  })

  const logs = logsData?.logs || []
  const totalCount = logsData?.totalCount || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Activity Logs</h1>
        <p className="text-sm text-muted-foreground">
          Audit trail of all system activities and user actions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, resource, or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action Filter */}
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="edited">Edited</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-4">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isLoading ? 'Loading Activity Logs...' : `Activity Log (${logs.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      Loading activity logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: ActivityLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant={ACTION_COLORS[log.action] as any}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.entityId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs">
                        {log.details}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[log.status] as any}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.ipAddress}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
