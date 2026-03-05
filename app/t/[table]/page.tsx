import TableClient from './table-client'

export default function Page({ params }: { params: { table: string } }) {
  return <TableClient incoming={params.table} />
}