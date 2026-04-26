'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'
import { getRequisitionById } from '@/app/_actions/requisitions'
import { getPurchaseOrderById } from '@/app/_actions/purchase-orders'
import { getPaymentVoucherById } from '@/app/_actions/payment-vouchers'
import { getGRNAction } from '@/app/_actions/grn-actions'
import {
  getRequisitionPDFBlob,
  getPurchaseOrderPDFBlob,
  getPaymentVoucherPDFBlob,
  getGrnPDFBlob,
  exportRequisitionPDF,
  exportPurchaseOrderPDF,
  exportPaymentVoucherPDF,
  exportGrnPDF,
  downloadBlob,
} from '@/lib/pdf/pdf-export'
import type { GoodsReceivedNote } from '@/types/goods-received-note'
import { useOrganizationContext } from '@/hooks/use-organization'

// Dynamic import to avoid SSR issues with react-pdf
const PDFPreviewDialog = dynamic(
  () => import('@/components/modals/pdf-preview-dialog').then((mod) => mod.PDFPreviewDialog),
  { ssr: false }
)

interface PreviewButtonProps {
  documentId: string
  documentNumber: string
  documentType: string
}

export function PreviewButton({ documentId, documentNumber, documentType }: PreviewButtonProps) {
  const { currentOrganization } = useOrganizationContext()
  const [isLoading, setIsLoading] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [documentData, setDocumentData] = useState<any>(null)

  const documentHeader = {
    logoUrl: currentOrganization?.logoUrl,
    orgName: currentOrganization?.name,
    tagline: currentOrganization?.tagline,
  }

  // Normalize document type to uppercase
  const normalizedType = documentType?.toUpperCase() || ''

  // Check if preview is supported for this document type
  const isPreviewSupported = ['REQUISITION', 'PURCHASE_ORDER', 'PAYMENT_VOUCHER', 'GRN', 'GOODS_RECEIVED_NOTE'].includes(normalizedType)

  const fetchDocumentAndGeneratePDF = async (): Promise<{ blob: Blob | null; data: any }> => {
    try {
      let docData: any = null
      let blob: Blob | null = null

      switch (normalizedType) {
        case 'REQUISITION': {
          const result = await getRequisitionById(documentId)
          if (result.success && result.data) {
            docData = result.data
            blob = await getRequisitionPDFBlob(result.data, documentHeader)
          }
          break
        }
        case 'PURCHASE_ORDER':
        case 'PO': {
          const result = await getPurchaseOrderById(documentId)
          if (result.success && result.data) {
            docData = result.data
            blob = await getPurchaseOrderPDFBlob(result.data, documentHeader)
          }
          break
        }
        case 'PAYMENT_VOUCHER':
        case 'PV': {
          const result = await getPaymentVoucherById(documentId)
          if (result.success && result.data) {
            docData = result.data
            blob = await getPaymentVoucherPDFBlob(result.data, documentHeader)
          }
          break
        }
        case 'GRN':
        case 'GOODS_RECEIVED_NOTE': {
          const result = await getGRNAction(documentId)
          if (result.success && result.data) {
            docData = result.data
            // Add required fields for type compatibility with GoodsReceivedNote
            // The PDF renderer handles both string and Date types for date fields
            const grnData = {
              ...result.data,
              organizationId: (result.data as any).organizationId || '',
              ownerId: result.data.createdBy || '',
            } as unknown as GoodsReceivedNote
            blob = await getGrnPDFBlob(grnData, documentHeader)
          }
          break
        }
        default:
          console.error('Unsupported document type for PDF:', normalizedType)
          return { blob: null, data: null }
      }

      return { blob, data: docData }
    } catch (error) {
      console.error('Error generating PDF:', error)
      return { blob: null, data: null }
    }
  }

  const handlePreview = async () => {
    setIsLoading(true)
    try {
      const { blob, data } = await fetchDocumentAndGeneratePDF()
      if (blob) {
        setPdfBlob(blob)
        setDocumentData(data)
        setIsPreviewOpen(true)
      } else {
        alert('Failed to generate PDF preview')
      }
    } catch (error) {
      console.error('Error previewing PDF:', error)
      alert('Failed to preview document')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!documentData) return

    try {
      switch (normalizedType) {
        case 'REQUISITION':
          await exportRequisitionPDF(documentData, documentHeader)
          break
        case 'PURCHASE_ORDER':
        case 'PO':
          await exportPurchaseOrderPDF(documentData, documentHeader)
          break
        case 'PAYMENT_VOUCHER':
        case 'PV':
          await exportPaymentVoucherPDF(documentData, documentHeader)
          break
        case 'GRN':
        case 'GOODS_RECEIVED_NOTE': {
          // Add required fields for type compatibility
          const grnData = {
            ...documentData,
            organizationId: documentData.organizationId || '',
            ownerId: documentData.createdBy || '',
          } as unknown as GoodsReceivedNote
          await exportGrnPDF(grnData, documentHeader)
          break
        }
        default:
          if (pdfBlob) {
            downloadBlob(pdfBlob, `${documentNumber}.pdf`)
          }
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      // Fallback: download the blob directly if export fails
      if (pdfBlob) {
        downloadBlob(pdfBlob, `${documentNumber}.pdf`)
      }
    }
  }

  const handleClosePreview = (open: boolean) => {
    if (!open) {
      setIsPreviewOpen(false)
      setPdfBlob(null)
    }
  }

  if (!isPreviewSupported) {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreview}
        disabled={isLoading}
        className="gap-1"
        isLoading={isLoading}
        loadingText="Loading..."
      >
        <Eye className="h-4 w-4" />
        Preview
      </Button>

      {pdfBlob && (
        <PDFPreviewDialog
          open={isPreviewOpen}
          onOpenChange={handleClosePreview}
          pdfBlob={pdfBlob}
          fileName={`${documentNumber}.pdf`}
          onDownload={handleDownload}
        />
      )}
    </>
  )
}
