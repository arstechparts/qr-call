import MenuPageClient from './menu-client'

export default async function Page({
  params,
}: {
  params: Promise<{ table: string }>
}) {
  const { table } = await params
  return <MenuPageClient tableToken={table} />
}