import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SearchClient } from './_components/search-client'

export const metadata = {
  title: 'Search Transactions',
  description: 'Search and view past requisitions, purchase orders, and GRNs',
}

export default async function SearchPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <SearchClient userId={user.id} userRole={user.role} />
  )
}
