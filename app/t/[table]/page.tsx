import TablePremiumClient from './table-premium-client'

export default function Page({ params }: { params: { table: string } }) {
  return <TablePremiumClient tableToken={params.table} />
}