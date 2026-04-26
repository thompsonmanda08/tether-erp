'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/base/page-header'
import { GrnTable } from './grn-table'
import { CreateGRNDialog } from './create-grn-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface GrnClientProps {
  userId: string
  userRole: string
}

export function GrnClient({ userId, userRole }: GrnClientProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Goods Received Notes"
          subtitle="View and manage goods received notes from purchase orders"
          showBackButton={false}
        />
        <Button onClick={() => setIsCreateDialogOpen(true)} className="shrink-0 mt-1">
          <Plus className="h-4 w-4" />
          Create GRN
        </Button>
      </div>

      <GrnTable
        userId={userId}
        userRole={userRole}
        refreshTrigger={refreshTrigger}
        onRefresh={handleRefresh}
      />

      <CreateGRNDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
