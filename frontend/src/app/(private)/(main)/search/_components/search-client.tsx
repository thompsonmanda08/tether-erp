'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/base/page-header'
import { SearchForm } from './search-form'
import { TransactionResults } from './transaction-results'
import { SearchFilters } from '@/types/workflow'

interface SearchClientProps {
  userId: string
  userRole: string
}

export function SearchClient({ userId, userRole }: SearchClientProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    documentNumber: '',
    documentType: 'ALL',
    status: 'ALL',
    startDate: '',
    endDate: '',
  })
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters)
    setIsSearching(true)
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleSearchComplete = () => {
    setIsSearching(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search Transactions"
        subtitle="Find requisitions, purchase orders, and GRNs by searching filters"
        showBackButton={false}
      />

      {/* Search Form */}
      <SearchForm onSearch={handleSearch} isSearching={isSearching} />

      {/* Results */}
      <TransactionResults
        filters={filters}
        refreshTrigger={refreshTrigger}
        userRole={userRole}
        onSearchComplete={handleSearchComplete}
      />
    </div>
  )
}
