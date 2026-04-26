'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardMetrics } from '@/types'
import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react'

interface MetricsCardsProps {
  metrics: DashboardMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const metricItems = [
    {
      title: 'Total Documents',
      value: metrics.totalDocuments,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending Approval',
      value: metrics.pendingApproval,
      icon: Clock,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Approved',
      value: metrics.approvedDocuments,
      icon: CheckCircle2,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'Needs Action',
      value: metrics.documentsNeedingAction,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metricItems.map((item, index) => {
        const Icon = item.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${item.bgColor}`}>
                <Icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {index === 3
                  ? 'Submitted and in approval'
                  : index === 1
                    ? 'Awaiting review'
                    : index === 2
                      ? 'This period'
                      : 'All time'}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
