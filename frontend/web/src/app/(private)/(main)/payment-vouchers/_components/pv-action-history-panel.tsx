'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Send,
  ArrowRight,
  Signature,
  Package,
  CreditCard,
  Link,
} from 'lucide-react'
import { PVActionHistoryEntry, PVApprovalRecord } from '@/types'

interface PVActionHistoryPanelProps {
  actionHistory?: PVActionHistoryEntry[]
  approvalChain?: PVApprovalRecord[]
}

export function PVActionHistoryPanel({
  actionHistory = [],
  approvalChain = [],
}: PVActionHistoryPanelProps) {
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'APPROVE':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
      case 'REJECT':
        return 'bg-red-100 text-red-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REVERSED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  // Get action icon
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'APPROVE':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'REJECT':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'SUBMIT':
        return <Send className="h-4 w-4 text-blue-600" />
      case 'CREATE':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'UPDATE':
        return <ArrowRight className="h-4 w-4 text-gray-600" />
      case 'MARK_PAID':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'PO_CREATED':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'GRN_CREATED':
      case 'GRN_CREATED_CONFIRMING':
        return <Package className="h-4 w-4 text-teal-600" />
      case 'PV_CREATED':
        return <CreditCard className="h-4 w-4 text-violet-600" />
      case 'CREATED_FROM_REQUISITION':
      case 'CREATED_FROM_PO':
      case 'CREATED_FROM_GRN':
      case 'CREATED_FROM_PV':
        return <Link className="h-4 w-4 text-sky-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getLinkedDocPath = (docType: string, docNumber: string) => {
    switch (docType) {
      case 'purchase_order': return `/purchase-orders?search=${docNumber}`
      case 'grn': return `/grn?search=${docNumber}`
      case 'payment_voucher': return `/payment-vouchers?search=${docNumber}`
      case 'requisition': return `/requisitions?search=${docNumber}`
      default: return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Trail & Approval Chain</CardTitle>
        <CardDescription>
          Complete history of actions and approval stages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="actions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="actions">
              Action History ({actionHistory?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approvals">
              Approval Chain ({approvalChain?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Action History Tab */}
          <TabsContent value="actions" className="space-y-4">
            {actionHistory && actionHistory.length > 0 ? (
              <div className="space-y-3">
                {[...actionHistory]
                  .sort(
                    (a, b) =>
                      new Date(b.performedAt || b.timestamp || 0).getTime() -
                      new Date(a.performedAt || a.timestamp || 0).getTime()
                  )
                  .map((action, index) => (
                    <div
                      key={index}
                      className="flex gap-4 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(action.actionType || 'unknown')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {action.actionType || 'Unknown Action'}
                          </span>
                          <Badge className={getStatusColor(action.newStatus || '')}>
                            {action.newStatus || 'PENDING'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">{action.performedByName || 'Unknown User'}</span>
                          {action.performedByRole && ` (${action.performedByRole})`}
                        </p>
                        {action.metadata?.linkedDocNumber && (
                          <div className="text-xs mb-2 text-sky-700 flex items-center gap-1">
                            <Link className="h-3 w-3 shrink-0" />
                            <span>Linked:</span>
                            {(() => {
                              const path = getLinkedDocPath(
                                action.metadata.linkedDocType,
                                action.metadata.linkedDocNumber
                              )
                              return path ? (
                                <a href={path} className="font-mono underline hover:text-sky-900">
                                  {action.metadata.linkedDocNumber}
                                </a>
                              ) : (
                                <span className="font-mono">{action.metadata.linkedDocNumber}</span>
                              )
                            })()}
                            {action.metadata?.flow && (
                              <span className="ml-1 text-muted-foreground">({action.metadata.flow.replace('_', '-')})</span>
                            )}
                          </div>
                        )}
                        {action.comments && (
                          <p className="text-sm text-gray-700 mb-2 p-2 bg-gray-50 rounded">
                            {action.comments}
                          </p>
                        )}
                        {action.remarks && (
                          <p className="text-sm text-red-700 mb-2 p-2 bg-red-50 rounded">
                            <span className="font-semibold">Remarks:</span> {action.remarks}
                          </p>
                        )}
                        {action.stageNumber && (
                          <p className="text-xs text-gray-500 mb-2">
                            Stage {action.stageNumber}: {action.stageName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(action.performedAt || action.timestamp || 0).toLocaleString()}
                        </p>
                        {action.changedFields && Object.keys(action.changedFields).length > 0 && (
                          <div className="mt-2 text-xs text-gray-600 space-y-1">
                            <p className="font-semibold">Changes:</p>
                            {Object.entries(action.changedFields).map(([field, change]) => {
                              const changeObj = change as { oldValue?: any; newValue?: any } | any;
                              return (
                                <p key={field} className="ml-2">
                                  {field}: {JSON.stringify(changeObj?.oldValue || change)} → {JSON.stringify(changeObj?.newValue || change)}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No actions recorded yet</p>
            )}
          </TabsContent>

          {/* Approval Chain Tab */}
          <TabsContent value="approvals" className="space-y-4">
            {approvalChain && approvalChain.length > 0 ? (
              <div className="space-y-3">
                {approvalChain.map((stage, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-semibold">
                            {stage.stageNumber}
                          </div>
                          <div>
                            <p className="font-semibold">{stage.stageName}</p>
                            <p className="text-sm text-gray-600">
                              Assigned to: {stage.assignedTo} ({stage.assignedRole})
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(stage.status)}>
                          {stage.status}
                        </Badge>
                      </div>
                    </div>

                    {stage.status?.toUpperCase() === 'APPROVED' || stage.status?.toUpperCase() === 'REJECTED' ? (
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            Action Taken By
                          </p>
                          <p className="text-sm text-gray-600">
                            {stage.actionTakenBy} ({stage.actionTakenByRole})
                          </p>
                        </div>

                        {stage.actionTakenAt && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Date & Time
                            </p>
                            <p className="text-sm text-gray-600">
                              {new Date(stage.actionTakenAt).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {stage.comments && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Comments
                            </p>
                            <p className="text-sm text-gray-600 p-2 bg-blue-50 rounded">
                              {stage.comments}
                            </p>
                          </div>
                        )}

                        {stage.remarks && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Remarks
                            </p>
                            <p className="text-sm text-red-700 p-2 bg-red-50 rounded">
                              {stage.remarks}
                            </p>
                          </div>
                        )}

                        {stage.signature && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              <Signature className="inline h-3 w-3 mr-1" />
                              Digital Signature
                            </p>
                            <p className="text-xs text-gray-500">Signature recorded</p>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No approval chain configured</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
