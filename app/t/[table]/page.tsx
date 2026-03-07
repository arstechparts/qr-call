import TableClient from './table-client'

export default async function Page({
  params,
}: {
  params: Promise<{ table: string }>
}) {
  const { table } = await params

  return <TableClient tableToken={table} />
}