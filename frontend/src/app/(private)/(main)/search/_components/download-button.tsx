'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { downloadDocumentPDF } from '@/app/_actions/search'

interface DownloadButtonProps {
  documentId: string
  documentNumber: string
}

export function DownloadButton({ documentId, documentNumber }: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const result = await downloadDocumentPDF(documentId)

      if (result.success && result.data?.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a')
        link.href = result.data.downloadUrl
        link.download = `${documentNumber}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        alert('Failed to download document: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download document')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      className="gap-1"
      isLoading={isLoading}
      loadingText="Downloading..."
    >
      <Download className="h-4 w-4" />
      Download
    </Button>
  )
}
