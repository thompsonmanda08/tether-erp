'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Clock, CheckCircle, XCircle, Edit, Plus, Send, Link, Package, CreditCard, FileText } from 'lucide-react'
import { POActionHistoryEntry, POApprovalRecord } from '@/types'

interface POActionHistoryPanelProps {
  actionHistory?: POActionHistoryEntry[]
  approvalChain?: POApprovalRecord[]
}

export function POActionHistoryPanel({
  actionHistory,
  approvalChain,
}: POActionHistoryPanelProps) {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'APPROVE':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'REJECT':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'CREATE':
        return <Plus className="h-5 w-5 text-blue-600" />
      case 'UPDATE':
        return <Edit className="h-5 w-5 text-amber-600" />
      case 'SUBMIT':
        return <Send className="h-5 w-5 text-purple-600" />
      case 'PO_CREATED':
        return <FileText className="h-5 w-5 text-blue-600" />
      case 'GRN_CREATED':
      case 'GRN_CREATED_CONFIRMING':
        return <Package className="h-5 w-5 text-teal-600" />
      case 'PV_CREATED':
        return <CreditCard className="h-5 w-5 text-violet-600" />
      case 'CREATED_FROM_REQUISITION':
      case 'CREATED_FROM_PO':
      case 'CREATED_FROM_GRN':
      case 'CREATED_FROM_PV':
        return <Link className="h-5 w-5 text-sky-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'APPROVE':
        return 'bg-green-50 border-green-200'
      case 'REJECT':
        return 'bg-red-50 border-red-200'
      case 'CREATE':
        return 'bg-blue-50 border-blue-200'
      case 'UPDATE':
        return 'bg-amber-50 border-amber-200'
      case 'SUBMIT':
        return 'bg-purple-50 border-purple-200'
      case 'PO_CREATED':
        return 'bg-blue-50 border-blue-200'
      case 'GRN_CREATED':
      case 'GRN_CREATED_CONFIRMING':
        return 'bg-teal-50 border-teal-200'
      case 'PV_CREATED':
        return 'bg-violet-50 border-violet-200'
      case 'CREATED_FROM_REQUISITION':
      case 'CREATED_FROM_PO':
      case 'CREATED_FROM_GRN':
      case 'CREATED_FROM_PV':
        return 'bg-sky-50 border-sky-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'APPROVE':
        return 'Approved'
      case 'REJECT':
        return 'Rejected'
      case 'CREATE':
        return 'Created'
      case 'UPDATE':
        return 'Updated'
      case 'SUBMIT':
        return 'Submitted'
      case 'REVERSE':
        return 'Reversed'
      case 'DELETE':
        return 'Deleted'
      case 'REVERT_TO_DRAFT':
        return 'Reverted to Draft'
      case 'PO_CREATED':
        return 'Purchase Order Created'
      case 'GRN_CREATED':
        return 'GRN Created'
      case 'GRN_CREATED_CONFIRMING':
        return 'GRN Created (Delivery Confirmed)'
      case 'PV_CREATED':
        return 'Payment Voucher Created'
      case 'CREATED_FROM_REQUISITION':
        return 'Created from Requisition'
      case 'CREATED_FROM_PO':
        return 'Created from Purchase Order'
      case 'CREATED_FROM_GRN':
        return 'Created from GRN'
      case 'CREATED_FROM_PV':
        return 'Created from Payment Voucher'
      default:
        return actionType
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

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-50 border-green-200'
      case 'REJECTED':
        return 'bg-red-50 border-red-200'
      case 'REVERSED':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const sortedHistory = [...(actionHistory || [])].sort(
    (a, b) => new Date(b.performedAt || b.timestamp || 0).getTime() - new Date(a.performedAt || a.timestamp || 0).getTime()
  )

  return (
    <Card className="p-6">
      <Tabs defaultValue="actions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions">Action History</TabsTrigger>
          <TabsTrigger value="approvals">Approval Chain</TabsTrigger>
        </TabsList>

        {/* Action History Tab */}
        <TabsContent value="actions" className="space-y-4 mt-4">
          {sortedHistory.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedHistory.map((action) => (
                <div
                  key={action.id}
                  className={`p-4 rounded-lg border ${getActionColor(action.actionType || 'unknown')}`}
                >
                  <div className="flex items-start gap-3">
                    {getActionIcon(action.actionType || 'unknown')}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {action.performedByName || 'Unknown User'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getActionLabel(action.actionType || action.action)}
                        </Badge>
                        {action.performedByRole && (
                          <Badge variant="secondary" className="text-xs">
                            {action.performedByRole}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(action.performedAt || action.timestamp || 0).toLocaleString()}
                      </p>

                      {/* Status transition */}
                      {action.previousStatus && action.newStatus && (
                        <div className="text-xs mt-2 text-gray-700">
                          Status: <span className="font-mono">{action.previousStatus}</span> →{' '}
                          <span className="font-mono">{action.newStatus}</span>
                        </div>
                      )}

                      {/* Stage info for approval actions */}
                      {action.stageNumber && action.stageName && (
                        <div className="text-xs mt-2 text-gray-700">
                          Stage {action.stageNumber}: <span className="font-semibold">{action.stageName}</span>
                        </div>
                      )}

                      {/* Linked document (procurement chain entries) */}
                      {action.metadata?.linkedDocNumber && (
                        <div className="text-xs mt-2 text-sky-700 flex items-center gap-1">
                          <Link className="h-3 w-3" />
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

                      {/* Comments */}
                      {action.comments && (
                        <p className="text-sm mt-2 text-gray-700 italic">
                          "{action.comments}"
                        </p>
                      )}

                      {/* Remarks (for rejections) */}
                      {action.remarks && (
                        <p className="text-sm mt-2 text-red-700 font-semibold">
                          Reason: "{action.remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No action history yet</p>
            </div>
          )}
        </TabsContent>

        {/* Approval Chain Tab */}
        <TabsContent value="approvals" className="space-y-4 mt-4">
          {approvalChain && approvalChain.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {approvalChain.map((approval, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getApprovalStatusColor(approval.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {approval.status?.toUpperCase() === 'APPROVED' && (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      )}
                      {approval.status?.toUpperCase() === 'REJECTED' && (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            Stage {approval.stageNumber}: {approval.stageName}
                          </span>
                          <Badge
                            variant={
                              approval.status?.toUpperCase() === 'APPROVED'
                                ? 'default'
                                : approval.status?.toUpperCase() === 'REJECTED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                            className="text-xs"
                          >
                            {approval.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-gray-600 mt-1">
                          Assigned to: <span className="font-semibold">{approval.assignedRole}</span>
                        </p>

                        {approval.actionTakenBy && approval.actionTakenAt && (
                          <>
                            <p className="text-xs text-gray-600 mt-1">
                              Actioned by: <span className="font-semibold">{approval.actionTakenByRole}</span>
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(approval.actionTakenAt).toLocaleString()}
                            </p>
                          </>
                        )}

                        {approval.comments && (
                          <p className="text-sm mt-2 text-gray-700 italic">
                            "{approval.comments}"
                          </p>
                        )}

                        {approval.remarks && (
                          <p className="text-sm mt-2 text-red-700 font-semibold">
                            Reason: "{approval.remarks}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No approval chain yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}
