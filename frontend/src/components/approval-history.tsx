'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

interface ApprovalHistoryItem {
  stage: number
  stageName: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  approvedBy?: string
  approvedDate?: string
  comments?: string
}

interface ApprovalHistoryProps {
  state: {
    approvalHistory?: ApprovalHistoryItem[]
  }
}

export function ApprovalHistory({ state }: ApprovalHistoryProps) {
  const approvalHistory = state?.approvalHistory || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval History</CardTitle>
        <CardDescription>
          {approvalHistory.length > 0
            ? `${approvalHistory.length} approval stage${approvalHistory.length !== 1 ? 's' : ''}`
            : 'No approvals yet'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {approvalHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No approval history available
          </div>
        ) : (
          <div className="space-y-4">
            {approvalHistory.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 pb-4 border-b last:border-b-0"
              >
                <div className="mt-1">{getStatusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium">Stage {item.stage}: {item.stageName}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  {item.approvedBy && (
                    <p className="text-sm text-muted-foreground">
                      Approved by {item.approvedBy}
                      {item.approvedDate && ` on ${new Date(item.approvedDate).toLocaleDateString()}`}
                    </p>
                  )}
                  {item.comments && (
                    <p className="text-sm mt-2 text-muted-foreground italic">
                      "{item.comments}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
